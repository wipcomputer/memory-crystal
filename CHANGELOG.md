# Changelog





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
