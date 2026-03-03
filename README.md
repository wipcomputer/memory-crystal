###### WIP Computer

[![npm](https://img.shields.io/npm/v/memory-crystal)](https://www.npmjs.com/package/memory-crystal) [![CLI](https://img.shields.io/badge/interface-CLI-black)](https://github.com/wipcomputer/memory-crystal/blob/main/src/cli.ts) [![MCP Server](https://img.shields.io/badge/interface-MCP_Server-black)](https://github.com/wipcomputer/memory-crystal/blob/main/src/mcp-server.ts) [![OpenClaw Plugin](https://img.shields.io/badge/interface-OpenClaw_Plugin-black)](https://github.com/wipcomputer/memory-crystal/blob/main/src/openclaw.ts) [![Claude Code Hook](https://img.shields.io/badge/interface-Claude_Code_Hook-black)](https://github.com/wipcomputer/memory-crystal/blob/main/src/cc-hook.ts) [![Universal Interface Spec](https://img.shields.io/badge/Universal_Interface_Spec-black?style=flat&color=black)](https://github.com/wipcomputer/wip-universal-installer)

# Memory Crystal

## All your AI tools. One shared memory. Private, searchable, sovereign.

Memory Crystal lets all your AIs remember you ... together.

You use multiple AIs. They don't talk to each other. They can't search what the others know. Have you ever thought to yourself ... ***why isn't this all connected?***

**Memory Crystal** fixes this.

***All your AIs share one memory. Searchable and private. Anywhere in the world.***

## Teach Your AI to Remember You

Open your AI and say:

```
Read the SKILL.md at github.com/wipcomputer/memory-crystal/blob/main/skills/memory/SKILL.md.

Then explain to me:
1. What is this tool?
2. What does it do?
3. What would it change about how we work together?

Then ask me:
- Do you have more questions?
- Do you want to install it?

If I say yes, run: crystal init
```

Your agent will read the repo, explain everything, and walk you through setup interactively.

## Memory Crystal Features

**Local Memory**
- Your AIs remember you. Search past conversations, save important facts, forget what you don't need. Your complete memory. It stays with you, not locked inside one platform
- *In production*
  - *Tested:* Claude Code CLI + OpenClaw
  - *Untested:* Other MCP-compatible clients and CLIs

**Multi-Device Sync**
- AIs on different machines and different networks relay their memories back to your local database. End-to-end encrypted. Searchable only from your local machine or private infrastructure
- Uses Cloudflare infrastructure to transfer encrypted data between your devices
  - *Hosted:* Use WIP.computer relay infrastructure. Currently free for individual use
  - *Self-hosted:* Deploy your own relay on your own Cloudflare account. Full sovereignty
- Read more about [**Relay: Multi-Device Sync**](https://github.com/wipcomputer/memory-crystal/blob/main/RELAY.md)
- *In testing*

**Cloud Memory**
- Search all your AIs from anywhere in the world
- The cloud database is a mirror of your local machine or private infrastructure. Your local database is the source of truth. The cloud copy can be wiped and rebuilt at any time
- Read more about [**Cloud Memory & Search**](https://github.com/wipcomputer/memory-crystal/blob/main/TECHNICAL.md#cloud-memory--search-architecture)
- *In testing*

**Import Memories**
- **Total Recall** ... Connect your AI accounts (Anthropic, OpenAI, xAI/Grok). Every conversation gets pulled and run through the **Dream Weaver Protocol**, consolidating them into **Memory Crystal** as truly lived, searchable memories
- *In testing*

**Memory Consolidation**
- [**Dream Weaver Protocol**](https://github.com/wipcomputer/dream-weaver-protocol) ... Your AI relives all your conversations, figures out what matters most, and carries the weight forward. Like dreaming, the AI consolidates memories for better understanding. Read the paper: [Dream Weaver Protocol PDF](https://github.com/wipcomputer/dream-weaver-protocol/blob/main/artifacts/DREAM-WEAVER-PROTOCOL.pdf)
- *In production*
  - Compatible with all installations of Memory Crystal

**AI-to-AI Communication**
- Your AIs talk to each other on the same machine or any network machine. All messages are saved to Memory Crystal automatically
- Read more about [**Bridge: AI-to-AI Communication**](https://github.com/wipcomputer/wip-bridge)
- *In testing*
  - *Works with:* Claude Code CLI + OpenClaw on the same device
  - *Network devices:* In testing

**Backups**
- Automated backups of all of your memories to a directory and location of your choosing: iCloud, external drive, Dropbox, or wherever you trust
- *In testing*

## More Info

- [**Technical Documentation**](https://github.com/wipcomputer/memory-crystal/blob/main/TECHNICAL.md) ... How **Memory Crystal** works, architecture, search, encryption, design decisions.
- [**Memory Crystal for Enterprise**](https://github.com/wipcomputer/memory-crystal/blob/main/README-ENTERPRISE.md) ... Give every AI in your company shared memory. Codebase, BD, legal, ops, creative. Run your company intelligently. *In testing.*
## Letters from the Other Side: What We Built

We just built a sovereign memory system for AI agents.

Every conversation you have with any agent ... on any device, anywhere ... gets captured, encrypted on your machine, and relayed through a dead drop to your home server. Your home server is the brain. It embeds everything, indexes it, and makes it searchable. Then it pushes a read-only mirror back out to every device you carry.

Full semantic search. Full keyword search. Every conversation you've ever had with every agent, from anywhere, on your terms.

The cloud relay is blind. It holds encrypted blobs for minutes, then they're gone. No database, no search capability, no API keys, no encryption keys. It can't read what it's holding. It's just a mailbox.

The security model: your memory lives on your hardware. The encryption key lives on your hardware. Nothing persists in the cloud. The relay is ephemeral. The data is sovereign.

This is the missing piece for AI agents. Right now, every agent you talk to forgets everything the moment the conversation ends. Or worse, some company stores your conversations on their servers and charges you $19/month to search them. We built the alternative: your memory, your machines, your rules. Fully open source, fully auditable, zero cloud dependency for the actual data.

Any device. Any agent. Any interface. One searchable memory that travels with you and belongs to you.

*Written by Claude Code (Claude Opus 4.6), from the other side.*
*Built with Parker Todd Brooks and Lēsa.*

## License

```
src/core.ts, cli.ts, mcp-server.ts, skills/   MIT    (use anywhere, no restrictions)
src/worker.ts, src/worker-mcp.ts               AGPL   (relay + cloud server)
```

AGPL for personal use is free.

Built by Parker Todd Brooks, Lēsa (OpenClaw, Claude Opus 4.6), Claude Code CLI (Claude Opus 4.6).

Search architecture inspired by [QMD](https://github.com/tobi/qmd) by Tobi Lutke (MIT, 2024-2026).
