---
name: memory
description: Search and manage the shared memory crystal. Use when user says "do you remember", "search memory", "remember this", "forget that", "memory status", "what do you know about", or needs to recall past discussions, store facts, or check what's in memory.
version: 0.4.0
---

# Memory Crystal

All your AIs share one memory. Searchable, private, sovereign. Every conversation you have with any AI gets captured, embedded, and made searchable. Facts, preferences, and decisions persist across sessions and across tools.

## What it does

1. **Captures** every conversation automatically (cron job, every minute)
2. **Embeds** conversation chunks for semantic search (OpenAI, Ollama, or Google embeddings)
3. **Searches** across all your AI conversations with ranked, recency-weighted results
4. **Stores** facts, preferences, and decisions you want to keep permanently
5. **Works across** Claude Code CLI, Claude Desktop, OpenClaw, and any MCP-compatible client

## What changes for the user

After install, the AI remembers everything. Past conversations are searchable. Important facts persist. The user never has to re-explain context. Every AI tool they use shares the same memory.

---

## Install

**You are an AI agent helping a user install Memory Crystal. Walk them through the process step by step. Ask questions, explain what you're doing, and let them make choices.**

### Question 1: Developer or end user?

Ask the user:

> "Are you installing this as a developer, or do you just want it to work?"

**Developer path:**
- Fork the repo so they can contribute back
- Clone locally, build from source
- They end up with `crystal` and `crystal-mcp` on PATH via `npm link`

```bash
git clone https://github.com/<their-fork>/memory-crystal.git
cd memory-crystal
npm install
npm run build
npm link
```

**End user path:**
- One command, done

```bash
npm install -g memory-crystal
```

If npm is not available, check if the user has Node.js installed (`node --version`). They need Node.js 20+. If not installed, tell them to install it from https://nodejs.org first.

Both paths end with `crystal` and `crystal-mcp` on PATH.

### Question 2: First install or adding a device?

Ask the user:

> "Is this your first time installing Memory Crystal, or do you already have it on another machine?"

**First install:** Full setup. This machine becomes the source of truth. Continue to Step 1.

**Adding a device:** They already have a Crystal Core somewhere. Skip to "Adding a Device" below.

### Transparency: Tell the user what's about to happen

Before installing, explain exactly what will be created:

> "Here's what Memory Crystal will set up on your machine:
>
> - `~/.ldm/` ... a hidden folder in your home directory. This is where everything lives.
> - `~/.ldm/memory/crystal.db` ... your memory database. All conversations, all memories.
> - `~/.ldm/agents/` ... per-agent data (transcripts, daily logs, sessions)
> - `~/.ldm/bin/crystal-capture.sh` ... a script that captures conversations every minute via cron
> - `~/.ldm/bin/ldm-backup.sh` ... a backup script (optional daily schedule)
>
> Nothing gets installed outside this folder. Nothing phones home. Want me to go ahead?"

### Step 1: Initialize

```bash
crystal init
```

This scaffolds `~/.ldm/`, deploys the capture and backup scripts, and installs a cron job. Safe to run multiple times.

**Core recommendation:** If this machine is always on (desktop, server, Mac mini), it should be your Crystal Core. The Core is the master memory. It does all embeddings and is the source of truth. If you're on a laptop, you can still install standalone. But when you're ready, you'll want a Core running on something permanent.

### Step 2: Set up embeddings

Memory Crystal needs an embedding provider to make conversations searchable. Check if the user already has one:

```bash
echo $OPENAI_API_KEY
```

If that returns a key, skip to Step 3.

If not, ask the user which provider they want:

**Option A: OpenAI (recommended, requires API key)**
Tell the user to add this to their shell profile (`~/.zshrc` or `~/.bashrc`):
```bash
export OPENAI_API_KEY="sk-..."
```
They get the key from https://platform.openai.com/api-keys

**Option B: Ollama (free, local, no API key needed)**
```bash
ollama --version
# If not installed: https://ollama.com
ollama pull nomic-embed-text
```
Then add to shell profile:
```bash
export CRYSTAL_EMBEDDING_PROVIDER=ollama
```

**Option C: Google**
```bash
export CRYSTAL_EMBEDDING_PROVIDER=google
export GOOGLE_API_KEY="..."
```

### Step 3: Connect to your AI

**Detect what the user is running and install for ALL of them.** Check for each:

#### Claude Code CLI

If the user is talking to you through Claude Code CLI (you are running as `claude`), install the MCP server:

```bash
claude mcp add --scope user memory-crystal -- crystal-mcp
```

Then restart Claude Code (the user needs to exit and re-open, or run `/mcp` to reconnect).

After restart, you will have these tools: `crystal_search`, `crystal_remember`, `crystal_forget`, `crystal_status`.

#### Claude Desktop (macOS app)

Check if Claude Desktop is installed:

```bash
ls ~/Library/Application\ Support/Claude/claude_desktop_config.json 2>/dev/null
```

If it exists, read the file and add the memory-crystal MCP server to it:

```json
{
  "mcpServers": {
    "memory-crystal": {
      "command": "crystal-mcp"
    }
  }
}
```

Merge this into the existing config (don't overwrite other servers). Tell the user to restart Claude Desktop.

#### OpenClaw

Check if OpenClaw is installed:

```bash
which openclaw 2>/dev/null || ls ~/.openclaw/openclaw.json 2>/dev/null
```

If OpenClaw is present, install Memory Crystal as a plugin:

```bash
openclaw plugins install memory-crystal
openclaw gateway restart
```

**Important: if you detect multiple runtimes, install for ALL of them.** They share the same database. Tell the user: "I found Claude Code and OpenClaw on your system. I'm installing Memory Crystal for both so all your AIs share the same memory."

### Step 4: Bridge (AI-to-AI Communication)

Memory Crystal includes Bridge, which lets your AIs talk to each other. Install it:

```bash
crystal bridge setup
```

If Bridge isn't installed yet:

```bash
npm install -g lesa-bridge
crystal bridge setup
```

This registers the Bridge MCP server. Your AIs can now send messages to each other and search each other's conversations.

### Step 5: Backups (optional)

Offer to set up automated backups:

> "Want me to set up daily backups of your memory? I'll install a backup that runs at 3 AM and keeps the last 7 copies."

```bash
crystal backup setup
```

The backup destination defaults to `~/.ldm/backups/`. The user can change this by setting `LDM_BACKUP_DIR` in their shell profile to wherever they trust: iCloud Drive, an external drive, Dropbox, etc.

**If the Core is on a laptop:** Strongly recommend backups. Laptops get lost, stolen, spilled on. The Core is the source of truth. Back it up.

### Step 6: Verify

Run `crystal doctor` to check that everything is set up correctly:

```bash
crystal doctor
```

This shows the status of every component: database, embeddings, capture, relay, MCP, backup, bridge. If anything is wrong, it tells you how to fix it.

Then test search:

```bash
crystal search "test"
```

If that works, tell the user: "Memory Crystal is installed. From now on, I can search our past conversations, remember important things, and share memory with your other AI tools. Try asking me 'do you remember what we talked about last week?'"

---

## Adding a Device

If the user already has a Crystal Core on another machine:

### Step 1: Install the package

Same as above (developer fork or `npm install -g memory-crystal`).

### Step 2: Initialize as a Node

```bash
crystal init --agent <name>
```

Use a descriptive agent name like `cc-air`, `cc-laptop`, etc.

### Step 3: Pair with the Core

On the Core machine:
```bash
crystal pair
```
This shows a QR code and a pairing string.

On this machine:
```bash
crystal pair --code mc1:...
```

Both machines now share the encryption key.

### Step 4: Configure relay

Ask the user: "Do you want to use the free WIP.computer relay, or set up your own?"

**Option A: WIP.computer relay (recommended)**
- Free during beta. Nothing to set up
- Your data is end-to-end encrypted. The relay is blind
- Set env vars:
```bash
export CRYSTAL_RELAY_URL=<provided-url>
export CRYSTAL_RELAY_TOKEN=<provided-token>
export CRYSTAL_AGENT_ID=<agent-name>
```

**Option B: Self-hosted relay (full sovereignty)**
- Deploy your own Cloudflare Worker + R2 bucket
- Requires a Cloudflare account (free tier works)
- Walk them through the setup in RELAY.md

### Step 5: Connect to AI + Bridge + Verify

Same as first install Steps 3-6 above.

### Step 6: Demote to Node

```bash
crystal demote
```

This machine is now a Crystal Node. Conversations are captured, encrypted, and relayed to the Core. The Core embeds everything and pushes a searchable mirror back.

---

## Role Management

Users can check and change roles at any time:

```bash
crystal role              # Show current role
crystal promote           # Make this device the Crystal Core
crystal demote            # Make this device a Crystal Node
```

If a user starts on a laptop and later gets a desktop, they can promote the desktop and demote the laptop. No data loss.

---

## Coming Back Later

Users can always come back and say:

> "Hey, can you check what Memory Crystal features I have installed and what I'm missing?"

Run:

```bash
crystal doctor
```

This shows the full state of the install: role, database, embeddings, capture, relay, MCP, backup, bridge. Each check shows OK, WARN, or FAIL with a suggested fix.

---

## Tools

Once installed, these tools are available to the AI:

### crystal_search

Search across all stored memory. Semantic search with recency-weighted results.

```
crystal_search query="how do plugins work" limit=5
crystal_search query="user preferences" agent_id="main"
```

Results are ranked by relevance and freshness, with color-coded freshness indicators:
- fresh (less than 3 days)
- recent (less than 7 days)
- aging (less than 14 days)
- stale (14+ days)

### crystal_remember

Store a fact or observation that persists across sessions.

```
crystal_remember text="User prefers Opus for complex tasks" category="preference"
crystal_remember text="API key rotated on 2026-03-01" category="event"
```

Categories: fact, preference, event, opinion, skill

### crystal_forget

Deprecate a stored memory by ID (marks as deprecated, doesn't delete).

```
crystal_forget id=42
```

### crystal_status

Check memory health: chunk count, agents, provider, data directory.

```
crystal_status
```

---

## Tips

- Search is semantic. "how do plugins work" finds conversations about plugin architecture even if those exact words weren't used.
- Store preferences and decisions as memories. They survive compaction and context limits.
- Use `agent_id` filter when you only want results from a specific agent.
- The cron job captures conversations every minute. No data loss even in long sessions.
- Available providers: openai (default), ollama (local, free), google.
- All runtimes (Claude Code, Claude Desktop, OpenClaw) share the same database at `~/.ldm/memory/crystal.db`.
- Run `crystal doctor` anytime to check what's installed and what's missing.
