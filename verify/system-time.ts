import { execFileSync } from 'node:child_process'

/**
 * The system clock, read from the operating system's own `date`, for the decision log.
 *
 * Why not `new Date()`: ESLint bans it outside src/lib/clock.ts (ADR 0002), and importing
 * that file would make the log's timestamps depend on product code a Tier 1 change can edit.
 * `date` takes no input from this repository. It is called by absolute path so a PATH entry
 * cannot swap it. (GNU and BSD `date` both support `+%s` and `%z`.)
 */
const DATE = '/bin/date'

/** Milliseconds since the epoch, to whole seconds. */
export function systemNowMs(): number {
  const seconds = Number(execFileSync(DATE, ['+%s'], { encoding: 'utf8' }).trim())
  if (!Number.isSafeInteger(seconds)) throw new Error('date +%s did not return a number of seconds.')
  return seconds * 1000
}

/** `date +%Y-%m-%dT%H:%M:%S%z` prints `+0800`; ISO 8601 extended form wants `+08:00`. */
export function toIsoOffset(dateOutput: string): string {
  const match = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})([+-]\d{2})(\d{2})$/.exec(dateOutput.trim())
  if (match === null) throw new Error(`Unexpected date output: ${JSON.stringify(dateOutput)}`)
  return `${match[1] ?? ''}${match[2] ?? ''}:${match[3] ?? ''}`
}

/** Local time, to whole seconds, with the machine's UTC offset. */
export function systemIsoTime(): string {
  return toIsoOffset(execFileSync(DATE, ['+%Y-%m-%dT%H:%M:%S%z'], { encoding: 'utf8' }))
}
