import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'

/**
 * Suppression check: finds the ways code can opt out of lint, type checking or tests,
 * and compares them with a recorded baseline that may only shrink.
 *
 * Lives in verify/ (a code-owner path) together with its baseline, so a Tier 1 change
 * cannot edit the rule or the allowance. Deterministic: same files, same answer.
 *
 * What it reads is syntax, not text: comments and property accesses. A directive inside a
 * string does not count, a directive in a comment does. Not covered (and cannot be, without
 * running the code): aliasing (`const t = test; t.skip()`), destructuring, computed keys.
 * Config-level opt-outs (eslint rules turned off, tsconfig excludes, vitest `exclude`) live
 * in governance files, which need a human anyway.
 */

export type SuppressionKind =
  | 'eslint-disable'
  | 'eslint-disable-line'
  | 'eslint-disable-next-line'
  | 'eslint-inline-config'
  | 'ts-ignore'
  | 'ts-expect-error'
  | 'ts-nocheck'
  | 'skip'
  | 'skipIf'
  | 'only'
  | 'fixme'

const KINDS: readonly SuppressionKind[] = [
  'eslint-disable',
  'eslint-disable-line',
  'eslint-disable-next-line',
  'eslint-inline-config',
  'ts-ignore',
  'ts-expect-error',
  'ts-nocheck',
  'skip',
  'skipIf',
  'only',
  'fixme',
]

export interface Finding {
  file: string
  line: number
  kind: SuppressionKind
}

export interface BaselineEntry {
  file: string
  kind: SuppressionKind
  count: number
  reason: string
}

export interface Baseline {
  version: 1
  policy: string
  entries: BaselineEntry[]
}

export const BASELINE_PATH = 'verify/suppressions-baseline.json'
export const SCANNED_DIRS: readonly string[] = ['src', 'e2e', 'verify']

const CODE_FILE = /\.[cm]?[jt]sx?$/

const PROPERTY_KINDS: Record<string, SuppressionKind> = {
  skip: 'skip',
  skipIf: 'skipIf',
  only: 'only',
  fixme: 'fixme',
}

/** Directive at the start of a comment line, the way ESLint and TypeScript read it. */
function directiveKind(commentLine: string, isBlock: boolean): SuppressionKind | undefined {
  if (/^eslint-disable-next-line\b/.test(commentLine)) return 'eslint-disable-next-line'
  if (/^eslint-disable-line\b/.test(commentLine)) return 'eslint-disable-line'
  if (/^eslint-disable\b/.test(commentLine)) return 'eslint-disable'
  // `/* eslint some-rule: "off" */` changes rule levels inline; ESLint only honours it in block comments.
  if (isBlock && /^eslint\s+[@\w/-]+\s*:/.test(commentLine)) return 'eslint-inline-config'
  if (/^@ts-ignore\b/.test(commentLine)) return 'ts-ignore'
  if (/^@ts-expect-error\b/.test(commentLine)) return 'ts-expect-error'
  if (/^@ts-nocheck\b/.test(commentLine)) return 'ts-nocheck'
  return undefined
}

function collectComments(sourceFile: ts.SourceFile): ts.CommentRange[] {
  const found = new Map<number, ts.CommentRange>()
  const jsxText: [number, number][] = []
  const visit = (node: ts.Node): void => {
    if (node.kind === ts.SyntaxKind.JsxText) {
      jsxText.push([node.pos, node.end])
      return
    }
    if (node.kind >= ts.SyntaxKind.FirstJSDocNode && node.kind <= ts.SyntaxKind.LastJSDocNode) return
    const children = node.getChildren(sourceFile)
    if (children.length > 0) {
      children.forEach(visit)
      return
    }
    // Comments sit in a token's trivia: those after a newline are its leading comments, those on
    // the same line as the previous token are that token's trailing comments. Read both, and the
    // end-of-file token covers the last ones. Keyed by position so nothing is counted twice.
    const ranges = [
      ...(ts.getLeadingCommentRanges(sourceFile.text, node.getFullStart()) ?? []),
      ...(ts.getTrailingCommentRanges(sourceFile.text, node.getEnd()) ?? []),
    ]
    for (const range of ranges) found.set(range.pos, range)
  }
  visit(sourceFile)
  // The scanner knows nothing about JSX, so text like `<p>// note</p>` looks like a comment to it.
  return [...found.values()].filter((range) => !jsxText.some(([start, end]) => range.pos >= start && range.pos < end))
}

export function findSuppressions(fileName: string, text: string): Finding[] {
  const sourceFile = ts.createSourceFile(fileName, text, ts.ScriptTarget.Latest, false)
  const findings: Finding[] = []
  const lineOf = (pos: number): number => sourceFile.getLineAndCharacterOfPosition(pos).line + 1

  for (const comment of collectComments(sourceFile)) {
    const isBlock = comment.kind === ts.SyntaxKind.MultiLineCommentTrivia
    const body = text.slice(comment.pos, comment.end)
    const inner = isBlock ? body.replace(/^\/\*+/, '').replace(/\*+\/$/, '') : body.replace(/^\/\/+/, '')
    const lines = inner.split('\n')
    lines.forEach((raw, index) => {
      const kind = directiveKind(raw.replace(/^[\s*]+/, ''), isBlock)
      if (kind !== undefined) {
        // Position of the line inside the comment, so multi-line blocks report the right line.
        findings.push({ file: fileName, line: lineOf(comment.pos) + index, kind })
      }
    })
  }

  const visit = (node: ts.Node): void => {
    if (ts.isPropertyAccessExpression(node)) {
      const kind = PROPERTY_KINDS[node.name.text]
      if (kind !== undefined) findings.push({ file: fileName, line: lineOf(node.name.getStart(sourceFile)), kind })
    } else if (ts.isElementAccessExpression(node) && ts.isStringLiteralLike(node.argumentExpression)) {
      const kind = PROPERTY_KINDS[node.argumentExpression.text]
      if (kind !== undefined) findings.push({ file: fileName, line: lineOf(node.argumentExpression.getStart(sourceFile)), kind })
    }
    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  return findings.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind))
}

export function parseBaseline(json: string): Baseline {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch (error) {
    throw new Error(`Baseline is not valid JSON: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
  if (typeof value !== 'object' || value === null) throw new Error('Baseline must be an object.')
  const record = value as Record<string, unknown>
  if (record['version'] !== 1) throw new Error('Baseline version must be 1.')
  if (typeof record['policy'] !== 'string') throw new Error('Baseline needs a "policy" string.')
  if (!Array.isArray(record['entries'])) throw new Error('Baseline needs an "entries" array.')

  const seen = new Set<string>()
  const entries = (record['entries'] as unknown[]).map((raw, index): BaselineEntry => {
    const entry = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>
    const where = `Baseline entry ${String(index)}`
    const file = entry['file']
    const kind = entry['kind']
    const count = entry['count']
    const reason = entry['reason']
    if (typeof file !== 'string' || file === '') throw new Error(`${where}: "file" must be a non-empty string.`)
    if (typeof kind !== 'string' || !KINDS.includes(kind as SuppressionKind)) throw new Error(`${where}: unknown kind ${String(kind)}.`)
    if (typeof count !== 'number' || !Number.isInteger(count) || count < 1) throw new Error(`${where}: "count" must be a positive integer (delete the entry instead of using 0).`)
    if (typeof reason !== 'string' || reason.trim() === '') throw new Error(`${where}: "reason" is required.`)
    const key = `${file}\0${kind}`
    if (seen.has(key)) throw new Error(`${where}: duplicate entry for ${file} (${kind}).`)
    seen.add(key)
    return { file, kind: kind as SuppressionKind, count, reason }
  })
  return { version: 1, policy: record['policy'], entries }
}

/**
 * Returns one message per problem; empty means the findings are within the baseline.
 * Over the baseline is a violation. Under it is a violation too: unused allowance could be
 * spent again later without anyone noticing, so lowering it is part of removing a suppression.
 */
export function compareToBaseline(findings: readonly Finding[], baseline: Baseline): string[] {
  const groups = new Map<string, { file: string; kind: SuppressionKind; lines: number[] }>()
  for (const found of findings) {
    const key = `${found.file}\0${found.kind}`
    const group = groups.get(key) ?? { file: found.file, kind: found.kind, lines: [] }
    group.lines.push(found.line)
    groups.set(key, group)
  }
  const allowed = new Map(baseline.entries.map((entry) => [`${entry.file}\0${entry.kind}`, entry.count]))

  const problems: string[] = []
  for (const [key, group] of groups) {
    const limit = allowed.get(key) ?? 0
    if (group.lines.length > limit) {
      const lines = group.lines.map((line) => `line ${String(line)}`).join(', ')
      problems.push(`${group.file}: ${String(group.lines.length)} ${group.kind} (${lines}), baseline allows ${String(limit)}. Remove the new suppression, or fix the code.`)
    }
  }
  for (const entry of baseline.entries) {
    const have = groups.get(`${entry.file}\0${entry.kind}`)?.lines.length ?? 0
    if (have < entry.count) {
      problems.push(`${entry.file}: ${String(have)} ${entry.kind}, baseline records ${String(entry.count)}. Good: now lower or delete that entry in ${BASELINE_PATH} (needs code-owner approval).`)
    }
  }
  return problems
}

function listCodeFiles(root: string, dir: string): string[] {
  const absolute = join(root, dir)
  if (!existsSync(absolute)) return []
  const files: string[] = []
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const relative = `${dir}/${entry.name}`
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') files.push(...listCodeFiles(root, relative))
    } else if (entry.isFile() && CODE_FILE.test(entry.name)) {
      files.push(relative)
    }
  }
  return files
}

export interface CheckResult {
  ok: boolean
  lines: string[]
}

export function runCheck({ root, baselinePath = BASELINE_PATH }: { root: string; baselinePath?: string }): CheckResult {
  let baseline: Baseline
  try {
    baseline = parseBaseline(readFileSync(join(root, baselinePath), 'utf8'))
  } catch (error) {
    return { ok: false, lines: [`Cannot use the baseline at ${baselinePath}: ${error instanceof Error ? error.message : String(error)}`] }
  }

  const files = SCANNED_DIRS.flatMap((dir) => listCodeFiles(root, dir)).sort()
  const findings = files.flatMap((file) => findSuppressions(file, readFileSync(join(root, file), 'utf8')))
  const problems = compareToBaseline(findings, baseline)
  if (problems.length > 0) return { ok: false, lines: problems }

  const allowed = baseline.entries.reduce((sum, entry) => sum + entry.count, 0)
  return { ok: true, lines: [`suppressions: ${String(findings.length)} found in ${String(files.length)} files, all within the baseline (${String(allowed)} allowed)`] }
}
