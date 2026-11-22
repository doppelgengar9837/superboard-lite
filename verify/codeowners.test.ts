import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import viteConfig from '../vite.config.ts'

/**
 * The files that decide WHICH tests run and WHAT they assume must be code-owner paths.
 * Otherwise a Tier 1 change could narrow `include` or empty the setup file and turn
 * `pnpm test` green without testing anything.
 */

const ROOT = resolve(import.meta.dirname, '..')

interface Rule {
  pattern: string
  owners: string[]
}

function parseCodeowners(text: string): Rule[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      const [pattern, ...owners] = line.split(/\s+/)
      return { pattern: pattern ?? '', owners }
    })
}

/**
 * Minimal CODEOWNERS matcher: anchored patterns (`/path`, `/dir/`, `/glob*`) only.
 * Anything it does not understand throws, so a wrong match is never silent.
 */
function patternToRegExp(pattern: string): RegExp {
  if (!pattern.startsWith('/') || /[?[\]!\\]|\*\*/.test(pattern)) {
    throw new Error(`Unsupported CODEOWNERS pattern in test helper: ${pattern}`)
  }
  const body = pattern
    .slice(1)
    .replace(/\/$/, '')
    .split('*')
    .map((part) => part.replace(/[.+^${}()|]/g, '\\$&'))
    .join('[^/]*')
  return new RegExp(`^${body}(/.*)?$`)
}

/** GitHub semantics: the last matching rule wins. */
function ownersOf(path: string, rules: Rule[]): string[] {
  let owners: string[] = []
  for (const rule of rules) {
    if (patternToRegExp(rule.pattern).test(path)) owners = rule.owners
  }
  return owners
}

const rules = parseCodeowners(readFileSync(resolve(ROOT, '.github/CODEOWNERS'), 'utf8'))

describe('CODEOWNERS covers the files that decide what the unit tests run', () => {
  it('vitest reads its include and setupFiles from vite.config.ts (no overriding config exists)', () => {
    expect(viteConfig.test?.include).toBeDefined()
    expect(viteConfig.test?.setupFiles).toBeDefined()
    // Vitest prefers vitest.config.* / vitest.workspace.* over vite.config.ts and ignores it entirely.
    const overriding = readdirSync(ROOT).filter((name) => /^vitest\./.test(name))
    expect(overriding).toEqual([])
  })

  it('owns vite.config.ts', () => {
    expect(ownersOf('vite.config.ts', rules)).not.toEqual([])
  })

  it('owns every setup file named in vite.config.ts', () => {
    const setupFiles = [viteConfig.test?.setupFiles ?? []].flat()
    expect(setupFiles.length).toBeGreaterThan(0)
    for (const file of setupFiles) {
      const path = file.replace(/^\.\//, '')
      expect(existsSync(resolve(ROOT, path)), `${path} exists`).toBe(true)
      expect(ownersOf(path, rules), `${path} has a code owner`).not.toEqual([])
    }
  })

  it('owns a vitest.config.ts that someone might add later, since it would override vite.config.ts', () => {
    for (const name of ['vitest.config.ts', 'vitest.config.mts', 'vitest.workspace.ts']) {
      expect(ownersOf(name, rules), `${name} has a code owner`).not.toEqual([])
    }
  })

  it('does not own ordinary source files (the matcher is not matching everything)', () => {
    expect(ownersOf('src/App.tsx', rules)).toEqual([])
    expect(ownersOf('src/lib/clock.test.ts', rules)).toEqual([])
  })

  it('applies the last matching rule, as GitHub does', () => {
    const sample = parseCodeowners('/a/ @x\n/a/b.ts @y\n')
    expect(ownersOf('a/c.ts', sample)).toEqual(['@x'])
    expect(ownersOf('a/b.ts', sample)).toEqual(['@y'])
  })
})
