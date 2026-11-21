import { describe, expect, it } from 'vitest'
import { createFakeClock, systemClock } from './clock.ts'

describe('createFakeClock', () => {
  it('starts at the given time and does not move by itself', () => {
    const clock = createFakeClock(1_000)
    expect(clock.now()).toBe(1_000)
    expect(clock.now()).toBe(1_000)
  })

  it('advances by the requested duration', () => {
    const clock = createFakeClock(0)
    clock.advance(3_600_000)
    expect(clock.now()).toBe(3_600_000)
  })

  it('can be set to an absolute time', () => {
    const clock = createFakeClock(0)
    clock.set(42)
    expect(clock.now()).toBe(42)
  })

  it('rejects negative advances', () => {
    const clock = createFakeClock(0)
    expect(() => {
      clock.advance(-1)
    }).toThrow(RangeError)
  })
})

describe('systemClock', () => {
  it('returns a plausible epoch time', () => {
    expect(systemClock.now()).toBeGreaterThan(1_700_000_000_000)
  })
})
