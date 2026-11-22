import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { runCheck } from './suppressions.ts'

// Run with: pnpm check:suppressions. `--root` exists for tests; CI uses the default (this repository).
const { values } = parseArgs({ options: { root: { type: 'string' } }, strict: true })
const root = values.root === undefined ? resolve(import.meta.dirname, '..') : resolve(values.root)

const result = runCheck({ root })
for (const line of result.lines) console.log(result.ok ? line : `FAIL ${line}`)
process.exitCode = result.ok ? 0 : 1
