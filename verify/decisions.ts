import { createHash } from 'node:crypto'

/**
 * Format and ordering rules for docs/ai/decisions.tsv (docs/ai/adr/0005-decision-log.md).
 *
 * The file has two parts. The first `legacyRows` rows were typed by hand with estimated times;
 * they are frozen by hash, not judged. Every row after them must be ISO 8601 with seconds and a
 * UTC offset, never earlier than the row before, never later than now. New rows are written by
 * `pnpm decision`, which takes the time from the system clock.
 */

export const DECISIONS_HEADER = 'time\tphase\tdecision\treason\tevidence\tresult'
const COLUMNS = 6

export interface Boundary {
  /** Data rows (not counting the header) that predate the checks. */
  legacyRows: number
  /** SHA-256 of the header plus the legacy rows, joined by "\n", no trailing newline. */
  legacySha256: string
}

export interface DecisionFields {
  phase: string
  decision: string
  reason: string
  evidence: string
  result: string
}

export function legacyBlockHash(lines: readonly string[]): string {
  return createHash('sha256').update(lines.join('\n')).digest('hex')
}

export function parseBoundary(json: string): Boundary {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch (error) {
    throw new Error(`Boundary is not valid JSON: ${error instanceof Error ? error.message : String(error)}`, { cause: error })
  }
  const record = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>
  const { version, legacyRows, legacySha256 } = record
  if (version !== 1) throw new Error('Boundary version must be 1.')
  if (typeof legacyRows !== 'number' || !Number.isInteger(legacyRows) || legacyRows < 0) {
    throw new Error('Boundary "legacyRows" must be a non-negative integer.')
  }
  if (typeof legacySha256 !== 'string' || !/^[0-9a-f]{64}$/.test(legacySha256)) {
    throw new Error('Boundary "legacySha256" must be 64 lowercase hex characters.')
  }
  return { legacyRows, legacySha256 }
}

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const isLeap = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0

/**
 * Epoch milliseconds of an ISO 8601 time with a numeric offset, or undefined if the text is not
 * that or is not a real moment. `requireSeconds: false` also accepts the legacy `...T19:00+08:00`.
 */
function parseInstant(text: string, requireSeconds: boolean): number | undefined {
  const pattern = requireSeconds
    ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})([+-])(\d{2}):(\d{2})$/
    : /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?([+-])(\d{2}):(\d{2})$/
  const match = pattern.exec(text)
  if (match === null) return undefined
  const field = (index: number): number => Number(match[index] ?? '0')
  const [year, month, day, hour, minute, second] = [field(1), field(2), field(3), field(4), field(5), field(6)]
  const [offsetHour, offsetMinute] = [field(8), field(9)]
  const sign = match[7] === '-' ? -1 : 1
  const daysInMonth = (DAYS_IN_MONTH[month - 1] ?? 0) + (month === 2 && isLeap(year) ? 1 : 0)
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth) return undefined
  if (hour > 23 || minute > 59 || second > 59 || offsetHour > 14 || offsetMinute > 59) return undefined
  const offsetMs = sign * (offsetHour * 60 + offsetMinute) * 60_000
  return Date.UTC(year, month - 1, day, hour, minute, second) - offsetMs
}

/** Returns one message per problem; empty means the log is valid. `nowMs` comes from the system clock. */
export function validateDecisionLog(text: string, boundary: Boundary, nowMs: number): string[] {
  if (text.includes('\r')) return ['The log must use "\\n" line endings only.']
  if (!text.endsWith('\n')) return ['The log must end with a newline.']
  const lines = text.slice(0, -1).split('\n')

  if (lines[0] !== DECISIONS_HEADER) return ['Line 1: the header must be exactly "time, phase, decision, reason, evidence, result" separated by tabs.']
  if (lines.length < boundary.legacyRows + 1) {
    return [`The log has ${String(lines.length - 1)} rows, fewer than the ${String(boundary.legacyRows)} legacy rows. Legacy rows may not be deleted.`]
  }
  const legacy = lines.slice(0, boundary.legacyRows + 1)
  if (legacyBlockHash(legacy) !== boundary.legacySha256) {
    return [`Lines 1 to ${String(boundary.legacyRows + 1)} (the legacy rows) differ from the recorded hash. Their times are estimates and are frozen: do not edit, reorder or delete them (see docs/ai/adr/0005-decision-log.md).`]
  }

  const problems: string[] = []
  const lastLegacy = (legacy.at(-1) ?? '').split('\t')[0] ?? ''
  let previous = boundary.legacyRows === 0 ? -Infinity : parseInstant(lastLegacy, false)
  if (previous === undefined) return [`The last legacy row has an unreadable time: ${JSON.stringify(lastLegacy)}.`]
  let previousLine = boundary.legacyRows + 1

  for (let index = boundary.legacyRows + 1; index < lines.length; index += 1) {
    const lineNumber = index + 1
    const where = `Line ${String(lineNumber)}`
    const fields = (lines[index] ?? '').split('\t')
    if (fields.length !== COLUMNS) {
      problems.push(`${where}: expected ${String(COLUMNS)} tab-separated fields, found ${String(fields.length)}.`)
      continue
    }
    const blank = fields.findIndex((field) => field === '' || field !== field.trim())
    if (blank !== -1) {
      problems.push(`${where}: field ${String(blank + 1)} is empty or has leading or trailing whitespace.`)
      continue
    }
    const time = fields[0] ?? ''
    const instant = parseInstant(time, true)
    if (instant === undefined) {
      problems.push(`${where}: time ${JSON.stringify(time)} must be ISO 8601 with seconds and a UTC offset, like 2026-11-22T13:18:28+08:00, and a real date.`)
      continue
    }
    if (instant < previous) {
      problems.push(`${where}: time ${time} is earlier than line ${String(previousLine)}. Times must not go backwards.`)
    }
    if (instant > nowMs) {
      problems.push(`${where}: time ${time} is later than now. A row cannot be dated in the future.`)
    }
    previous = Math.max(previous, instant)
    previousLine = lineNumber
  }
  return problems
}

const FIELD_NAMES = ['phase', 'decision', 'reason', 'evidence', 'result'] as const

/**
 * Returns the log with one row appended. Throws, and the caller writes nothing, if the existing log is
 * already invalid, a value cannot be stored in one TSV cell, or the new row would break the rules.
 */
export function appendDecision(text: string, fields: DecisionFields, isoTime: string, boundary: Boundary, nowMs: number): string {
  const existing = validateDecisionLog(text, boundary, nowMs)
  if (existing.length > 0) {
    throw new Error(`The log is already invalid, so nothing was written:\n${existing.join('\n')}`)
  }
  const values = FIELD_NAMES.map((name) => {
    const value = fields[name].trim()
    if (value === '') throw new Error(`"${name}" must not be empty.`)
    if (/[\t\r\n]/.test(value)) throw new Error(`"${name}" must be a single line without tabs.`)
    return value
  })
  const next = `${text}${[isoTime, ...values].join('\t')}\n`
  const problems = validateDecisionLog(next, boundary, nowMs)
  if (problems.length > 0) throw new Error(`The new row is not valid, so nothing was written:\n${problems.join('\n')}`)
  return next
}
