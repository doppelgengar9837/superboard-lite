import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  appendDecision,
  DECISIONS_HEADER,
  legacyBlockHash,
  parseBoundary,
  validateDecisionLog,
  type Boundary,
} from './decisions.ts'
import { systemNowMs, toIsoOffset } from './system-time.ts'

const ROOT = resolve(import.meta.dirname, '..')
const utc = (y: number, mo: number, d: number, h = 0, mi = 0, s = 0): number => Date.UTC(y, mo - 1, d, h, mi, s)

// "Now" for the pure tests: 2026-11-22 05:00:00 UTC (13:00 in +08:00).
const NOW = utc(2026, 11, 22, 5)

// Two legacy rows: minute precision, and out of order on purpose (the real file has such a pair).
const LEGACY = [
  '2026-11-21T16:40+08:00\tP1\told decision\told reason\told evidence\tpass',
  '2026-11-21T16:07+08:00\tP1\tolder decision\tolder reason\tolder evidence\tpass',
]
const row = (time: string, decision = 'd'): string => [time, 'P2', decision, 'because', 'evidence', 'pass'].join('\t')

function logOf(...rows: string[]): string {
  return [DECISIONS_HEADER, ...LEGACY, ...rows].join('\n') + '\n'
}

const BOUNDARY: Boundary = { legacyRows: 2, legacySha256: legacyBlockHash([DECISIONS_HEADER, ...LEGACY]) }
const errorsOf = (text: string, now = NOW, boundary = BOUNDARY): string[] => validateDecisionLog(text, boundary, now)

describe('validateDecisionLog: the legacy block is frozen, not judged', () => {
  it('accepts the legacy rows alone, even though they are out of order and minute-precision', () => {
    expect(errorsOf(logOf())).toEqual([])
  })

  it('rejects an edit to a legacy cell (no quiet rewriting of the estimated times)', () => {
    const edited = logOf().replace('2026-11-21T16:07+08:00', '2026-11-21T16:45+08:00')
    expect(errorsOf(edited).join('\n')).toMatch(/legacy/i)
  })

  it('rejects a deleted legacy row', () => {
    expect(errorsOf([DECISIONS_HEADER, LEGACY[0]].join('\n') + '\n').join('\n')).toMatch(/legacy/i)
  })

  it('rejects reordered legacy rows', () => {
    const swapped = [DECISIONS_HEADER, LEGACY[1], LEGACY[0]].join('\n') + '\n'
    expect(errorsOf(swapped).join('\n')).toMatch(/legacy/i)
  })

  it('rejects a changed header', () => {
    expect(errorsOf(logOf().replace('time\tphase', 'when\tphase')).join('\n')).toMatch(/header/i)
  })
})

describe('validateDecisionLog: rows after the boundary are strict', () => {
  const good = row('2026-11-22T10:00:00+08:00')

  it('accepts well-formed rows', () => {
    expect(errorsOf(logOf(good, row('2026-11-22T10:05:30+08:00')))).toEqual([])
  })

  it('accepts equal times (non-decreasing, not strictly increasing)', () => {
    expect(errorsOf(logOf(good, row('2026-11-22T10:00:00+08:00')))).toEqual([])
  })

  const malformed: [string, string][] = [
    ['five fields', ['2026-11-22T10:00:00+08:00', 'P2', 'd', 'r', 'e'].join('\t')],
    ['seven fields', [...good.split('\t'), 'extra'].join('\t')],
    ['an empty field', ['2026-11-22T10:00:00+08:00', 'P2', '', 'r', 'e', 'pass'].join('\t')],
    ['a field padded with spaces', ['2026-11-22T10:00:00+08:00', 'P2', ' d', 'r', 'e', 'pass'].join('\t')],
    ['time without seconds', row('2026-11-22T10:00+08:00')],
    ['time without a time zone', row('2026-11-22T10:00:00')],
    ['time in Z form', row('2026-11-22T02:00:00Z')],
    ['time with an offset lacking the colon', row('2026-11-22T10:00:00+0800')],
    ['a date-only time', row('2026-11-22')],
    ['an impossible date', row('2026-02-30T10:00:00+08:00')],
    ['month 13', row('2026-13-01T10:00:00+08:00')],
    ['hour 24', row('2026-11-22T24:00:00+08:00')],
    ['an offset of +25:00', row('2026-11-22T10:00:00+25:00')],
    ['a time in free text', row('yesterday evening')],
  ]
  it.each(malformed)('rejects %s', (_label, bad) => {
    expect(errorsOf(logOf(bad)).length).toBeGreaterThan(0)
  })

  it('rejects a blank line between rows', () => {
    expect(errorsOf([DECISIONS_HEADER, ...LEGACY, good, '', good].join('\n') + '\n').length).toBeGreaterThan(0)
  })

  it('rejects a blank last line and a missing final newline', () => {
    expect(errorsOf(logOf(good) + '\n').length).toBeGreaterThan(0)
    expect(errorsOf(logOf(good).slice(0, -1)).length).toBeGreaterThan(0)
  })

  it('rejects CRLF line endings', () => {
    expect(errorsOf(logOf(good).replace(/\n/g, '\r\n')).length).toBeGreaterThan(0)
  })
})

describe('validateDecisionLog: time never goes backwards', () => {
  it('rejects a row earlier than the one before it, and names the line', () => {
    const errors = errorsOf(logOf(row('2026-11-22T10:00:00+08:00'), row('2026-11-22T09:59:59+08:00')))
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('Line 5')
  })

  it('compares instants, not text: a later clock time in an earlier zone is earlier', () => {
    // 10:00+08:00 is 02:00Z. 04:00+00:00 is 04:00Z, later, so fine. 01:00+00:00 is earlier, so not.
    expect(errorsOf(logOf(row('2026-11-22T10:00:00+08:00'), row('2026-11-22T04:00:00+00:00')))).toEqual([])
    expect(errorsOf(logOf(row('2026-11-22T10:00:00+08:00'), row('2026-11-22T01:00:00+00:00'))).length).toBe(1)
  })

  it('rejects a first new row earlier than the last legacy row', () => {
    // The last legacy row is 16:07+08:00 on 2026-11-21.
    expect(errorsOf(logOf(row('2026-11-21T16:06:59+08:00'))).length).toBe(1)
    expect(errorsOf(logOf(row('2026-11-21T16:07:00+08:00')))).toEqual([])
  })
})

describe('validateDecisionLog: no row is later than now', () => {
  it('accepts a row at exactly now and rejects one a second later', () => {
    // NOW is 13:00:00 in +08:00.
    expect(errorsOf(logOf(row('2026-11-22T13:00:00+08:00')))).toEqual([])
    const errors = errorsOf(logOf(row('2026-11-22T13:00:01+08:00')))
    expect(errors).toHaveLength(1)
    expect(errors[0]).toMatch(/later than now/i)
  })

  it('judges the instant, not the clock text', () => {
    // 13:30+08:00 is 05:30Z: after NOW.
    expect(errorsOf(logOf(row('2026-11-22T13:30:00+08:00'))).length).toBe(1)
    // 04:30Z written as 12:30+08:00 is before NOW.
    expect(errorsOf(logOf(row('2026-11-22T12:30:00+08:00')))).toEqual([])
  })

  it('reports every problem, with line numbers', () => {
    const errors = errorsOf(logOf(row('2026-11-22T10:00:00+08:00'), 'not a row', row('2099-01-01T00:00:00+08:00')))
    expect(errors.length).toBeGreaterThanOrEqual(2)
    expect(errors.join('\n')).toContain('Line 5')
    expect(errors.join('\n')).toContain('Line 6')
  })
})

describe('appendDecision', () => {
  const fields = { phase: 'P2', decision: 'Use X', reason: 'Because Y', evidence: 'Test Z', result: 'pass' }
  const when = '2026-11-22T11:00:00+08:00'

  it('appends one row with the given time, fields in column order', () => {
    const next = appendDecision(logOf(), fields, when, BOUNDARY, NOW)
    expect(next).toBe(logOf(['2026-11-22T11:00:00+08:00', 'P2', 'Use X', 'Because Y', 'Test Z', 'pass'].join('\t')))
    expect(errorsOf(next)).toEqual([])
  })

  it('trims surrounding whitespace in values', () => {
    const next = appendDecision(logOf(), { ...fields, decision: '  Use X  ' }, when, BOUNDARY, NOW)
    expect(next.split('\n').at(-2)?.split('\t')[2]).toBe('Use X')
  })

  const bad: [string, Partial<typeof fields>][] = [
    ['an empty value', { reason: '   ' }],
    ['a tab inside a value', { decision: 'a\tb' }],
    ['a newline inside a value', { evidence: 'line one\nline two' }],
    ['a carriage return inside a value', { evidence: 'one\rtwo' }],
  ]
  it.each(bad)('rejects %s', (_label, override) => {
    expect(() => appendDecision(logOf(), { ...fields, ...override }, when, BOUNDARY, NOW)).toThrow()
  })

  it('refuses to append to a log that is already invalid', () => {
    expect(() => appendDecision(logOf('garbage'), fields, when, BOUNDARY, NOW)).toThrow(/already invalid/i)
  })

  it('refuses a time that would break the rules (earlier than the last row, or in the future)', () => {
    const existing = logOf(row('2026-11-22T12:00:00+08:00'))
    expect(() => appendDecision(existing, fields, '2026-11-22T11:00:00+08:00', BOUNDARY, NOW)).toThrow()
    expect(() => appendDecision(existing, fields, '2026-11-22T14:00:00+08:00', BOUNDARY, NOW)).toThrow()
  })
})

describe('parseBoundary', () => {
  it('accepts a well-formed boundary', () => {
    expect(parseBoundary(JSON.stringify({ version: 1, legacyRows: 2, legacySha256: 'a'.repeat(64), note: 'n' }))).toEqual({
      legacyRows: 2,
      legacySha256: 'a'.repeat(64),
    })
  })

  const bad: unknown[] = [
    'not json',
    { version: 2, legacyRows: 2, legacySha256: 'a'.repeat(64) },
    { version: 1, legacyRows: -1, legacySha256: 'a'.repeat(64) },
    { version: 1, legacyRows: 1.5, legacySha256: 'a'.repeat(64) },
    { version: 1, legacyRows: 2, legacySha256: 'short' },
  ]
  it.each(bad.map((value) => [JSON.stringify(value).slice(0, 60), value] as const))('rejects %s', (_label, value) => {
    expect(() => parseBoundary(typeof value === 'string' ? value : JSON.stringify(value))).toThrow()
  })
})

describe('system time', () => {
  it('turns date(1) output into ISO 8601 with a colon in the offset', () => {
    expect(toIsoOffset('2026-11-22T10:15:30+0800')).toBe('2026-11-22T10:15:30+08:00')
    expect(toIsoOffset('2026-11-22T10:15:30-0530\n')).toBe('2026-11-22T10:15:30-05:30')
    expect(toIsoOffset('2026-11-22T10:15:30+0000')).toBe('2026-11-22T10:15:30+00:00')
  })

  it('refuses output it does not understand', () => {
    expect(() => toIsoOffset('Sun Nov 22 10:15:30 CST 2026')).toThrow()
  })
})

describe('the real decisions.tsv', () => {
  const real = readFileSync(join(ROOT, 'docs/ai/decisions.tsv'), 'utf8')
  const boundary = parseBoundary(readFileSync(join(ROOT, 'verify/decisions-boundary.json'), 'utf8'))

  it('has legacy rows that match the recorded hash (nobody rewrote the estimated times)', () => {
    // A far-future "now" keeps this unit test independent of the wall clock; the CLI check uses the real one.
    expect(validateDecisionLog(real, boundary, Number.MAX_SAFE_INTEGER)).toEqual([])
  })

  it('records 30 legacy rows', () => {
    expect(boundary.legacyRows).toBe(30)
  })
})

describe('CLIs on a throwaway copy', () => {
  const dirs: string[] = []
  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
  })

  function sandbox(): { file: string; boundary: string } {
    const dir = mkdtempSync(join(tmpdir(), 'decisions-'))
    dirs.push(dir)
    const file = join(dir, 'decisions.tsv')
    const boundary = join(dir, 'boundary.json')
    writeFileSync(file, logOf())
    writeFileSync(boundary, JSON.stringify({ version: 1, ...BOUNDARY, note: 'test' }))
    return { file, boundary }
  }

  function run(script: string, args: string[]): { status: number | null; output: string } {
    const result = spawnSync(process.execPath, [join(ROOT, 'verify', script), ...args], { encoding: 'utf8' })
    return { status: result.status, output: result.stdout + result.stderr }
  }

  const flags = ['--phase', 'P2', '--decision', 'Use X', '--reason', 'Because Y', '--evidence', 'Test Z', '--result', 'pass']

  it('log-decision stamps the row with the system time, as ISO 8601 with a time zone', () => {
    const { file, boundary } = sandbox()
    const before = Math.floor(systemNowMs() / 1000) * 1000
    const { status, output } = run('log-decision.ts', ['--file', file, '--boundary', boundary, ...flags])
    const after = systemNowMs()
    expect(status, output).toBe(0)

    const last = readFileSync(file, 'utf8').trimEnd().split('\n').at(-1)?.split('\t') ?? []
    expect(last.slice(1)).toEqual(['P2', 'Use X', 'Because Y', 'Test Z', 'pass'])
    const time = last[0] ?? ''
    expect(time).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/)
    const written = Date.parse(time)
    expect(written).toBeGreaterThanOrEqual(before)
    expect(written).toBeLessThanOrEqual(after)
  })

  it('log-decision accepts the "--" that pnpm forwards (pnpm decision -- --phase ...)', () => {
    const { file, boundary } = sandbox()
    const { status, output } = run('log-decision.ts', ['--', '--file', file, '--boundary', boundary, ...flags])
    expect(status, output).toBe(0)
    expect(readFileSync(file, 'utf8').trimEnd().split('\n').at(-1)).toContain('\tP2\tUse X\t')
  })

  it('log-decision has no way to pass a time: --time is refused and nothing is written', () => {
    const { file, boundary } = sandbox()
    const { status, output } = run('log-decision.ts', ['--file', file, '--boundary', boundary, ...flags, '--time', '2020-01-01T00:00:00+08:00'])
    expect(status).not.toBe(0)
    expect(output).toMatch(/system clock|unknown/i)
    expect(readFileSync(file, 'utf8')).toBe(logOf())
  })

  it('log-decision refuses a missing field and writes nothing', () => {
    const { file, boundary } = sandbox()
    const { status } = run('log-decision.ts', ['--file', file, '--boundary', boundary, '--phase', 'P2'])
    expect(status).not.toBe(0)
    expect(readFileSync(file, 'utf8')).toBe(logOf())
  })

  it('log-decision refuses a value with a newline and writes nothing', () => {
    const { file, boundary } = sandbox()
    const args = [...flags]
    args[3] = 'two\nlines'
    const { status } = run('log-decision.ts', ['--file', file, '--boundary', boundary, ...args])
    expect(status).not.toBe(0)
    expect(readFileSync(file, 'utf8')).toBe(logOf())
  })

  it('check-decisions passes a log written by log-decision', () => {
    const { file, boundary } = sandbox()
    expect(run('log-decision.ts', ['--file', file, '--boundary', boundary, ...flags]).status).toBe(0)
    const { status, output } = run('check-decisions.ts', ['--file', file, '--boundary', boundary])
    expect(status, output).toBe(0)
  })

  it('check-decisions fails on a hand-written row dated in the future', () => {
    const { file, boundary } = sandbox()
    writeFileSync(file, logOf(row('2099-01-01T00:00:00+08:00')))
    const { status, output } = run('check-decisions.ts', ['--file', file, '--boundary', boundary])
    expect(status).toBe(1)
    expect(output).toMatch(/later than now/i)
  })

  it('check-decisions fails on an edited legacy row', () => {
    const { file, boundary } = sandbox()
    writeFileSync(file, logOf().replace('older decision', 'rewritten decision'))
    expect(run('check-decisions.ts', ['--file', file, '--boundary', boundary]).status).toBe(1)
  })

  it('check-decisions passes the repository as it is', () => {
    const { status, output } = run('check-decisions.ts', [])
    expect(status, output).toBe(0)
  })
})
