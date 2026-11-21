/**
 * The only place in the app allowed to read the real time.
 * Everything else receives a Clock so tests and the verify CLI can control time.
 * Enforced by ESLint (no-restricted-syntax on Date.now / new Date()).
 */
export interface Clock {
  /** Milliseconds since the Unix epoch. */
  now(): number
}

export interface FakeClock extends Clock {
  set(epochMs: number): void
  advance(ms: number): void
}

// eslint-disable-next-line no-restricted-syntax -- the single sanctioned real-time read
export const systemClock: Clock = { now: () => Date.now() }

export function createFakeClock(startEpochMs: number): FakeClock {
  let current = startEpochMs
  return {
    now: () => current,
    set(epochMs) {
      current = epochMs
    },
    advance(ms) {
      if (ms < 0) throw new RangeError('advance() requires a non-negative duration')
      current += ms
    },
  }
}
