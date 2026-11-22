import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { appendDecision, parseBoundary } from './decisions.ts'
import { systemIsoTime, systemNowMs } from './system-time.ts'

// Run with: pnpm decision -- --phase P2 --decision "..." --reason "..." --evidence "..." --result "..."
// There is deliberately no time option: the row is stamped with the system clock. `--file` and
// `--boundary` exist for tests.
const root = resolve(import.meta.dirname, '..')

try {
  const { values } = parseArgs({
    options: {
      phase: { type: 'string' },
      decision: { type: 'string' },
      reason: { type: 'string' },
      evidence: { type: 'string' },
      result: { type: 'string' },
      file: { type: 'string' },
      boundary: { type: 'string' },
    },
    strict: true,
  })
  const { phase, decision, reason, evidence, result } = values
  if (phase === undefined || decision === undefined || reason === undefined || evidence === undefined || result === undefined) {
    throw new Error('Required: --phase, --decision, --reason, --evidence and --result.')
  }
  const file = values.file ?? resolve(root, 'docs/ai/decisions.tsv')
  const boundary = parseBoundary(readFileSync(values.boundary ?? resolve(root, 'verify/decisions-boundary.json'), 'utf8'))
  const time = systemIsoTime()
  const next = appendDecision(readFileSync(file, 'utf8'), { phase, decision, reason, evidence, result }, time, boundary, systemNowMs())
  writeFileSync(file, next)
  console.log(`decision recorded at ${time}`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  const hint = /Unknown option/i.test(message) ? '\nThe time is always taken from the system clock; there is no option to set it.' : ''
  console.error(`FAIL ${message}${hint}`)
  process.exitCode = 1
}
