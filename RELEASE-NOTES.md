# Fail-fast on missing LLM provider in cc-hook and cc-poller

## Summary

Both `cc-hook.ts` (Claude Code Stop hook) and `cc-poller.ts` (cron poller) had a batched retry loop around `crystal.ingest(batch)` that would retry up to 4 times with exponential backoff (~2s + 4s + 8s + 16s ≈ 30s + initial attempt = ~37s total). When the underlying failure was "OpenAI API key required" or "no LLM provider configured" — a permanent error that a retry cannot fix — this burned ~37 seconds per CC turn end (or per cron run) on guaranteed-failing retries.

## What changed

### `src/cc-hook.ts`

- New local helper `isPermanentError(err)` that detects missing-API-key / no-provider error patterns
- `ingestLocal()` retry loop short-circuits via `throw err` on permanent errors (no exponential backoff for errors that won't resolve)
- `main()` catch block: on permanent error, writes a single informational line to stderr and `process.exit(0)` (clean exit, not hook failure). Non-permanent errors still go through the normal `exit(1)` path.

### `src/cc-poller.ts`

Mirror change: same `isPermanentError` helper plus the `ingestLocal` retry loop short-circuit.

## Why the prior behavior was wrong

The retry pattern was written assuming transient failures (network blip, rate limit, ephemeral backend flake). For those it's correct. But "OpenAI API key required" is a configuration error, not a transient one. The `getOpSecret()` fallback reads the SA token file and calls `op`; if the key genuinely isn't available, it won't be available on retry 2, 3, or 4. Retrying just adds latency without any chance of recovery.

## Observed symptom (2026-04-15)

When Parker stopped the OpenClaw gateway (to put Lēsa to sleep), the CC Stop hook became the only capture path for his main session. The hook's `OPENAI_API_KEY` lookup failed because `OP_SERVICE_ACCOUNT_TOKEN` was not in the CC process env (a separate bug tracked in `wip-ldm-os-private` bug plan `2026-04-15--cc-mini--sa-token-env-and-hook-failfast.md`). The retry loop then burned 37s at every turn end before giving up, visible in the terminal as `[retry 2] ... [retry 3] ... Ended for 37s`.

After this release, even if the SA token env bug is not yet fixed, the hook exits in under 200ms with one clean log line instead of hanging for 37s.

## Companion fix

The root cause (missing SA token in CC env) is fixed in `wip-ldm-os-private` by having `ldm install` append `export OP_SERVICE_ACCOUNT_TOKEN=$(cat ~/.openclaw/secrets/op-sa-token)` to the user's shell profile. That change lands separately. Together, the two fixes make the common case work (provider available, capture happens) and the edge case fail gracefully (no provider, skip silently).

## Backwards compatibility

No API change. No config change. Existing working setups are unaffected (the permanent-error branch is only taken when retries would all fail anyway). The only behavior change for users already seeing failures is: faster failure, cleaner log, hook exits 0 instead of 1.
