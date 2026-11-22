import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  BASELINE_PATH,
  compareToBaseline,
  findSuppressions,
  parseBaseline,
  runCheck,
  type Baseline,
  type Finding,
  type SuppressionKind,
} from './suppressions.ts'

const ROOT = resolve(import.meta.dirname, '..')

function kindsIn(fileName: string, source: string): SuppressionKind[] {
  return findSuppressions(fileName, source).map((finding) => finding.kind)
}

// Fixture sources live in string literals on purpose: the scanner reads comments and
// property accesses, not string contents, so this file does not trip its own check.
describe('findSuppressions: every banned pattern is caught', () => {
  const caught: [string, string, string, SuppressionKind[]][] = [
    ['eslint-disable-next-line', 'a.ts', '// eslint-disable-next-line no-console\nconsole.log(1)\n', ['eslint-disable-next-line']],
    ['eslint-disable-line', 'a.ts', 'console.log(1) // eslint-disable-line no-console\n', ['eslint-disable-line']],
    ['eslint-disable block', 'a.ts', '/* eslint-disable */\nconsole.log(1)\n', ['eslint-disable']],
    ['eslint-disable with a rule', 'a.ts', '/* eslint-disable no-console */\n', ['eslint-disable']],
    ['eslint-disable in a JSDoc-style block', 'a.ts', '/**\n * eslint-disable\n */\n', ['eslint-disable']],
    ['eslint-disable with a description', 'a.ts', '// eslint-disable-next-line x -- because\n', ['eslint-disable-next-line']],
    ['eslint inline config turning a rule off', 'a.ts', '/* eslint no-restricted-syntax: "off" */\n', ['eslint-inline-config']],
    ['@ts-ignore', 'a.ts', '// @ts-ignore\nconst x: number = "a"\n', ['ts-ignore']],
    ['@ts-ignore with a space-less comment', 'a.ts', '//@ts-ignore\nconst x = 1\n', ['ts-ignore']],
    ['@ts-ignore in a block comment', 'a.ts', '/* @ts-ignore */\nconst x = 1\n', ['ts-ignore']],
    ['@ts-ignore on a later line of a block comment', 'a.ts', '/*\n * note\n * @ts-ignore\n */\nconst x = 1\n', ['ts-ignore']],
    ['@ts-expect-error', 'a.ts', '// @ts-expect-error\nconst x: number = "a"\n', ['ts-expect-error']],
    ['@ts-expect-error with a reason', 'a.ts', '// @ts-expect-error: legacy api\nconst x = 1\n', ['ts-expect-error']],
    ['@ts-nocheck', 'a.ts', '// @ts-nocheck\nconst x = 1\n', ['ts-nocheck']],
    ['comment inside JSX', 'a.tsx', 'const a = <div>{/* @ts-expect-error */}</div>\n', ['ts-expect-error']],
    ['comment at the very end of the file', 'a.ts', 'const x = 1\n// @ts-ignore', ['ts-ignore']],
    ['comment in a JavaScript file', 'a.js', '// eslint-disable-next-line\nfoo()\n', ['eslint-disable-next-line']],
    ['test.skip', 'a.test.ts', "test.skip('x', () => {})\n", ['skip']],
    ['it.skip', 'a.test.ts', "it.skip('x', () => {})\n", ['skip']],
    ['describe.skip', 'a.test.ts', "describe.skip('x', () => {})\n", ['skip']],
    ['test.describe.skip', 'a.spec.ts', "test.describe.skip('x', () => {})\n", ['skip']],
    ['conditional test.skip inside a test', 'a.spec.ts', "test('x', ({ browserName }) => {\n  test.skip(browserName === 'firefox')\n})\n", ['skip']],
    ['skip through optional chaining', 'a.spec.ts', "test?.skip('x', () => {})\n", ['skip']],
    ['skip through bracket notation', 'a.spec.ts', "test['skip']('x', () => {})\n", ['skip']],
    ['it.skipIf', 'a.test.ts', "it.skipIf(true)('x', () => {})\n", ['skipIf']],
    ['test.only', 'a.spec.ts', "test.only('x', () => {})\n", ['only']],
    ['it.only', 'a.test.ts', "it.only('x', () => {})\n", ['only']],
    ['describe.only', 'a.test.ts', "describe.only('x', () => {})\n", ['only']],
    ['test.describe.only', 'a.spec.ts', "test.describe.only('x', () => {})\n", ['only']],
    ['test.fixme', 'a.spec.ts', "test.fixme('x', () => {})\n", ['fixme']],
    ['test.describe.fixme', 'a.spec.ts', "test.describe.fixme('x', () => {})\n", ['fixme']],
    ['fixme through bracket notation', 'a.spec.ts', 'test["fixme"]("x", () => {})\n', ['fixme']],
    ['two different patterns in one file', 'a.test.ts', "// @ts-ignore\nit.only('x', () => {})\n", ['ts-ignore', 'only']],
  ]

  it.each(caught)('%s', (_label, fileName, source, expected) => {
    expect(kindsIn(fileName, source)).toEqual(expected)
  })

  it('reports the line of each finding', () => {
    const source = "const a = 1\n\n// @ts-ignore\nconst b = 2\ntest.only('x', () => {})\n"
    expect(findSuppressions('a.ts', source)).toEqual([
      { file: 'a.ts', line: 3, kind: 'ts-ignore' },
      { file: 'a.ts', line: 5, kind: 'only' },
    ])
  })
})

describe('findSuppressions: ordinary code is left alone', () => {
  const clean: [string, string, string][] = [
    ['directive names inside strings', 'a.ts', "const a = '// @ts-ignore'\nconst b = \"/* eslint-disable */\"\nconst c = `// @ts-expect-error`\n"],
    ['a comment that only mentions a directive', 'a.ts', '// we never use eslint-disable or @ts-ignore here\n'],
    ['eslint-enable', 'a.ts', '/* eslint-enable */\n'],
    ['plain comments', 'a.ts', '// TODO: tidy up\n/* just a note */\n'],
    ['similar identifiers', 'a.ts', 'const skipped = 1\nconst onlyOne = 2\nconst fixmeLater = 3\nfoo.skipLink()\nfoo.onlyChild\n'],
    ['unrelated property names', 'a.ts', 'foo.skipWhile(1)\nfoo.fixture\n'],
    ['playwright describe.configure', 'a.spec.ts', "test.describe.configure({ mode: 'serial' })\n"],
    ['JSX text that looks like a comment', 'a.tsx', 'const a = <p>// @ts-ignore</p>\n'],
    ['a regular expression that looks like a comment', 'a.ts', 'const r = /\\/\\/ @ts-ignore/\n'],
  ]

  it.each(clean)('%s', (_label, fileName, source) => {
    expect(findSuppressions(fileName, source)).toEqual([])
  })
})

const finding = (file: string, line: number, kind: SuppressionKind): Finding => ({ file, line, kind })
const baselineOf = (...entries: Baseline['entries']): Baseline => ({ version: 1, policy: 'test', entries })

describe('compareToBaseline: the count may go down, never up', () => {
  const allowOne = baselineOf({ file: 'src/lib/clock.ts', kind: 'eslint-disable-next-line', count: 1, reason: 'sanctioned' })

  it('passes when the findings match the baseline exactly', () => {
    expect(compareToBaseline([finding('src/lib/clock.ts', 16, 'eslint-disable-next-line')], allowOne)).toEqual([])
  })

  it('passes with no findings and an empty baseline', () => {
    expect(compareToBaseline([], baselineOf())).toEqual([])
  })

  it('fails on a suppression in a file the baseline does not list', () => {
    const problems = compareToBaseline(
      [finding('src/lib/clock.ts', 16, 'eslint-disable-next-line'), finding('src/App.tsx', 4, 'ts-ignore')],
      allowOne,
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('src/App.tsx')
    expect(problems[0]).toContain('ts-ignore')
    expect(problems[0]).toContain('line 4')
  })

  it('fails when a listed file gains another suppression of the same kind', () => {
    const problems = compareToBaseline(
      [finding('src/lib/clock.ts', 16, 'eslint-disable-next-line'), finding('src/lib/clock.ts', 30, 'eslint-disable-next-line')],
      allowOne,
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('baseline allows 1')
  })

  it('fails when a listed file gains a different kind (a blanket disable replacing a targeted one)', () => {
    const problems = compareToBaseline(
      [finding('src/lib/clock.ts', 16, 'eslint-disable-next-line'), finding('src/lib/clock.ts', 1, 'eslint-disable')],
      allowOne,
    )
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('eslint-disable')
  })

  it('fails when a suppression is removed but the baseline still allows it (the slack would be reusable)', () => {
    const problems = compareToBaseline([], allowOne)
    expect(problems).toHaveLength(1)
    expect(problems[0]).toContain('lower')
  })

  it('reports every problem, not just the first', () => {
    const problems = compareToBaseline([finding('a.ts', 1, 'only'), finding('b.ts', 1, 'skip')], baselineOf())
    expect(problems).toHaveLength(2)
  })
})

describe('parseBaseline: a malformed baseline is an error, never "no limits"', () => {
  const valid = { version: 1, policy: 'p', entries: [{ file: 'a.ts', kind: 'skip', count: 1, reason: 'r' }] }

  it('accepts a well-formed baseline', () => {
    expect(parseBaseline(JSON.stringify(valid)).entries).toHaveLength(1)
  })

  const bad: [string, unknown][] = [
    ['not JSON', 'not json'],
    ['wrong version', { ...valid, version: 2 }],
    ['missing entries', { version: 1, policy: 'p' }],
    ['unknown kind', { ...valid, entries: [{ file: 'a.ts', kind: 'nope', count: 1, reason: 'r' }] }],
    ['zero count', { ...valid, entries: [{ file: 'a.ts', kind: 'skip', count: 0, reason: 'r' }] }],
    ['fractional count', { ...valid, entries: [{ file: 'a.ts', kind: 'skip', count: 1.5, reason: 'r' }] }],
    ['empty reason', { ...valid, entries: [{ file: 'a.ts', kind: 'skip', count: 1, reason: ' ' }] }],
    [
      'duplicate entry',
      {
        ...valid,
        entries: [
          { file: 'a.ts', kind: 'skip', count: 1, reason: 'r' },
          { file: 'a.ts', kind: 'skip', count: 1, reason: 'r' },
        ],
      },
    ],
  ]

  it.each(bad)('rejects %s', (_label, value) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value)
    expect(() => parseBaseline(text)).toThrow()
  })
})

describe('runCheck and the CLI, on a throwaway repository', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  function makeRepo(files: Record<string, string>, baseline: Baseline = baselineOf()): string {
    const root = mkdtempSync(join(tmpdir(), 'suppressions-'))
    dirs.push(root)
    for (const [path, content] of Object.entries({ ...files, 'verify/suppressions-baseline.json': JSON.stringify(baseline) })) {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), content)
    }
    return root
  }

  function runCli(root: string): { status: number | null; output: string } {
    const result = spawnSync(process.execPath, [join(ROOT, 'verify/check-suppressions.ts'), '--root', root], { encoding: 'utf8' })
    return { status: result.status, output: result.stdout + result.stderr }
  }

  it('scans src, e2e and verify, including nested folders and .tsx', () => {
    const root = makeRepo({
      'src/a.ts': '// @ts-ignore\n',
      'src/deep/er/b.tsx': 'const x = <i>{/* eslint-disable */}</i>\n',
      'e2e/c.spec.ts': "test.only('x', () => {})\n",
      'verify/journeys/d.spec.ts': "test.fixme('x', () => {})\n",
    })
    const result = runCheck({ root })
    expect(result.ok).toBe(false)
    const text = result.lines.join('\n')
    for (const path of ['src/a.ts', 'src/deep/er/b.tsx', 'e2e/c.spec.ts', 'verify/journeys/d.spec.ts']) {
      expect(text).toContain(path)
    }
  })

  it('ignores node_modules, other folders and non-code files', () => {
    const root = makeRepo({
      'src/node_modules/pkg/index.js': '// eslint-disable\n',
      'docs/note.ts': '// @ts-ignore\n',
      'src/readme.md': '// @ts-ignore\n',
      'src/ok.ts': 'export const ok = 1\n',
    })
    expect(runCheck({ root }).ok).toBe(true)
  })

  it('passes a baselined suppression and fails when it is removed without lowering the baseline', () => {
    const baseline = baselineOf({ file: 'src/a.ts', kind: 'ts-ignore', count: 1, reason: 'legacy' })
    expect(runCheck({ root: makeRepo({ 'src/a.ts': '// @ts-ignore\n' }, baseline) }).ok).toBe(true)
    expect(runCheck({ root: makeRepo({ 'src/a.ts': 'export {}\n' }, baseline) }).ok).toBe(false)
  })

  it('fails when the baseline file is missing', () => {
    const root = makeRepo({ 'src/a.ts': 'export {}\n' })
    rmSync(join(root, 'verify/suppressions-baseline.json'))
    expect(runCheck({ root }).ok).toBe(false)
  })

  it('CLI exits 0 on a clean repository', () => {
    const { status, output } = runCli(makeRepo({ 'src/a.ts': 'export const a = 1\n' }))
    expect(status, output).toBe(0)
  })

  it('CLI exits 1 and names the file and line on a new suppression', () => {
    const { status, output } = runCli(makeRepo({ 'src/a.ts': 'export const a = 1\n// @ts-expect-error\nexport const b = 2\n' }))
    expect(status).toBe(1)
    expect(output).toContain('src/a.ts')
    expect(output).toContain('line 2')
  })

  it('CLI exits non-zero when the baseline is malformed', () => {
    const root = makeRepo({ 'src/a.ts': 'export {}\n' })
    writeFileSync(join(root, 'verify/suppressions-baseline.json'), '{ nope')
    expect(runCli(root).status).not.toBe(0)
  })
})

describe('this repository', () => {
  it('has no suppression beyond the recorded baseline', () => {
    const result = runCheck({ root: ROOT })
    expect(result.ok, result.lines.join('\n')).toBe(true)
  })

  it('keeps the baseline in a code-owner path, out of reach of a Tier 1 change', () => {
    const codeowners = readFileSync(join(ROOT, '.github/CODEOWNERS'), 'utf8')
    expect(codeowners).toMatch(/^\/verify\/\s+@\S+/m)
    expect(BASELINE_PATH.startsWith('verify/')).toBe(true)
  })
})
