---
name: application-troubleshooter
description: Structured debugging workflow to triage, reproduce, isolate, fix, and verify application issues across web, backend, mobile, or data services. Use when diagnosing bugs, errors, crashes, performance regressions, flaky behavior, outage mitigation, or unclear failures; includes logging, breakpoints, tracing, rollback/feature flags, validation, and follow-up safeguards.
---

# Application Troubleshooter

Use this skill to drive a fix-first debugging process that contains the blast radius, finds root cause, and proves the fix.

## Fast Triage (3-5 minutes)
- Stabilize: pause risky deploys/jobs; enable feature flag fallbacks or rate-limit; capture failing version/build.
- Assess impact: who/what is broken, since when, severity, scope (percent of users/requests).
- Collect signals: most recent errors, alerts, dashboards, traces; note exact error text and timestamps.
- Decide path: is rollback/disable safe? if yes, do it before deeper debugging; if no, proceed to Reproduce.

## Reproduce the Failure
- Define expected vs actual in one sentence; pin exact input, environment, version, and time.
- Try smallest deterministic repro: minimal request/payload, local seed data, unit/integration test, or prod canary.
- Preserve artifacts: logs, stack traces, screenshots/Har, request IDs, core dumps; avoid restarting until data is saved.
- If repro is flaky, instrument to capture next occurrence (sampling logs, trace attributes, verbose mode).

## Isolate the Cause
- Narrow the change surface: recent commits/config/infra changes; run `git bisect` or toggle flags to binary search.
- Localize the failing layer: client <-> gateway <-> service <-> dependency <-> data; validate contracts between layers.
- Inspect invariants and boundaries: inputs/outputs, null/empty, timezones, encodings, idempotency, retries, timeouts.
- Add targeted instrumentation: structured logs with correlation IDs, counters for hypothesis signals, temporary guards.
- Reproduce under debugger/profiler: set breakpoints/watchpoints on mutated state; for perf, capture flamegraph or tracing span.

## Fix and Guard
- Pick the minimal safe fix; avoid opportunistic refactors. Keep the failing test/repro harness in the repo.
- Preserve context in errors: message, key params, correlation/request ID, upstream/downstream names, user impact.
- Add guardrails: input validation, timeouts, retries with jitter, circuit breakers, bulkheads, idempotency keys, backpressure.
- Handle migration/data issues: write one-time repair scripts; add checks to prevent recurrence.
- Write/extend automated tests that cover the failure path (unit + integration + contract if external dependencies).

## Validate the Fix
- Re-run repro and the failing test; verify adjacent paths and error budgets (latency, saturation, correctness).
- Monitor in real time: logs/metrics/traces for the specific request IDs; watch for new errors or performance regressions.
- Canary or staged rollout; keep the kill-switch/flag ready; roll forward with observability if rollback is unsafe.
- Confirm user impact resolved (support tickets, dashboards); remove temporary debug logging once confidence is high.

## Capture Learning
- Record root cause, fix, and detection gaps; add regression test IDs; update runbooks and alerts.
- If detection was late, add monitors for the violated invariant or missing alert condition.

## Tools & Tactics (pick as needed)
- Logging: structured logs with request/session IDs; log what changed, not everything. Prefer warn/error only on actionable failures.
- Debuggers: conditional breakpoints, logpoints, data breakpoints/watchpoints; avoid stepping without hypotheses.
- HTTP/API debugging: capture curl/HTTPie replay commands; inspect headers, auth, caching, and idempotency.
- Data integrity: compare prod vs staging data; check migrations, defaults, constraints, and background jobs.
- Concurrency/time: check locks, races, task cancellation, async error handling, scheduling delays, timezones, DST, clock skew.
- Performance: measure first (profile/trace), set budgets, optimize the hotspot only; avoid premature micro-optimizations.
- Safety levers: feature flags, config flips, circuit breakers, rate limits, and rollbacks; document default states.

## References
- For detailed checklists per phase and stack-specific probes, load `references/checklists.md`.
