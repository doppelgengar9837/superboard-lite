import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { parseBoundary, validateDecisionLog } from './decisions.ts'
import { systemNowMs } from './system-time.ts'

// Run with: pnpm check:decisions. `--file` and `--boundary` exist for tests; CI uses the defaults.
const root = resolve(import.meta.dirname, '..')
const { values } = parseArgs({ options: { file: { type: 'string' }, boundary: { type: 'string' } }, strict: true })
const file = values.file ?? resolve(root, 'docs/ai/decisions.tsv')
const boundaryPath = values.boundary ?? resolve(root, 'verify/decisions-boundary.json')

try {
  const boundary = parseBoundary(readFileSync(boundaryPath, 'utf8'))
  const problems = validateDecisionLog(readFileSync(file, 'utf8'), boundary, systemNowMs())
  if (problems.length > 0) {
    for (const problem of problems) console.error(`FAIL ${problem}`)
    process.exitCode = 1
  } else {
    console.log('decisions: format, order and times are valid')
  }
} catch (error) {
  console.error(`FAIL ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}
