import { describe, expect, it } from 'vitest'
import { buildReport } from './report.ts'

const SHA = '0123456789abcdef0123456789abcdef01234567'

describe('buildReport', () => {
  it('passes when every journey passed and the head SHA is known', () => {
    const report = buildReport({
      headSha: SHA,
      journeys: [
        { title: 'home page', status: 'passed' },
        { title: 'second', status: 'passed' },
      ],
    })
    expect(report.result).toBe('PASS')
    expect(report.headSha).toBe(SHA)
    expect(report.journeys).toHaveLength(2)
  })

  it('fails when any journey did not pass, and names it', () => {
    const report = buildReport({
      headSha: SHA,
      journeys: [
        { title: 'home page', status: 'passed' },
        { title: 'broken one', status: 'failed' },
      ],
    })
    expect(report.result).toBe('FAIL')
    expect(report.reason).toContain('broken one')
  })

  it.each(['skipped', 'timedOut', 'interrupted'] as const)(
    'treats a %s journey as a failure, never as a pass',
    (status) => {
      const report = buildReport({ headSha: SHA, journeys: [{ title: 'j', status }] })
      expect(report.result).toBe('FAIL')
    },
  )

  it('fails when no journey ran, because running nothing proves nothing', () => {
    const report = buildReport({ headSha: SHA, journeys: [] })
    expect(report.result).toBe('FAIL')
    expect(report.reason).toMatch(/no journeys/i)
  })

  it.each([undefined, '', '   '])('fails when the head SHA is %j, because the result cannot be bound to a commit', (headSha) => {
    const report = buildReport({ headSha, journeys: [{ title: 'j', status: 'passed' }] })
    expect(report.result).toBe('FAIL')
    expect(report.reason).toMatch(/sha/i)
  })

  it('is a pure function of its input (same input, same report)', () => {
    const input = { headSha: SHA, journeys: [{ title: 'j', status: 'passed' as const }] }
    expect(buildReport(input)).toEqual(buildReport(input))
  })
})
