# Application Troubleshooter Checklists

Use selectively; keep SKILL.md loaded for workflow, open this file when deeper prompts or stack nuance are needed.

## Phase 0: Stabilize & Triage
- Freeze risky changes: pause deploy pipeline, disable cron/backfill jobs touching affected surface.
- Pick safest immediate mitigation: rollback, flag-off feature, lower traffic with rate-limit, or serve stale/cache.
- Capture context before change: current commit SHA, config versions, env vars, feature flag states, infra incidents.
- Identify impact shape: % traffic failing, key customers, regions, devices/OS, time started, error codes.
- Evidence first: download logs/traces/metrics snapshots; avoid restarts until captured.

## Phase 1: Reproduce
- One-line failure contract: "When <input/env>, expected <X>, saw <Y> at <time/source>."
- Build minimal repro: failing test, curl/HTTPie command, fixture DB row, or UI path with HAR recording.
- Control variables: locale/timezone, cache state, auth/roles, network conditions, async ordering.
- Flaky failures: add sampling logs + correlation IDs; run under stress/concurrency; widen time window for traces.

## Phase 2: Isolate
- Reduce surface: use `git bisect`, toggle feature flags/config, or swap dependency versions.
- Layer checks: client renders? gateway route? service responds? dependency contract? DB constraint? queue/stream lag?
- Boundary probes: invalid/missing fields, null/empty arrays, large payload, duplicate submission, stale tokens.
- State & data: inspect recent migrations, backfills, retention jobs, cache invalidation, clock skew.
- Observability: add temporary structured logs with request_id/user_id; add trace attributes for hypothesis signals.

## Phase 3: Fix
- Choose smallest diff that restores invariant; keep repro test in repo (unit/integration/contract).
- Handle external failures: retry with jitter, exponential backoff caps, timeouts, circuit breaker, idempotency keys.
- Validate data: write repair/backfill scripts with dry-run + metrics; add guardrails to prevent repeat.
- Error quality: actionable message, code, correlation ID, upstream/downstream, remediation hint.
- Security/privacy: avoid logging secrets/PII; scrub before persisting.

## Phase 4: Validate & Ship
- Re-run repro + surrounding paths; check metrics (latency, error rate, saturation) before/after.
- Canary/staged rollout; monitor for regression; keep kill switch ready; capture traces for success path.
- Verify user impact cleared (support queues, SLOs, dashboards); clean temporary debug logging once stable.

## Phase 5: Learn & Prevent
- Write brief note: trigger, impact, root cause, fix, detection gap, tests added, prevention steps.
- Add alerts for violated invariant; add dashboards/runbooks; link regression tests to incident ticket.

## Stack-Specific Probes
- **React/SPA**: check effect dependencies, stale closures, uncontrolled/controlled mismatch, suspense/async errors, hydration mismatches, cache keys, memoization correctness.
- **Node/TS backend**: unhandled promise rejections, timeouts vs keep-alive, pool exhaustion, JSON schema drift, process memory (heapdump), event loop lag.
- **Python services**: virtualenv version skew, asyncio cancellation, logging handlers duplication, gunicorn/uvicorn worker timeouts, pandas datetime tz issues.
- **Go services**: context propagation (deadline exceeded), deferred closes, goroutine leaks, nil pointer panics, RWMutex misuse, slice sharing, error wrapping (`%w`).
- **Data pipelines**: idempotency of jobs, late/duplicate events, watermark/lag, schema evolution, null handling, partition gaps, retries causing duplicates.

## Quick Instrumentation Patterns
- Add `request_id`/`correlation_id` + key params to every error log; include upstream/downstream names.
- For flaky issues, add counters for hypothesis signals (e.g., cache_miss, retry_exhausted, parse_error).
- Use logpoints/conditional breakpoints instead of noisy print statements in hot paths.
- Capture one trace/span per repro with attributes for hypothesis; compare failed vs success spans.
