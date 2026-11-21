# 0002 Clock injection

Date: 2026-11-21. Status: accepted.

All reads of the current time go through the `Clock` interface in `src/lib/clock.ts`. Production uses `systemClock`; tests and the verify CLI use `createFakeClock`, which can be set and advanced. ESLint forbids `Date.now()`, `new Date()` and `Math.random()` everywhere else.

Why: refresh schedules and version history depend on time. Without a controllable clock, verification either waits in real time or becomes flaky. Making time controllable is a tool (a lever), not an instruction to agents.
