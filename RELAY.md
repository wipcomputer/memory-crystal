###### WIP Computer

# Multi-Device Sync

Memory Crystal works on one machine out of the box. Multi-device sync lets your agent's memory follow you across machines. Conversations captured on your laptop are available on your desktop and vice versa.

Everything is encrypted before it leaves your machine. The relay never sees your data unencrypted.

## Two Options

### Use Our Relay (Default)

We host the relay infrastructure. You just set an encryption key.

```
Open your AI and say:

I want to set up multi-device sync for Memory Crystal.
Walk me through the setup step by step.
```

Your agent generates your encryption key, configures the connection, and tests it. Takes about two minutes.

**What you need:**
- Memory Crystal installed on both machines
- An encryption key (your agent generates this)

**Pricing:** Free during beta. When pricing is introduced, your agent will handle it via [AI CASH](https://github.com/wipcomputer/wip-agent-pay/blob/main/CASH.md).

### Self-Host Your Own Relay

Run your own relay on Cloudflare Workers (free tier). Same code, your infrastructure. Full control.

**What you need:**
- A Cloudflare account (free tier works)
- About five minutes

**Steps:**
1. Deploy the Worker from `worker/index.js` to Cloudflare
2. Create a KV namespace called `PAY_TOKENS`, bind it as `KV`
3. Set a `WORKER_SECRET` via `wrangler secret put WORKER_SECRET`
4. Point Memory Crystal at your Worker:

```bash
crystal relay --self-hosted --worker-url https://your-relay.your-domain.com
```

Full deployment details in [Technical Documentation](https://github.com/wipcomputer/memory-crystal/blob/main/TECHNICAL.md).

No fees. No dependencies on us. The relay code is open source (MIT).

## How Sync Works

1. You work with your agent on Machine A
2. After each session, Memory Crystal encrypts the conversation (AES-256-GCM) and drops it at the relay
3. Machine B polls the relay, downloads the encrypted blob, decrypts it locally, and ingests it into its crystal.db
4. The relay deletes the blob after pickup

Two one-way roads:
- **Device to home machine** ... encrypted conversation chunks
- **Home machine to devices** ... search-ready DB snapshot via mirror-sync

The relay is a dead drop. It stores encrypted blobs temporarily and serves them on request. It has no decryption capability. If someone compromises the relay, they get encrypted noise.

## Encryption

- **AES-256-GCM** for encryption (authenticated encryption, no padding oracle attacks)
- **HMAC-SHA256** for signing (integrity verification before decryption)
- Shared key generated locally, never transmitted to the relay
- Key must be present on both machines (store in 1Password, AirDrop between Macs, or transfer manually)

## More Info

- [README.md](https://github.com/wipcomputer/memory-crystal/blob/main/README.md) ... What Memory Crystal is and how to install it.
- [Technical Documentation](https://github.com/wipcomputer/memory-crystal/blob/main/TECHNICAL.md) ... Full technical documentation.

---

## License

```
src/, skills/, cli.ts, mcp-server.ts   MIT    (use anywhere, no restrictions)
worker/                                AGPL   (relay server)
```

AGPL for personal use is free.

Built by Parker Todd Brooks, Lēsa (OpenClaw, Claude Opus 4.6), Claude Code CLI (Claude Opus 4.6).
