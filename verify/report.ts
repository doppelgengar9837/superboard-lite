export type JourneyStatus = 'passed' | 'failed' | 'timedOut' | 'skipped' | 'interrupted'

export interface JourneyResult {
  title: string
  status: JourneyStatus
}

export interface ReportInput {
  /** The commit the verdict is about. Without it the result cannot be bound to a PR head. */
  headSha: string | undefined
  journeys: JourneyResult[]
}

export interface VerifyReport {
  result: 'PASS' | 'FAIL'
  headSha: string
  journeys: JourneyResult[]
  reason?: string
}

/**
 * Turns journey results into the verdict. Pure on purpose: same input, same report.
 * Anything short of a clean pass is FAIL: skipped, timed out, interrupted, nothing ran,
 * or no commit to bind the result to.
 */
export function buildReport({ headSha, journeys }: ReportInput): VerifyReport {
  const sha = headSha?.trim() ?? ''
  if (sha === '') {
    return { result: 'FAIL', headSha: '', journeys, reason: 'No head SHA: the result cannot be bound to a commit.' }
  }
  if (journeys.length === 0) {
    return { result: 'FAIL', headSha: sha, journeys, reason: 'No journeys ran; running nothing proves nothing.' }
  }
  const notPassed = journeys.filter((journey) => journey.status !== 'passed')
  if (notPassed.length > 0) {
    const names = notPassed.map((journey) => `${journey.title} (${journey.status})`).join(', ')
    return { result: 'FAIL', headSha: sha, journeys, reason: `Not passed: ${names}` }
  }
  return { result: 'PASS', headSha: sha, journeys }
}
