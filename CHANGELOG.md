# Changelog




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

