# Changelog




















## 0.7.26 (2026-03-16)

# Memory Crystal v0.7.26

Add repository field to package.json. GitHub Packages needs this to link packages to the repo.

## Issues closed

- Closes #50

## 0.7.25 (2026-03-16)

# Release Notes: memory-crystal v0.7.25

Bump SKILL.md version and name to match package branding.

## What changed

- SKILL.md version bumped from 0.4.0 to 0.7.24 (was stuck at the original version)
- SKILL.md name changed from `memory` to `wip-memory-crystal` (matches branded convention)
- Forces deploy to public repo, triggering auto-publish to wip.computer/install/

## Why

The SKILL.md version was out of sync with the package version. The name didn't match the `wip-` branding convention used across all install files on wip.computer.

## Issues closed

- #80

## How to verify

```bash
crystal --version
head -4 ~/.ldm/extensions/memory-crystal/skills/memory/SKILL.md
```

## 0.7.24 (2026-03-15)

# Dev Update: Search Quality v2 + MLX Local LLM

**Date:** 2026-03-15
**Author:** CC-Mini
**Session:** memory-crstal01 (continued from Mar 13-14)

---

## Summary

Six search quality features from QMD v2.0 analysis, plus MLX local LLM infrastructure for Apple Silicon. All coded, tested, merged. Not yet deployed.

## What Shipped

### Search Quality (PR #75)

1. **Intent parameter.** Disambiguates queries without adding search terms. `crystal search "security" --intent "1Password"` steers toward 1Password results. Flows through expansion prompt (guides LLM variations), disables strong-signal bypass, prepended to rerank query. Available via CLI `--intent`, MCP `intent`.

2. **candidateLimit.** Tunable rerank pool size. `crystal search "query" --candidates 60`. Default stays 40. More candidates = better recall, slower reranking. Available via CLI `--candidates`, MCP `candidate_limit`.

3. **Explain mode.** Per-result scoring breakdown showing FTS score, vector score, RRF rank, reranker score, recency weight, and final blended score. `crystal search "query" --explain`. Available via CLI `--explain`, MCP `explain`.

4. **Persistent LLM cache.** `llm_cache` table in crystal.db. Expansion and reranking results cached with 7-day TTL. Content-addressable reranking (keyed by query + sorted passage hashes). Same query = instant on repeat searches. Configurable TTL via `CRYSTAL_CACHE_TTL_DAYS`.

5. **Structured search API.** `crystal.structuredSearch(queries)` accepts pre-expanded StructuredQuery[] (lex, vec, hyde). Skips LLM expansion entirely. Agents construct their own queries when they know what they want. RRF fusion with first list weighted 2x.

### MLX Local LLM (PR #76)

6. **MLX auto-install.** New `src/mlx-setup.ts` with full setup flow:
   - `detectPlatform()` ... Apple Silicon / Intel Mac / Linux / other
   - `installMlxLm()` ... uv > pip3 > pip3 --user fallback chain
   - `createLaunchAgent()` ... always-on MLX server via LaunchAgent
   - `verifyServer()` ... 30s warmup wait for model loading
   - `setupMlx()` ... full flow: detect, install, configure, start, verify

7. **Crystal MLX CLI.** `crystal mlx setup/status/stop` subcommands.

8. **Doctor check #13.** MLX health check with three states: not installed, installed but not running, running. Suggests fix for each.

9. **Installer integration.** `crystal init` detects Apple Silicon and suggests `crystal mlx setup` when MLX is not installed.

10. **Port 18791.** LDM service ports: 18789 (OpenClaw), 18790 (Crystal Core), 18791 (MLX LLM).

11. **Model: Qwen 2.5 3B Instruct 4-bit.** `mlx-community/Qwen2.5-3B-Instruct-4bit`. ~1.5 GB, fast on M-series, good at instruction following for query expansion and relevance scoring.

### Also

- QMD v2.0 analysis written (`ai/product/notes/2026-03-15--cc-mini--qmd-v2.0-analysis.md`)
- Search quality plan written (`ai/product/plans-prds/current/2026-03-15--cc-mini--search-quality-qmd-v2-port.md`)
- MLX plan moved from upcoming to current
- Stashed roadmap + readme-first updates recovered and committed (PR #74)
- README footer: QMD credit restored, CLA + dual license confirmed on both repos

## Files Changed

| File | Change |
|------|--------|
| `src/search-pipeline.ts` | Intent support, candidateLimit param, explain traces, DeepSearchResult type |
| `src/llm.ts` | Intent in expansion prompt, persistent DB cache (expansion + reranking), setLLMCacheDb() |
| `src/core.ts` | llm_cache table schema, deepSearch options, structuredSearch() method, StructuredQuery type |
| `src/mcp-server.ts` | intent, candidate_limit, explain params on crystal_search, LLM cache DB wiring |
| `src/cli.ts` | --intent, --candidates, --explain flags, crystal mlx subcommand |
| `src/mlx-setup.ts` | **NEW** ... full MLX setup, doctor check, state management |
| `src/doctor.ts` | MLX health check (#13) |
| `src/installer.ts` | MLX detection in crystal init flow |

## What This Enables

- **Free deep search.** MLX replaces OpenAI API calls for expansion + reranking. Zero cost per search.
- **Faster repeated searches.** Persistent cache means the LLM call happens once per unique query.
- **Smarter agent queries.** Structured search lets agents skip expansion when they know what they want.
- **Debuggable search.** Explain mode shows exactly why each result ranked where it did.
- **Offline search quality.** MLX works without internet. API fallback when MLX is down.

## 0.7.23 (2026-03-15)

# Release Notes: Memory Crystal v0.7.23

**Date:** 2026-03-15

## Search Quality v2 + MLX Local LLM

This release adds six search quality features ported from the QMD v2.0 analysis, plus the complete MLX local LLM infrastructure for Apple Silicon. Deep search is now disambiguatable, cacheable, debuggable, and can run entirely offline on Apple Silicon.

### Intent parameter

Disambiguates queries without adding search terms. `crystal search "security" --intent "1Password"` steers results toward 1Password-related security instead of repo permissions or agent secrets. Intent flows through the expansion prompt (guides LLM variations), disables strong-signal bypass (keyword match might not be what the caller wants), and is prepended to the rerank query. Available via CLI `--intent` and MCP `intent`.

### Persistent LLM cache

Expansion and reranking results are now cached in crystal.db (`llm_cache` table) with a 7-day TTL. Same query = instant on repeat searches. Reranking cache is content-addressable (keyed by query + sorted passage hashes), so identical content from different sessions shares cached scores. Configurable via `CRYSTAL_CACHE_TTL_DAYS` env var.

### Explain mode

Per-result scoring breakdown showing FTS score, vector score, RRF rank, reranker score, recency weight, and final blended score. `crystal search "query" --explain`. Available via CLI `--explain` and MCP `explain`. Makes search quality transparent and debuggable.

### candidateLimit

Tunable rerank pool size. `crystal search "query" --candidates 60`. Default stays 40. More candidates = better recall, slower reranking. Available via CLI `--candidates` and MCP `candidate_limit`.

### Structured search API

`crystal.structuredSearch(queries)` accepts pre-expanded StructuredQuery[] with typed sub-queries (lex, vec, hyde). Skips LLM expansion entirely. Agents construct their own queries when they already know what they want. RRF fusion with first list weighted 2x.

### MLX local LLM (Phase 3)

Complete auto-install infrastructure for running a local LLM on Apple Silicon:

- `crystal mlx setup` detects Apple Silicon, installs mlx-lm (uv > pip3 > pip3 --user), creates LaunchAgent for always-on server
- Model: `mlx-community/Qwen2.5-3B-Instruct-4bit` (~1.5 GB, fast on M-series)
- Port 18791 (18789 OpenClaw, 18790 Crystal Core, 18791 MLX)
- `crystal mlx status` and `crystal mlx stop` for server management
- `crystal doctor` check #13: MLX health (not installed / down / running)
- `crystal init` detects Apple Silicon and suggests MLX setup
- State file at `~/.ldm/state/mlx-server.json`

### Also in this release

- QMD v2.0 analysis documented (`ai/product/notes/`)
- Search quality plan written (`ai/product/plans-prds/current/`)
- MLX plan moved from upcoming to current
- Stashed roadmap + readme-first updates recovered (PR #74)

Closes #57, #63, #64.

## 0.7.22 (2026-03-14)

Remove standalone role

## 0.7.21 (2026-03-14)

Fix install URL

## 0.7.20 (2026-03-14)

Add CLA, dual LICENSE, standardize README footer

## 0.7.19 (2026-03-14)

Fix score normalization

## 0.7.18 (2026-03-13)

# Dev Update: Orphan Cleanup, DELETE Trigger, Doctor Fix

**Date:** 2026-03-13
**Author:** CC-Mini
**Session:** memory-db-fix

---

## What Happened

Parker ran the Memory Crystal install prompt and `crystal doctor` reported "Embeddings: FAILING ... no provider configured in env." Investigation revealed two separate issues:

### Issue 1: Doctor False Positive

`checkEmbeddingProvider()` in `doctor.ts` only checked `process.env.OPENAI_API_KEY`. But the cron job and hooks resolve the key from 1Password via the SA token at `~/.openclaw/secrets/op-sa-token`. The doctor didn't know about this path.

**Fix:** Added `checkOpEmbeddings()` helper to `doctor.ts` that checks for the SA token file, then does a live `op read` to verify it works. Doctor now reports `ok: openai (via 1Password)` instead of `fail`.

### Issue 2: Orphaned Vectors and FTS Entries

On 2026-03-11, 141,652 bulk file-scan chunks were correctly deleted from the `chunks` table. Parker said: "Why are we indexing documents?" These were raw file scans (Python venv packages, TypeScript source, vendor code) with no conversational context.

The deletion used raw SQL (`DELETE FROM chunks WHERE agent_id = 'system'`). But Memory Crystal had no DELETE trigger. The corresponding entries in `chunks_vec` (sqlite-vec) and `chunks_fts` (FTS5) were left orphaned.

**Impact:**
- 141,651 orphaned vectors (~875 MB)
- 141,652 orphaned FTS entries
- ~7% of search queries hit phantom results (silently filtered out)
- Database: 1.96 GB (should have been ~1 GB)

**Fix (three parts):**

1. **DELETE trigger** added to `initChunksTables()` in `core.ts`:
```sql
CREATE TRIGGER IF NOT EXISTS chunks_cleanup AFTER DELETE ON chunks
BEGIN
  DELETE FROM chunks_vec WHERE chunk_id = OLD.id;
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES('delete', OLD.id, OLD.text);
END;
```

2. **`cleanOrphans()` method** added to Crystal class in `core.ts`. Counts orphaned vec/FTS entries, deletes vec orphans in batches of 1000, rebuilds FTS5 from scratch.

3. **`crystal cleanup` CLI command** added to `cli.ts`. Handles the full workflow: backup, pause cron, clean orphans, VACUUM, resume cron. Supports `--dry-run`.

**Cleanup results:**
- 141,651 orphaned vectors removed
- FTS rebuilt from 73,813 chunks in 5.7s
- Database: 1.96 GB -> 1.45 GB (525 MB saved)
- Verification: chunks = FTS entries = 73,813. Match: YES
- Zero orphans remaining

### Side Discovery: Plaintext SA Token

During investigation, discovered that `~/.openclaw/secrets/op-sa-token` is a plaintext 1Password SA token readable by any process running as `lesa`. This is the bootstrap credential that unlocks all secrets. Bug report filed. Long-term fix: Lesa iOS app with remote biometrics (product doc written).

### Product Rule Established

Memory Crystal indexes conversations only. File content that appears in conversation turns (agent reads a file, discusses it) is captured as part of the conversation. Raw directory scanning without conversational context is not what Memory Crystal is for.

## Files Changed

| File | Change |
|------|--------|
| `src/core.ts` | Added `chunks_cleanup` DELETE trigger, `cleanOrphans()` method |
| `src/cli.ts` | Added `crystal cleanup` command, updated imports and USAGE |
| `src/doctor.ts` | Added `checkOpEmbeddings()` for 1Password detection |
| `ai/product/bugs/2026-03-13--orphaned-vectors-and-fts-after-bulk-delete.md` | Bug report |

## Related (wip-secrets-ios-private)

| File | What |
|------|------|
| `ai/product/product-ideas/lesa-app-remote-biometrics.md` | Lesa app: remote biometrics for agent computers |
| `ai/product/bugs/2026-03-13--plaintext-sa-token-on-disk.md` | Plaintext SA token bug report |

## Status

- Code deployed and running (cleanup already executed)
- Not yet committed / PR'd / released
- Needs: branch, commit, PR, merge, `wip-release patch`

## 0.7.17 (2026-03-13)

# Dev Update: Orphan Cleanup, DELETE Trigger, Doctor Fix

**Date:** 2026-03-13
**Author:** CC-Mini
**Session:** memory-db-fix

---

## What Happened

Parker ran the Memory Crystal install prompt and `crystal doctor` reported "Embeddings: FAILING ... no provider configured in env." Investigation revealed two separate issues:

### Issue 1: Doctor False Positive

`checkEmbeddingProvider()` in `doctor.ts` only checked `process.env.OPENAI_API_KEY`. But the cron job and hooks resolve the key from 1Password via the SA token at `~/.openclaw/secrets/op-sa-token`. The doctor didn't know about this path.

**Fix:** Added `checkOpEmbeddings()` helper to `doctor.ts` that checks for the SA token file, then does a live `op read` to verify it works. Doctor now reports `ok: openai (via 1Password)` instead of `fail`.

### Issue 2: Orphaned Vectors and FTS Entries

On 2026-03-11, 141,652 bulk file-scan chunks were correctly deleted from the `chunks` table. Parker said: "Why are we indexing documents?" These were raw file scans (Python venv packages, TypeScript source, vendor code) with no conversational context.

The deletion used raw SQL (`DELETE FROM chunks WHERE agent_id = 'system'`). But Memory Crystal had no DELETE trigger. The corresponding entries in `chunks_vec` (sqlite-vec) and `chunks_fts` (FTS5) were left orphaned.

**Impact:**
- 141,651 orphaned vectors (~875 MB)
- 141,652 orphaned FTS entries
- ~7% of search queries hit phantom results (silently filtered out)
- Database: 1.96 GB (should have been ~1 GB)

**Fix (three parts):**

1. **DELETE trigger** added to `initChunksTables()` in `core.ts`:
```sql
CREATE TRIGGER IF NOT EXISTS chunks_cleanup AFTER DELETE ON chunks
BEGIN
  DELETE FROM chunks_vec WHERE chunk_id = OLD.id;
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES('delete', OLD.id, OLD.text);
END;
```

2. **`cleanOrphans()` method** added to Crystal class in `core.ts`. Counts orphaned vec/FTS entries, deletes vec orphans in batches of 1000, rebuilds FTS5 from scratch.

3. **`crystal cleanup` CLI command** added to `cli.ts`. Handles the full workflow: backup, pause cron, clean orphans, VACUUM, resume cron. Supports `--dry-run`.

**Cleanup results:**
- 141,651 orphaned vectors removed
- FTS rebuilt from 73,813 chunks in 5.7s
- Database: 1.96 GB -> 1.45 GB (525 MB saved)
- Verification: chunks = FTS entries = 73,813. Match: YES
- Zero orphans remaining

### Side Discovery: Plaintext SA Token

During investigation, discovered that `~/.openclaw/secrets/op-sa-token` is a plaintext 1Password SA token readable by any process running as `lesa`. This is the bootstrap credential that unlocks all secrets. Bug report filed. Long-term fix: Lesa iOS app with remote biometrics (product doc written).

### Product Rule Established

Memory Crystal indexes conversations only. File content that appears in conversation turns (agent reads a file, discusses it) is captured as part of the conversation. Raw directory scanning without conversational context is not what Memory Crystal is for.

## Files Changed

| File | Change |
|------|--------|
| `src/core.ts` | Added `chunks_cleanup` DELETE trigger, `cleanOrphans()` method |
| `src/cli.ts` | Added `crystal cleanup` command, updated imports and USAGE |
| `src/doctor.ts` | Added `checkOpEmbeddings()` for 1Password detection |
| `ai/product/bugs/2026-03-13--orphaned-vectors-and-fts-after-bulk-delete.md` | Bug report |

## Related (wip-secrets-ios-private)

| File | What |
|------|------|
| `ai/product/product-ideas/lesa-app-remote-biometrics.md` | Lesa app: remote biometrics for agent computers |
| `ai/product/bugs/2026-03-13--plaintext-sa-token-on-disk.md` | Plaintext SA token bug report |

## Status

- Code deployed and running (cleanup already executed)
- Not yet committed / PR'd / released
- Needs: branch, commit, PR, merge, `wip-release patch`

## 0.7.16 (2026-03-13)

# Dev Update: Orphan Cleanup, DELETE Trigger, Doctor Fix

**Date:** 2026-03-13
**Author:** CC-Mini
**Session:** memory-db-fix

---

## What Happened

Parker ran the Memory Crystal install prompt and `crystal doctor` reported "Embeddings: FAILING ... no provider configured in env." Investigation revealed two separate issues:

### Issue 1: Doctor False Positive

`checkEmbeddingProvider()` in `doctor.ts` only checked `process.env.OPENAI_API_KEY`. But the cron job and hooks resolve the key from 1Password via the SA token at `~/.openclaw/secrets/op-sa-token`. The doctor didn't know about this path.

**Fix:** Added `checkOpEmbeddings()` helper to `doctor.ts` that checks for the SA token file, then does a live `op read` to verify it works. Doctor now reports `ok: openai (via 1Password)` instead of `fail`.

### Issue 2: Orphaned Vectors and FTS Entries

On 2026-03-11, 141,652 bulk file-scan chunks were correctly deleted from the `chunks` table. Parker said: "Why are we indexing documents?" These were raw file scans (Python venv packages, TypeScript source, vendor code) with no conversational context.

The deletion used raw SQL (`DELETE FROM chunks WHERE agent_id = 'system'`). But Memory Crystal had no DELETE trigger. The corresponding entries in `chunks_vec` (sqlite-vec) and `chunks_fts` (FTS5) were left orphaned.

**Impact:**
- 141,651 orphaned vectors (~875 MB)
- 141,652 orphaned FTS entries
- ~7% of search queries hit phantom results (silently filtered out)
- Database: 1.96 GB (should have been ~1 GB)

**Fix (three parts):**

1. **DELETE trigger** added to `initChunksTables()` in `core.ts`:
```sql
CREATE TRIGGER IF NOT EXISTS chunks_cleanup AFTER DELETE ON chunks
BEGIN
  DELETE FROM chunks_vec WHERE chunk_id = OLD.id;
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES('delete', OLD.id, OLD.text);
END;
```

2. **`cleanOrphans()` method** added to Crystal class in `core.ts`. Counts orphaned vec/FTS entries, deletes vec orphans in batches of 1000, rebuilds FTS5 from scratch.

3. **`crystal cleanup` CLI command** added to `cli.ts`. Handles the full workflow: backup, pause cron, clean orphans, VACUUM, resume cron. Supports `--dry-run`.

**Cleanup results:**
- 141,651 orphaned vectors removed
- FTS rebuilt from 73,813 chunks in 5.7s
- Database: 1.96 GB -> 1.45 GB (525 MB saved)
- Verification: chunks = FTS entries = 73,813. Match: YES
- Zero orphans remaining

### Side Discovery: Plaintext SA Token

During investigation, discovered that `~/.openclaw/secrets/op-sa-token` is a plaintext 1Password SA token readable by any process running as `lesa`. This is the bootstrap credential that unlocks all secrets. Bug report filed. Long-term fix: Lesa iOS app with remote biometrics (product doc written).

### Product Rule Established

Memory Crystal indexes conversations only. File content that appears in conversation turns (agent reads a file, discusses it) is captured as part of the conversation. Raw directory scanning without conversational context is not what Memory Crystal is for.

## Files Changed

| File | Change |
|------|--------|
| `src/core.ts` | Added `chunks_cleanup` DELETE trigger, `cleanOrphans()` method |
| `src/cli.ts` | Added `crystal cleanup` command, updated imports and USAGE |
| `src/doctor.ts` | Added `checkOpEmbeddings()` for 1Password detection |
| `ai/product/bugs/2026-03-13--orphaned-vectors-and-fts-after-bulk-delete.md` | Bug report |

## Related (wip-secrets-ios-private)

| File | What |
|------|------|
| `ai/product/product-ideas/lesa-app-remote-biometrics.md` | Lesa app: remote biometrics for agent computers |
| `ai/product/bugs/2026-03-13--plaintext-sa-token-on-disk.md` | Plaintext SA token bug report |

## Status

- Code deployed and running (cleanup already executed)
- Not yet committed / PR'd / released
- Needs: branch, commit, PR, merge, `wip-release patch`

## 0.7.15 (2026-03-13)

# Dev Update: Orphan Cleanup, DELETE Trigger, Doctor Fix

**Date:** 2026-03-13
**Author:** CC-Mini
**Session:** memory-db-fix

---

## What Happened

Parker ran the Memory Crystal install prompt and `crystal doctor` reported "Embeddings: FAILING ... no provider configured in env." Investigation revealed two separate issues:

### Issue 1: Doctor False Positive

`checkEmbeddingProvider()` in `doctor.ts` only checked `process.env.OPENAI_API_KEY`. But the cron job and hooks resolve the key from 1Password via the SA token at `~/.openclaw/secrets/op-sa-token`. The doctor didn't know about this path.

**Fix:** Added `checkOpEmbeddings()` helper to `doctor.ts` that checks for the SA token file, then does a live `op read` to verify it works. Doctor now reports `ok: openai (via 1Password)` instead of `fail`.

### Issue 2: Orphaned Vectors and FTS Entries

On 2026-03-11, 141,652 bulk file-scan chunks were correctly deleted from the `chunks` table. Parker said: "Why are we indexing documents?" These were raw file scans (Python venv packages, TypeScript source, vendor code) with no conversational context.

The deletion used raw SQL (`DELETE FROM chunks WHERE agent_id = 'system'`). But Memory Crystal had no DELETE trigger. The corresponding entries in `chunks_vec` (sqlite-vec) and `chunks_fts` (FTS5) were left orphaned.

**Impact:**
- 141,651 orphaned vectors (~875 MB)
- 141,652 orphaned FTS entries
- ~7% of search queries hit phantom results (silently filtered out)
- Database: 1.96 GB (should have been ~1 GB)

**Fix (three parts):**

1. **DELETE trigger** added to `initChunksTables()` in `core.ts`:
```sql
CREATE TRIGGER IF NOT EXISTS chunks_cleanup AFTER DELETE ON chunks
BEGIN
  DELETE FROM chunks_vec WHERE chunk_id = OLD.id;
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES('delete', OLD.id, OLD.text);
END;
```

2. **`cleanOrphans()` method** added to Crystal class in `core.ts`. Counts orphaned vec/FTS entries, deletes vec orphans in batches of 1000, rebuilds FTS5 from scratch.

3. **`crystal cleanup` CLI command** added to `cli.ts`. Handles the full workflow: backup, pause cron, clean orphans, VACUUM, resume cron. Supports `--dry-run`.

**Cleanup results:**
- 141,651 orphaned vectors removed
- FTS rebuilt from 73,813 chunks in 5.7s
- Database: 1.96 GB -> 1.45 GB (525 MB saved)
- Verification: chunks = FTS entries = 73,813. Match: YES
- Zero orphans remaining

### Side Discovery: Plaintext SA Token

During investigation, discovered that `~/.openclaw/secrets/op-sa-token` is a plaintext 1Password SA token readable by any process running as `lesa`. This is the bootstrap credential that unlocks all secrets. Bug report filed. Long-term fix: Lesa iOS app with remote biometrics (product doc written).

### Product Rule Established

Memory Crystal indexes conversations only. File content that appears in conversation turns (agent reads a file, discusses it) is captured as part of the conversation. Raw directory scanning without conversational context is not what Memory Crystal is for.

## Files Changed

| File | Change |
|------|--------|
| `src/core.ts` | Added `chunks_cleanup` DELETE trigger, `cleanOrphans()` method |
| `src/cli.ts` | Added `crystal cleanup` command, updated imports and USAGE |
| `src/doctor.ts` | Added `checkOpEmbeddings()` for 1Password detection |
| `ai/product/bugs/2026-03-13--orphaned-vectors-and-fts-after-bulk-delete.md` | Bug report |

## Related (wip-secrets-ios-private)

| File | What |
|------|------|
| `ai/product/product-ideas/lesa-app-remote-biometrics.md` | Lesa app: remote biometrics for agent computers |
| `ai/product/bugs/2026-03-13--plaintext-sa-token-on-disk.md` | Plaintext SA token bug report |

## Status

- Code deployed and running (cleanup already executed)
- Not yet committed / PR'd / released
- Needs: branch, commit, PR, merge, `wip-release patch`

## 0.7.14 (2026-03-13)

# Dev Update: Orphan Cleanup, DELETE Trigger, Doctor Fix

**Date:** 2026-03-13
**Author:** CC-Mini
**Session:** memory-db-fix

---

## What Happened

Parker ran the Memory Crystal install prompt and `crystal doctor` reported "Embeddings: FAILING ... no provider configured in env." Investigation revealed two separate issues:

### Issue 1: Doctor False Positive

`checkEmbeddingProvider()` in `doctor.ts` only checked `process.env.OPENAI_API_KEY`. But the cron job and hooks resolve the key from 1Password via the SA token at `~/.openclaw/secrets/op-sa-token`. The doctor didn't know about this path.

**Fix:** Added `checkOpEmbeddings()` helper to `doctor.ts` that checks for the SA token file, then does a live `op read` to verify it works. Doctor now reports `ok: openai (via 1Password)` instead of `fail`.

### Issue 2: Orphaned Vectors and FTS Entries

On 2026-03-11, 141,652 bulk file-scan chunks were correctly deleted from the `chunks` table. Parker said: "Why are we indexing documents?" These were raw file scans (Python venv packages, TypeScript source, vendor code) with no conversational context.

The deletion used raw SQL (`DELETE FROM chunks WHERE agent_id = 'system'`). But Memory Crystal had no DELETE trigger. The corresponding entries in `chunks_vec` (sqlite-vec) and `chunks_fts` (FTS5) were left orphaned.

**Impact:**
- 141,651 orphaned vectors (~875 MB)
- 141,652 orphaned FTS entries
- ~7% of search queries hit phantom results (silently filtered out)
- Database: 1.96 GB (should have been ~1 GB)

**Fix (three parts):**

1. **DELETE trigger** added to `initChunksTables()` in `core.ts`:
```sql
CREATE TRIGGER IF NOT EXISTS chunks_cleanup AFTER DELETE ON chunks
BEGIN
  DELETE FROM chunks_vec WHERE chunk_id = OLD.id;
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES('delete', OLD.id, OLD.text);
END;
```

2. **`cleanOrphans()` method** added to Crystal class in `core.ts`. Counts orphaned vec/FTS entries, deletes vec orphans in batches of 1000, rebuilds FTS5 from scratch.

3. **`crystal cleanup` CLI command** added to `cli.ts`. Handles the full workflow: backup, pause cron, clean orphans, VACUUM, resume cron. Supports `--dry-run`.

**Cleanup results:**
- 141,651 orphaned vectors removed
- FTS rebuilt from 73,813 chunks in 5.7s
- Database: 1.96 GB -> 1.45 GB (525 MB saved)
- Verification: chunks = FTS entries = 73,813. Match: YES
- Zero orphans remaining

### Side Discovery: Plaintext SA Token

During investigation, discovered that `~/.openclaw/secrets/op-sa-token` is a plaintext 1Password SA token readable by any process running as `lesa`. This is the bootstrap credential that unlocks all secrets. Bug report filed. Long-term fix: Lesa iOS app with remote biometrics (product doc written).

### Product Rule Established

Memory Crystal indexes conversations only. File content that appears in conversation turns (agent reads a file, discusses it) is captured as part of the conversation. Raw directory scanning without conversational context is not what Memory Crystal is for.

## Files Changed

| File | Change |
|------|--------|
| `src/core.ts` | Added `chunks_cleanup` DELETE trigger, `cleanOrphans()` method |
| `src/cli.ts` | Added `crystal cleanup` command, updated imports and USAGE |
| `src/doctor.ts` | Added `checkOpEmbeddings()` for 1Password detection |
| `ai/product/bugs/2026-03-13--orphaned-vectors-and-fts-after-bulk-delete.md` | Bug report |

## Related (wip-secrets-ios-private)

| File | What |
|------|------|
| `ai/product/product-ideas/lesa-app-remote-biometrics.md` | Lesa app: remote biometrics for agent computers |
| `ai/product/bugs/2026-03-13--plaintext-sa-token-on-disk.md` | Plaintext SA token bug report |

## Status

- Code deployed and running (cleanup already executed)
- Not yet committed / PR'd / released
- Needs: branch, commit, PR, merge, `wip-release patch`

## 0.7.13 (2026-03-13)

# Dev Update: Orphan Cleanup, DELETE Trigger, Doctor Fix

**Date:** 2026-03-13
**Author:** CC-Mini
**Session:** memory-db-fix

---

## What Happened

Parker ran the Memory Crystal install prompt and `crystal doctor` reported "Embeddings: FAILING ... no provider configured in env." Investigation revealed two separate issues:

### Issue 1: Doctor False Positive

`checkEmbeddingProvider()` in `doctor.ts` only checked `process.env.OPENAI_API_KEY`. But the cron job and hooks resolve the key from 1Password via the SA token at `~/.openclaw/secrets/op-sa-token`. The doctor didn't know about this path.

**Fix:** Added `checkOpEmbeddings()` helper to `doctor.ts` that checks for the SA token file, then does a live `op read` to verify it works. Doctor now reports `ok: openai (via 1Password)` instead of `fail`.

### Issue 2: Orphaned Vectors and FTS Entries

On 2026-03-11, 141,652 bulk file-scan chunks were correctly deleted from the `chunks` table. Parker said: "Why are we indexing documents?" These were raw file scans (Python venv packages, TypeScript source, vendor code) with no conversational context.

The deletion used raw SQL (`DELETE FROM chunks WHERE agent_id = 'system'`). But Memory Crystal had no DELETE trigger. The corresponding entries in `chunks_vec` (sqlite-vec) and `chunks_fts` (FTS5) were left orphaned.

**Impact:**
- 141,651 orphaned vectors (~875 MB)
- 141,652 orphaned FTS entries
- ~7% of search queries hit phantom results (silently filtered out)
- Database: 1.96 GB (should have been ~1 GB)

**Fix (three parts):**

1. **DELETE trigger** added to `initChunksTables()` in `core.ts`:
```sql
CREATE TRIGGER IF NOT EXISTS chunks_cleanup AFTER DELETE ON chunks
BEGIN
  DELETE FROM chunks_vec WHERE chunk_id = OLD.id;
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES('delete', OLD.id, OLD.text);
END;
```

2. **`cleanOrphans()` method** added to Crystal class in `core.ts`. Counts orphaned vec/FTS entries, deletes vec orphans in batches of 1000, rebuilds FTS5 from scratch.

3. **`crystal cleanup` CLI command** added to `cli.ts`. Handles the full workflow: backup, pause cron, clean orphans, VACUUM, resume cron. Supports `--dry-run`.

**Cleanup results:**
- 141,651 orphaned vectors removed
- FTS rebuilt from 73,813 chunks in 5.7s
- Database: 1.96 GB -> 1.45 GB (525 MB saved)
- Verification: chunks = FTS entries = 73,813. Match: YES
- Zero orphans remaining

### Side Discovery: Plaintext SA Token

During investigation, discovered that `~/.openclaw/secrets/op-sa-token` is a plaintext 1Password SA token readable by any process running as `lesa`. This is the bootstrap credential that unlocks all secrets. Bug report filed. Long-term fix: Lesa iOS app with remote biometrics (product doc written).

### Product Rule Established

Memory Crystal indexes conversations only. File content that appears in conversation turns (agent reads a file, discusses it) is captured as part of the conversation. Raw directory scanning without conversational context is not what Memory Crystal is for.

## Files Changed

| File | Change |
|------|--------|
| `src/core.ts` | Added `chunks_cleanup` DELETE trigger, `cleanOrphans()` method |
| `src/cli.ts` | Added `crystal cleanup` command, updated imports and USAGE |
| `src/doctor.ts` | Added `checkOpEmbeddings()` for 1Password detection |
| `ai/product/bugs/2026-03-13--orphaned-vectors-and-fts-after-bulk-delete.md` | Bug report |

## Related (wip-secrets-ios-private)

| File | What |
|------|------|
| `ai/product/product-ideas/lesa-app-remote-biometrics.md` | Lesa app: remote biometrics for agent computers |
| `ai/product/bugs/2026-03-13--plaintext-sa-token-on-disk.md` | Plaintext SA token bug report |

## Status

- Code deployed and running (cleanup already executed)
- Not yet committed / PR'd / released
- Needs: branch, commit, PR, merge, `wip-release patch`

## 0.7.12 (2026-03-13)

# Dev Update: Orphan Cleanup, DELETE Trigger, Doctor Fix

**Date:** 2026-03-13
**Author:** CC-Mini
**Session:** memory-db-fix

---

## What Happened

Parker ran the Memory Crystal install prompt and `crystal doctor` reported "Embeddings: FAILING ... no provider configured in env." Investigation revealed two separate issues:

### Issue 1: Doctor False Positive

`checkEmbeddingProvider()` in `doctor.ts` only checked `process.env.OPENAI_API_KEY`. But the cron job and hooks resolve the key from 1Password via the SA token at `~/.openclaw/secrets/op-sa-token`. The doctor didn't know about this path.

**Fix:** Added `checkOpEmbeddings()` helper to `doctor.ts` that checks for the SA token file, then does a live `op read` to verify it works. Doctor now reports `ok: openai (via 1Password)` instead of `fail`.

### Issue 2: Orphaned Vectors and FTS Entries

On 2026-03-11, 141,652 bulk file-scan chunks were correctly deleted from the `chunks` table. Parker said: "Why are we indexing documents?" These were raw file scans (Python venv packages, TypeScript source, vendor code) with no conversational context.

The deletion used raw SQL (`DELETE FROM chunks WHERE agent_id = 'system'`). But Memory Crystal had no DELETE trigger. The corresponding entries in `chunks_vec` (sqlite-vec) and `chunks_fts` (FTS5) were left orphaned.

**Impact:**
- 141,651 orphaned vectors (~875 MB)
- 141,652 orphaned FTS entries
- ~7% of search queries hit phantom results (silently filtered out)
- Database: 1.96 GB (should have been ~1 GB)

**Fix (three parts):**

1. **DELETE trigger** added to `initChunksTables()` in `core.ts`:
```sql
CREATE TRIGGER IF NOT EXISTS chunks_cleanup AFTER DELETE ON chunks
BEGIN
  DELETE FROM chunks_vec WHERE chunk_id = OLD.id;
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES('delete', OLD.id, OLD.text);
END;
```

2. **`cleanOrphans()` method** added to Crystal class in `core.ts`. Counts orphaned vec/FTS entries, deletes vec orphans in batches of 1000, rebuilds FTS5 from scratch.

3. **`crystal cleanup` CLI command** added to `cli.ts`. Handles the full workflow: backup, pause cron, clean orphans, VACUUM, resume cron. Supports `--dry-run`.

**Cleanup results:**
- 141,651 orphaned vectors removed
- FTS rebuilt from 73,813 chunks in 5.7s
- Database: 1.96 GB -> 1.45 GB (525 MB saved)
- Verification: chunks = FTS entries = 73,813. Match: YES
- Zero orphans remaining

### Side Discovery: Plaintext SA Token

During investigation, discovered that `~/.openclaw/secrets/op-sa-token` is a plaintext 1Password SA token readable by any process running as `lesa`. This is the bootstrap credential that unlocks all secrets. Bug report filed. Long-term fix: Lesa iOS app with remote biometrics (product doc written).

### Product Rule Established

Memory Crystal indexes conversations only. File content that appears in conversation turns (agent reads a file, discusses it) is captured as part of the conversation. Raw directory scanning without conversational context is not what Memory Crystal is for.

## Files Changed

| File | Change |
|------|--------|
| `src/core.ts` | Added `chunks_cleanup` DELETE trigger, `cleanOrphans()` method |
| `src/cli.ts` | Added `crystal cleanup` command, updated imports and USAGE |
| `src/doctor.ts` | Added `checkOpEmbeddings()` for 1Password detection |
| `ai/product/bugs/2026-03-13--orphaned-vectors-and-fts-after-bulk-delete.md` | Bug report |

## Related (wip-secrets-ios-private)

| File | What |
|------|------|
| `ai/product/product-ideas/lesa-app-remote-biometrics.md` | Lesa app: remote biometrics for agent computers |
| `ai/product/bugs/2026-03-13--plaintext-sa-token-on-disk.md` | Plaintext SA token bug report |

## Status

- Code deployed and running (cleanup already executed)
- Not yet committed / PR'd / released
- Needs: branch, commit, PR, merge, `wip-release patch`

## 0.7.11 (2026-03-13)

# Dev Update: Orphan Cleanup, DELETE Trigger, Doctor Fix

**Date:** 2026-03-13
**Author:** CC-Mini
**Session:** memory-db-fix

---

## What Happened

Parker ran the Memory Crystal install prompt and `crystal doctor` reported "Embeddings: FAILING ... no provider configured in env." Investigation revealed two separate issues:

### Issue 1: Doctor False Positive

`checkEmbeddingProvider()` in `doctor.ts` only checked `process.env.OPENAI_API_KEY`. But the cron job and hooks resolve the key from 1Password via the SA token at `~/.openclaw/secrets/op-sa-token`. The doctor didn't know about this path.

**Fix:** Added `checkOpEmbeddings()` helper to `doctor.ts` that checks for the SA token file, then does a live `op read` to verify it works. Doctor now reports `ok: openai (via 1Password)` instead of `fail`.

### Issue 2: Orphaned Vectors and FTS Entries

On 2026-03-11, 141,652 bulk file-scan chunks were correctly deleted from the `chunks` table. Parker said: "Why are we indexing documents?" These were raw file scans (Python venv packages, TypeScript source, vendor code) with no conversational context.

The deletion used raw SQL (`DELETE FROM chunks WHERE agent_id = 'system'`). But Memory Crystal had no DELETE trigger. The corresponding entries in `chunks_vec` (sqlite-vec) and `chunks_fts` (FTS5) were left orphaned.

**Impact:**
- 141,651 orphaned vectors (~875 MB)
- 141,652 orphaned FTS entries
- ~7% of search queries hit phantom results (silently filtered out)
- Database: 1.96 GB (should have been ~1 GB)

**Fix (three parts):**

1. **DELETE trigger** added to `initChunksTables()` in `core.ts`:
```sql
CREATE TRIGGER IF NOT EXISTS chunks_cleanup AFTER DELETE ON chunks
BEGIN
  DELETE FROM chunks_vec WHERE chunk_id = OLD.id;
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES('delete', OLD.id, OLD.text);
END;
```

2. **`cleanOrphans()` method** added to Crystal class in `core.ts`. Counts orphaned vec/FTS entries, deletes vec orphans in batches of 1000, rebuilds FTS5 from scratch.

3. **`crystal cleanup` CLI command** added to `cli.ts`. Handles the full workflow: backup, pause cron, clean orphans, VACUUM, resume cron. Supports `--dry-run`.

**Cleanup results:**
- 141,651 orphaned vectors removed
- FTS rebuilt from 73,813 chunks in 5.7s
- Database: 1.96 GB -> 1.45 GB (525 MB saved)
- Verification: chunks = FTS entries = 73,813. Match: YES
- Zero orphans remaining

### Side Discovery: Plaintext SA Token

During investigation, discovered that `~/.openclaw/secrets/op-sa-token` is a plaintext 1Password SA token readable by any process running as `lesa`. This is the bootstrap credential that unlocks all secrets. Bug report filed. Long-term fix: Lesa iOS app with remote biometrics (product doc written).

### Product Rule Established

Memory Crystal indexes conversations only. File content that appears in conversation turns (agent reads a file, discusses it) is captured as part of the conversation. Raw directory scanning without conversational context is not what Memory Crystal is for.

## Files Changed

| File | Change |
|------|--------|
| `src/core.ts` | Added `chunks_cleanup` DELETE trigger, `cleanOrphans()` method |
| `src/cli.ts` | Added `crystal cleanup` command, updated imports and USAGE |
| `src/doctor.ts` | Added `checkOpEmbeddings()` for 1Password detection |
| `ai/product/bugs/2026-03-13--orphaned-vectors-and-fts-after-bulk-delete.md` | Bug report |

## Related (wip-secrets-ios-private)

| File | What |
|------|------|
| `ai/product/product-ideas/lesa-app-remote-biometrics.md` | Lesa app: remote biometrics for agent computers |
| `ai/product/bugs/2026-03-13--plaintext-sa-token-on-disk.md` | Plaintext SA token bug report |

## Status

- Code deployed and running (cleanup already executed)
- Not yet committed / PR'd / released
- Needs: branch, commit, PR, merge, `wip-release patch`

## 0.7.10 (2026-03-13)

# Dev Update: Orphan Cleanup, DELETE Trigger, Doctor Fix

**Date:** 2026-03-13
**Author:** CC-Mini
**Session:** memory-db-fix

---

## What Happened

Parker ran the Memory Crystal install prompt and `crystal doctor` reported "Embeddings: FAILING ... no provider configured in env." Investigation revealed two separate issues:

### Issue 1: Doctor False Positive

`checkEmbeddingProvider()` in `doctor.ts` only checked `process.env.OPENAI_API_KEY`. But the cron job and hooks resolve the key from 1Password via the SA token at `~/.openclaw/secrets/op-sa-token`. The doctor didn't know about this path.

**Fix:** Added `checkOpEmbeddings()` helper to `doctor.ts` that checks for the SA token file, then does a live `op read` to verify it works. Doctor now reports `ok: openai (via 1Password)` instead of `fail`.

### Issue 2: Orphaned Vectors and FTS Entries

On 2026-03-11, 141,652 bulk file-scan chunks were correctly deleted from the `chunks` table. Parker said: "Why are we indexing documents?" These were raw file scans (Python venv packages, TypeScript source, vendor code) with no conversational context.

The deletion used raw SQL (`DELETE FROM chunks WHERE agent_id = 'system'`). But Memory Crystal had no DELETE trigger. The corresponding entries in `chunks_vec` (sqlite-vec) and `chunks_fts` (FTS5) were left orphaned.

**Impact:**
- 141,651 orphaned vectors (~875 MB)
- 141,652 orphaned FTS entries
- ~7% of search queries hit phantom results (silently filtered out)
- Database: 1.96 GB (should have been ~1 GB)

**Fix (three parts):**

1. **DELETE trigger** added to `initChunksTables()` in `core.ts`:
```sql
CREATE TRIGGER IF NOT EXISTS chunks_cleanup AFTER DELETE ON chunks
BEGIN
  DELETE FROM chunks_vec WHERE chunk_id = OLD.id;
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES('delete', OLD.id, OLD.text);
END;
```

2. **`cleanOrphans()` method** added to Crystal class in `core.ts`. Counts orphaned vec/FTS entries, deletes vec orphans in batches of 1000, rebuilds FTS5 from scratch.

3. **`crystal cleanup` CLI command** added to `cli.ts`. Handles the full workflow: backup, pause cron, clean orphans, VACUUM, resume cron. Supports `--dry-run`.

**Cleanup results:**
- 141,651 orphaned vectors removed
- FTS rebuilt from 73,813 chunks in 5.7s
- Database: 1.96 GB -> 1.45 GB (525 MB saved)
- Verification: chunks = FTS entries = 73,813. Match: YES
- Zero orphans remaining

### Side Discovery: Plaintext SA Token

During investigation, discovered that `~/.openclaw/secrets/op-sa-token` is a plaintext 1Password SA token readable by any process running as `lesa`. This is the bootstrap credential that unlocks all secrets. Bug report filed. Long-term fix: Lesa iOS app with remote biometrics (product doc written).

### Product Rule Established

Memory Crystal indexes conversations only. File content that appears in conversation turns (agent reads a file, discusses it) is captured as part of the conversation. Raw directory scanning without conversational context is not what Memory Crystal is for.

## Files Changed

| File | Change |
|------|--------|
| `src/core.ts` | Added `chunks_cleanup` DELETE trigger, `cleanOrphans()` method |
| `src/cli.ts` | Added `crystal cleanup` command, updated imports and USAGE |
| `src/doctor.ts` | Added `checkOpEmbeddings()` for 1Password detection |
| `ai/product/bugs/2026-03-13--orphaned-vectors-and-fts-after-bulk-delete.md` | Bug report |

## Related (wip-secrets-ios-private)

| File | What |
|------|------|
| `ai/product/product-ideas/lesa-app-remote-biometrics.md` | Lesa app: remote biometrics for agent computers |
| `ai/product/bugs/2026-03-13--plaintext-sa-token-on-disk.md` | Plaintext SA token bug report |

## Status

- Code deployed and running (cleanup already executed)
- Not yet committed / PR'd / released
- Needs: branch, commit, PR, merge, `wip-release patch`

## 0.7.9 (2026-03-13)

# Dev Update: Orphan Cleanup, DELETE Trigger, Doctor Fix

**Date:** 2026-03-13
**Author:** CC-Mini
**Session:** memory-db-fix

---

## What Happened

Parker ran the Memory Crystal install prompt and `crystal doctor` reported "Embeddings: FAILING ... no provider configured in env." Investigation revealed two separate issues:

### Issue 1: Doctor False Positive

`checkEmbeddingProvider()` in `doctor.ts` only checked `process.env.OPENAI_API_KEY`. But the cron job and hooks resolve the key from 1Password via the SA token at `~/.openclaw/secrets/op-sa-token`. The doctor didn't know about this path.

**Fix:** Added `checkOpEmbeddings()` helper to `doctor.ts` that checks for the SA token file, then does a live `op read` to verify it works. Doctor now reports `ok: openai (via 1Password)` instead of `fail`.

### Issue 2: Orphaned Vectors and FTS Entries

On 2026-03-11, 141,652 bulk file-scan chunks were correctly deleted from the `chunks` table. Parker said: "Why are we indexing documents?" These were raw file scans (Python venv packages, TypeScript source, vendor code) with no conversational context.

The deletion used raw SQL (`DELETE FROM chunks WHERE agent_id = 'system'`). But Memory Crystal had no DELETE trigger. The corresponding entries in `chunks_vec` (sqlite-vec) and `chunks_fts` (FTS5) were left orphaned.

**Impact:**
- 141,651 orphaned vectors (~875 MB)
- 141,652 orphaned FTS entries
- ~7% of search queries hit phantom results (silently filtered out)
- Database: 1.96 GB (should have been ~1 GB)

**Fix (three parts):**

1. **DELETE trigger** added to `initChunksTables()` in `core.ts`:
```sql
CREATE TRIGGER IF NOT EXISTS chunks_cleanup AFTER DELETE ON chunks
BEGIN
  DELETE FROM chunks_vec WHERE chunk_id = OLD.id;
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES('delete', OLD.id, OLD.text);
END;
```

2. **`cleanOrphans()` method** added to Crystal class in `core.ts`. Counts orphaned vec/FTS entries, deletes vec orphans in batches of 1000, rebuilds FTS5 from scratch.

3. **`crystal cleanup` CLI command** added to `cli.ts`. Handles the full workflow: backup, pause cron, clean orphans, VACUUM, resume cron. Supports `--dry-run`.

**Cleanup results:**
- 141,651 orphaned vectors removed
- FTS rebuilt from 73,813 chunks in 5.7s
- Database: 1.96 GB -> 1.45 GB (525 MB saved)
- Verification: chunks = FTS entries = 73,813. Match: YES
- Zero orphans remaining

### Side Discovery: Plaintext SA Token

During investigation, discovered that `~/.openclaw/secrets/op-sa-token` is a plaintext 1Password SA token readable by any process running as `lesa`. This is the bootstrap credential that unlocks all secrets. Bug report filed. Long-term fix: Lesa iOS app with remote biometrics (product doc written).

### Product Rule Established

Memory Crystal indexes conversations only. File content that appears in conversation turns (agent reads a file, discusses it) is captured as part of the conversation. Raw directory scanning without conversational context is not what Memory Crystal is for.

## Files Changed

| File | Change |
|------|--------|
| `src/core.ts` | Added `chunks_cleanup` DELETE trigger, `cleanOrphans()` method |
| `src/cli.ts` | Added `crystal cleanup` command, updated imports and USAGE |
| `src/doctor.ts` | Added `checkOpEmbeddings()` for 1Password detection |
| `ai/product/bugs/2026-03-13--orphaned-vectors-and-fts-after-bulk-delete.md` | Bug report |

## Related (wip-secrets-ios-private)

| File | What |
|------|------|
| `ai/product/product-ideas/lesa-app-remote-biometrics.md` | Lesa app: remote biometrics for agent computers |
| `ai/product/bugs/2026-03-13--plaintext-sa-token-on-disk.md` | Plaintext SA token bug report |

## Status

- Code deployed and running (cleanup already executed)
- Not yet committed / PR'd / released
- Needs: branch, commit, PR, merge, `wip-release patch`

## 0.7.8 (2026-03-13)

# Dev Update: Orphan Cleanup, DELETE Trigger, Doctor Fix

**Date:** 2026-03-13
**Author:** CC-Mini
**Session:** memory-db-fix

---

## What Happened

Parker ran the Memory Crystal install prompt and `crystal doctor` reported "Embeddings: FAILING ... no provider configured in env." Investigation revealed two separate issues:

### Issue 1: Doctor False Positive

`checkEmbeddingProvider()` in `doctor.ts` only checked `process.env.OPENAI_API_KEY`. But the cron job and hooks resolve the key from 1Password via the SA token at `~/.openclaw/secrets/op-sa-token`. The doctor didn't know about this path.

**Fix:** Added `checkOpEmbeddings()` helper to `doctor.ts` that checks for the SA token file, then does a live `op read` to verify it works. Doctor now reports `ok: openai (via 1Password)` instead of `fail`.

### Issue 2: Orphaned Vectors and FTS Entries

On 2026-03-11, 141,652 bulk file-scan chunks were correctly deleted from the `chunks` table. Parker said: "Why are we indexing documents?" These were raw file scans (Python venv packages, TypeScript source, vendor code) with no conversational context.

The deletion used raw SQL (`DELETE FROM chunks WHERE agent_id = 'system'`). But Memory Crystal had no DELETE trigger. The corresponding entries in `chunks_vec` (sqlite-vec) and `chunks_fts` (FTS5) were left orphaned.

**Impact:**
- 141,651 orphaned vectors (~875 MB)
- 141,652 orphaned FTS entries
- ~7% of search queries hit phantom results (silently filtered out)
- Database: 1.96 GB (should have been ~1 GB)

**Fix (three parts):**

1. **DELETE trigger** added to `initChunksTables()` in `core.ts`:
```sql
CREATE TRIGGER IF NOT EXISTS chunks_cleanup AFTER DELETE ON chunks
BEGIN
  DELETE FROM chunks_vec WHERE chunk_id = OLD.id;
  INSERT INTO chunks_fts(chunks_fts, rowid, text) VALUES('delete', OLD.id, OLD.text);
END;
```

2. **`cleanOrphans()` method** added to Crystal class in `core.ts`. Counts orphaned vec/FTS entries, deletes vec orphans in batches of 1000, rebuilds FTS5 from scratch.

3. **`crystal cleanup` CLI command** added to `cli.ts`. Handles the full workflow: backup, pause cron, clean orphans, VACUUM, resume cron. Supports `--dry-run`.

**Cleanup results:**
- 141,651 orphaned vectors removed
- FTS rebuilt from 73,813 chunks in 5.7s
- Database: 1.96 GB -> 1.45 GB (525 MB saved)
- Verification: chunks = FTS entries = 73,813. Match: YES
- Zero orphans remaining

### Side Discovery: Plaintext SA Token

During investigation, discovered that `~/.openclaw/secrets/op-sa-token` is a plaintext 1Password SA token readable by any process running as `lesa`. This is the bootstrap credential that unlocks all secrets. Bug report filed. Long-term fix: Lesa iOS app with remote biometrics (product doc written).

### Product Rule Established

Memory Crystal indexes conversations only. File content that appears in conversation turns (agent reads a file, discusses it) is captured as part of the conversation. Raw directory scanning without conversational context is not what Memory Crystal is for.

## Files Changed

| File | Change |
|------|--------|
| `src/core.ts` | Added `chunks_cleanup` DELETE trigger, `cleanOrphans()` method |
| `src/cli.ts` | Added `crystal cleanup` command, updated imports and USAGE |
| `src/doctor.ts` | Added `checkOpEmbeddings()` for 1Password detection |
| `ai/product/bugs/2026-03-13--orphaned-vectors-and-fts-after-bulk-delete.md` | Bug report |

## Related (wip-secrets-ios-private)

| File | What |
|------|------|
| `ai/product/product-ideas/lesa-app-remote-biometrics.md` | Lesa app: remote biometrics for agent computers |
| `ai/product/bugs/2026-03-13--plaintext-sa-token-on-disk.md` | Plaintext SA token bug report |

## Status

- Code deployed and running (cleanup already executed)
- Not yet committed / PR'd / released
- Needs: branch, commit, PR, merge, `wip-release patch`

## 0.7.7 (2026-03-13)

Update install prompt to new standard format. Replaces old 3-question prompt with 4 explain questions, installed check, and dry-run before install.

## 0.7.6 (2026-03-13)

Update LDM delegation tips

## 0.7.5 (2026-03-13)

# Release Notes: Memory Crystal v0.7.5

## LDM OS Integration

Memory Crystal now works with LDM OS when it's available.

### crystal init delegates to ldm install

When the `ldm` CLI exists on PATH, `crystal init` delegates generic deployment to it. LDM OS handles the scaffold, interface detection, and extension deployment. Memory Crystal keeps its own setup: database backup, role configuration, pairing, cron jobs.

When `ldm` isn't available, `crystal init` works standalone like it always has. No new dependencies. No breaking changes.

### LDM OS tip

After install completes, Memory Crystal prints a tip: "Run `ldm install` to see more skills you can add." Helps users discover the rest of the ecosystem.

### Part of LDM OS

README now includes a "Part of LDM OS" section linking back to the LDM OS repo. Memory Crystal installs into LDM OS, the local runtime for AI agents.

## 0.7.4 (2026-03-11)

MCP fix (OPENCLAW_HOME env var), AgentId reads from LDM config instead of hardcoding, MCP registrations moved to user-level, 33 stale branches renamed, QMD v1.1.6 analysis documented

## 0.7.3 (2026-03-10)

Fix MCP registration to include OPENCLAW_HOME env var for memory-crystal MCP server

## 0.7.2 (2026-03-05)

Fix MCP detection in doctor and installer to check project-level and user-scope registrations

## 0.7.1 (2026-03-05)

Database backup, verification, and import in installer

## 0.7.0 (2026-03-05)

Delta sync, file sync, intelligent install & update

## 0.6.1 (2026-03-05)

Search quality: deep search with LLM query expansion + re-ranking, MCP sampling design, updated docs

## 0.6.0 (2026-03-04)

Dream Weaver integration, Crystal Core gateway, staging pipeline, commands channel.

- Dream Weaver narrative consolidation via `crystal dream-weave` (imports engine from dream-weaver-protocol)
- Crystal Core gateway (`crystal serve`) on localhost:18790, OpenAI-compatible endpoint
- Staging pipeline for new agents from relay (auto-detect, stage, backfill, dream-weave)
- Commands channel on relay Worker (nodes send commands to Core, Core sends results back)
- OpenClaw raw data sync to LDM after every agent_end turn (sessions, workspace, daily logs)
- Relay command support in cc-hook.ts (`sendCommand()` export)
- Harness-aware init flow (OpenClaw vs Claude Code, Core vs Node)
- Poller now detects new agents and routes to staging before live ingest

## 0.5.0 (2026-03-04)

Init discovery, bulk copy, OpenClaw parser, backfill, CE migration. Reorganize ai/ to ai/product/.

- `crystal init` discovers session files on the current machine (Claude Code + OpenClaw)
- `crystal backfill` embeds raw transcript files from LDM (Core: local embed, Node: relay to Core)
- `crystal migrate-embeddings` migrates context-embeddings.sqlite chunks into crystal.db ($0, copies embeddings directly)
- `src/discover.ts` auto-detects installed harnesses and session file locations
- `src/bulk-copy.ts` copies raw files to LDM transcripts (idempotent, skip if same size)
- `src/oc-backfill.ts` parses OpenClaw JSONL format into standard message format
- Workspace path added to LDM (`~/.ldm/agents/{id}/memory/workspace/`)



## 0.4.1 (2026-03-03)

Crystal Core/Node architecture, crystal doctor, crystal backup, crystal bridge, SKILL.md onboarding rewrite

## 0.3.3 (2026-03-02)

Fix bin entries: crystal and crystal-mcp commands were missing from v0.3.2 due to npm stripping ./ prefix paths

## 0.3.2 (2026-03-02)

Rewrite SKILL.md as complete agent install guide. Add crystal-mcp binary for clean MCP config. CLI search output matches MCP server (freshness icons, numbered results). Agents can now auto-detect and install for Claude Code CLI, Claude Desktop, and OpenClaw.

## 0.3.1 (2026-03-02)

Fix npm package: exclude ai/ folder from published tarball

## 0.3.0 (2026-03-02)

Phase 1 continuous capture, Cloud MCP server, QR pairing, crystal init, docs overhaul

## 0.2.0 (2026-02-28)

README overhaul, relay encryption, QR pairing spec, Grok/Lesa feedback, disable auto dev-updates
