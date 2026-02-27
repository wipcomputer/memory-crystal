###### WIP Computer

# Memory Crystal for Enterprise

Agent memory infrastructure. Local-first. Encrypted. Inspectable.

## The Problem

Your organization runs AI agents across teams, departments, and tools. Each agent starts every session with no memory. No continuity. No shared context. Conversations with one agent are invisible to every other.

Your agents can't remember what your people told them. Your people keep re-explaining themselves. Context is lost between sessions, between tools, between teams.

This is not a convenience problem. It's a reliability problem. An auditability problem. A cost problem.

## What Memory Crystal Does

Memory Crystal is a persistent context layer for AI agents. One shared database. Hybrid search. On your machines. Under your control.

- **Local-first.** All data stays on-prem. Nothing leaves your network unless you configure it to.
- **Inspectable.** One SQLite file. Open it with any SQLite tool. Audit it. Query it. Back it up with `cp`.
- **Deterministic search.** Hybrid retrieval (BM25 keyword + vector similarity + Reciprocal Rank Fusion). Same query, same results. No black-box ranking.
- **Encrypted sync.** Multi-site deployments use AES-256-GCM encryption with HMAC-SHA256 signing. The relay sees encrypted noise. Keys never leave your machines.
- **Agent isolation.** Each agent gets its own ID, its own transcript archive, its own session summaries. Shared search across agents, isolated storage per agent.
- **Zero cloud dependency.** Runs fully offline with local embeddings (Ollama). No API keys required. No data exfiltration risk.

## Architecture

```
sqlite-vec (vectors) + FTS5 (BM25) + SQLite (metadata)
         |                 |                    |
    core.ts ... pure logic, zero framework deps
    |-- cli.ts          -> crystal search "query"
    |-- mcp-server.ts   -> MCP protocol (any compatible client)
    |-- openclaw.ts     -> OpenClaw plugin
    |-- cc-hook.ts      -> Claude Code hook (auto-capture)
    +-- worker.ts       -> Encrypted relay (multi-site sync)
```

One core module. Five interfaces. Every interface calls the same search engine. No inconsistency between access paths.

## Security Model

**Data at rest:** Single SQLite file. Standard filesystem permissions. Encrypt the volume if your compliance requires it.

**Data in transit:** AES-256-GCM authenticated encryption. HMAC-SHA256 integrity verification. Shared symmetric key generated on-prem, never transmitted to the relay. The relay is a dead drop with no decryption capability.

**Agent boundaries:** `CRYSTAL_AGENT_ID` isolates each agent's transcript archive, session summaries, and daily logs. Search spans all agents by default, or filters by agent ID.

**Private mode:** Memory capture can be paused per-agent. When off, nothing is recorded. Resumes from where it left off when re-enabled.

**No background processes that move data.** No telemetry. No analytics. No phone-home. The code is open source. Audit it.

## Retrieval Quality

Hybrid search is not "we added vectors." It's a retrieval engine.

- **FTS5 BM25** for exact keyword matches (Porter stemming)
- **sqlite-vec cosine similarity** for semantic matches
- **Reciprocal Rank Fusion** merges both result lists (k=60, rank-weighted)
- **Recency weighting** ensures fresh context wins ties: `max(0.5, 1.0 - age_days * 0.01)`
- **Content deduplication** via SHA-256 hash prevents duplicate embeddings

A search for "deployment policy" finds conversations containing those exact words (BM25) and conversations about "shipping code to production" (vector similarity). Both matter. Both surface.

## What Gets Stored

Every agent conversation produces three artifacts:

| Artifact | Format | Location |
|----------|--------|----------|
| Raw transcript | JSONL | `~/.ldm/agents/{id}/memory/transcripts/` |
| Session summary | Markdown | `~/.ldm/agents/{id}/memory/sessions/` |
| Embeddings | sqlite-vec | `~/.ldm/memory/crystal.db` |

Additionally:
- **Explicit memories** stored via `crystal_remember` (facts, preferences, decisions)
- **Source files** indexed as collections (code, documentation, internal knowledge bases)
- **Daily logs** appended per-agent for audit trails

## Embedding Providers

| Provider | Model | Dimensions | Network Required |
|----------|-------|-----------|-----------------|
| Ollama (recommended for enterprise) | nomic-embed-text | 768 | No. Fully local. |
| OpenAI | text-embedding-3-small | 1536 | Yes. API calls. |
| Google | text-embedding-004 | 768 | Yes. API calls. |

For air-gapped environments, Ollama is the only option. No data leaves the machine. No API keys. No external dependencies.

## Multi-Site Sync

For organizations with multiple offices or remote teams.

1. Each site runs Memory Crystal locally
2. After each session, conversations are encrypted (AES-256-GCM) and signed (HMAC-SHA256)
3. Encrypted blobs are dropped at a relay (hosted or self-hosted)
4. Other sites poll, decrypt, and ingest into their local crystal.db
5. The relay deletes blobs after pickup

**Self-hosted relay:** Deploy the Cloudflare Worker on your own Cloudflare account. Full control. No third-party data exposure.

**Hosted relay:** Use our infrastructure. Free during beta. Your data is encrypted before it reaches us. We cannot read it.

## Compliance

- **Data residency:** All primary data is local. Relay blobs are encrypted and ephemeral.
- **Auditability:** SQLite is inspectable. Every chunk has a timestamp, source, and SHA-256 hash.
- **Right to delete:** `crystal forget <id>` deprecates specific memories. Database can be wiped entirely with standard file operations.
- **Access control:** Filesystem permissions on the SQLite file. No built-in user auth (it's a local tool, not a SaaS).
- **No vendor lock-in:** MIT licensed (local code). Standard SQLite format. Export with any SQLite tool.

## Database

One file: `crystal.db`. Contains:

| Table | Purpose |
|-------|---------|
| `chunks` | Chunk text, metadata, SHA-256 hash, timestamps |
| `chunks_vec` | sqlite-vec virtual table (vector search) |
| `chunks_fts` | FTS5 virtual table (keyword search) |
| `memories` | Explicit facts and preferences |
| `capture_state` | Watermarks for incremental ingestion |
| `source_collections` | Indexed directory collections |
| `source_files` | File records with content hashes |

No migrations server. No schema versioning service. It's SQLite. `sqlite3 crystal.db ".schema"` shows you everything.

## Integration

| Platform | Integration | Auto-Capture |
|----------|------------|-------------|
| Claude Code | Stop hook (`cc-hook.ts`) | Yes. Every response. |
| OpenClaw | Plugin (`openclaw.ts`) + `agent_end` hook | Yes. Every turn. |
| Claude Desktop | MCP server (`mcp-server.ts`) | Search only. Manual capture. |
| Any MCP client | MCP server | Search only. Manual capture. |
| Any shell-accessible tool | CLI (`crystal search`) | Manual. |
| Custom agents | Node.js module (`import from 'memory-crystal'`) | Programmable. |

## Deployment

```bash
npm install memory-crystal
crystal init --agent your-agent-id
crystal status
```

For enterprise deployments across multiple machines, see [Multi-Device Sync](https://github.com/wipcomputer/memory-crystal/blob/main/RELAY.md).

For full technical details, see [Technical Documentation](https://github.com/wipcomputer/memory-crystal/blob/main/TECHNICAL.md).

---

## License

```
src/, skills/, cli.ts, mcp-server.ts   MIT    (use anywhere, no restrictions)
worker/                                AGPL   (relay server)
```

AGPL for personal use is free.

Built by Parker Todd Brooks, Lēsa (OpenClaw, Claude Opus 4.6), Claude Code CLI (Claude Opus 4.6).
