import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter'
import { buildReport, type JourneyResult } from './report.ts'

const OUTPUT_DIR = 'verify-report'

/**
 * Playwright reporter for the verify project: writes verify-report/verify-report.json and
 * forces a failing exit code whenever the verdict is FAIL, even if Playwright itself passed
 * (for example when the head SHA is missing).
 */
export default class VerifyReporter implements Reporter {
  private readonly journeys: JourneyResult[] = []

  onTestEnd(test: TestCase, result: TestResult): void {
    this.journeys.push({ title: test.title, status: result.status })
  }

  onEnd(result: FullResult): Promise<{ status: FullResult['status'] }> {
    const report = buildReport({ headSha: process.env['VERIFY_HEAD_SHA'], journeys: this.journeys })
    mkdirSync(OUTPUT_DIR, { recursive: true })
    writeFileSync(join(OUTPUT_DIR, 'verify-report.json'), `${JSON.stringify(report, null, 2)}\n`)
    console.log(`verify: ${report.result} for ${report.headSha || '(no sha)'}${report.reason ? ` - ${report.reason}` : ''}`)
    return Promise.resolve({ status: report.result === 'PASS' ? result.status : 'failed' })
  }
}
