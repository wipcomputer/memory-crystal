#!/usr/bin/env node
// memory-crystal/poller.ts — Mini-side relay poller.
// Polls the ephemeral relay Worker for new conversation drops from remote devices.
// Verifies HMAC, decrypts, ingests into master crystal.
// Also pushes encrypted mirror snapshots for remote devices.
//
// Usage:
//   node poller.js                    Poll once (cron mode)
//   node poller.js --watch            Poll continuously (every 2 min)
//   node poller.js --push-mirror      Export + encrypt + push mirror snapshot
//   node poller.js --status           Show relay status

import { Crystal, resolveConfig, type Chunk } from './core.js';
import { loadRelayKey, decryptJSON, encrypt, hashBuffer, type EncryptedPayload } from './crypto.js';
import { ensureLdm, ldmPaths } from './ldm.js';
import { generateSessionSummary, writeSummaryFile, type SummaryMessage } from './summarize.js';
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';

const HOME = process.env.HOME || '';
const RELAY_URL = process.env.CRYSTAL_RELAY_URL || '';
const RELAY_TOKEN = process.env.CRYSTAL_RELAY_TOKEN || '';
const OC_DIR = join(HOME, '.openclaw');
const POLLER_STATE_PATH = join(OC_DIR, 'memory', 'relay-poller-state.json');

interface PollerState {
  lastPoll: string | null;
  totalIngested: number;
  lastMirrorPush: string | null;
}

function loadState(): PollerState {
  try {
    if (existsSync(POLLER_STATE_PATH)) {
      return JSON.parse(readFileSync(POLLER_STATE_PATH, 'utf-8'));
    }
  } catch {}
  return { lastPoll: null, totalIngested: 0, lastMirrorPush: null };
}

function saveState(state: PollerState): void {
  const dir = dirname(POLLER_STATE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(POLLER_STATE_PATH, JSON.stringify(state, null, 2));
}

// ── Relay message types ──

interface RelayDrop {
  agent_id: string;
  dropped_at: string;
  messages: Array<{
    text: string;
    role: string;
    timestamp: string;
    sessionId: string;
  }>;
}

interface BlobInfo {
  id: string;
  size: number;
  dropped_at: string;
  agent_id: string;
}

// ── Poll and ingest ──

async function pollOnce(): Promise<{ ingested: number; errors: number }> {
  if (!RELAY_URL || !RELAY_TOKEN) {
    throw new Error('CRYSTAL_RELAY_URL and CRYSTAL_RELAY_TOKEN must be set');
  }

  const relayKey = loadRelayKey();
  let ingested = 0;
  let errors = 0;

  // List available conversation blobs
  const listResp = await fetch(`${RELAY_URL}/pickup/conversations`, {
    headers: { 'Authorization': `Bearer ${RELAY_TOKEN}` },
  });

  if (!listResp.ok) {
    throw new Error(`Relay list failed: ${listResp.status} ${await listResp.text()}`);
  }

  const listData = await listResp.json() as { count: number; blobs: BlobInfo[] };

  if (listData.count === 0) {
    return { ingested: 0, errors: 0 };
  }

  process.stderr.write(`[relay-poller] ${listData.count} blob(s) waiting\n`);

  // Initialize crystal for ingestion
  const config = resolveConfig();
  const crystal = new Crystal(config);
  await crystal.init();

  // Process each blob
  for (const blob of listData.blobs) {
    try {
      // Fetch the encrypted blob
      const blobResp = await fetch(`${RELAY_URL}/pickup/conversations/${blob.id}`, {
        headers: { 'Authorization': `Bearer ${RELAY_TOKEN}` },
      });

      if (!blobResp.ok) {
        process.stderr.write(`[relay-poller] failed to fetch blob ${blob.id}: ${blobResp.status}\n`);
        errors++;
        continue;
      }

      const encryptedText = await blobResp.text();
      const encrypted = JSON.parse(encryptedText) as EncryptedPayload;

      // Verify HMAC + decrypt
      let drop: RelayDrop;
      try {
        drop = decryptJSON<RelayDrop>(encrypted, relayKey);
      } catch (err: any) {
        process.stderr.write(`[relay-poller] blob ${blob.id} failed verification: ${err.message} — DISCARDED\n`);
        // Delete the bad blob so it doesn't block future polls
        await fetch(`${RELAY_URL}/confirm/conversations/${blob.id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${RELAY_TOKEN}` },
        });
        errors++;
        continue;
      }

      // Build chunks from decrypted messages
      const maxSingleChunkChars = 2000 * 4;
      const chunks: Chunk[] = [];

      for (const msg of drop.messages) {
        if (msg.text.length <= maxSingleChunkChars) {
          chunks.push({
            text: msg.text,
            role: msg.role as 'user' | 'assistant',
            source_type: 'conversation',
            source_id: `cc:${msg.sessionId}`,
            agent_id: drop.agent_id,
            token_count: Math.ceil(msg.text.length / 4),
            created_at: msg.timestamp,
          });
        } else {
          for (const ct of crystal.chunkText(msg.text)) {
            chunks.push({
              text: ct,
              role: msg.role as 'user' | 'assistant',
              source_type: 'conversation',
              source_id: `cc:${msg.sessionId}`,
              agent_id: drop.agent_id,
              token_count: Math.ceil(ct.length / 4),
              created_at: msg.timestamp,
            });
          }
        }
      }

      // Ingest into master crystal
      const count = await crystal.ingest(chunks);
      ingested += count;

      // Confirm receipt — Worker deletes the blob
      await fetch(`${RELAY_URL}/confirm/conversations/${blob.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${RELAY_TOKEN}` },
      });

      process.stderr.write(`[relay-poller] blob ${blob.id}: ${count} chunks ingested from ${drop.agent_id}\n`);

      // Reconstruct remote agent's file tree on Mini
      try {
        const remotePaths = ensureLdm(drop.agent_id);

        // 1. Write JSONL transcript
        const jsonlPath = join(remotePaths.transcripts, `relay-${blob.id}.jsonl`);
        const jsonlLines = drop.messages.map(m => JSON.stringify(m)).join('\n') + '\n';
        writeFileSync(jsonlPath, jsonlLines);

        // 2. Generate MD session summary
        const summaryMsgs: SummaryMessage[] = drop.messages.map(m => ({
          role: m.role,
          text: m.text,
          timestamp: m.timestamp,
          sessionId: m.sessionId,
        }));
        const summary = await generateSessionSummary(summaryMsgs);
        const sessionId = drop.messages[0]?.sessionId || 'unknown';
        writeSummaryFile(remotePaths.sessions, summary, drop.agent_id, sessionId);

        // 3. Append daily breadcrumb
        const now = new Date();
        const dateStr = now.toISOString().slice(0, 10);
        const dailyPath = join(remotePaths.daily, `${dateStr}.md`);
        if (!existsSync(dailyPath)) {
          writeFileSync(dailyPath, `# ${dateStr} - ${drop.agent_id} Daily Log (via relay)\n\n`);
        }
        const firstUser = drop.messages.find(m => m.role === 'user');
        if (firstUser) {
          const snippet = firstUser.text.slice(0, 120).replace(/\n/g, ' ').trim();
          appendFileSync(dailyPath, `- **${now.toISOString().slice(11, 16)}** [relay] ${snippet}\n`);
        }
      } catch (fileErr: any) {
        process.stderr.write(`[relay-poller] file tree write failed (non-fatal): ${fileErr.message}\n`);
      }

    } catch (err: any) {
      process.stderr.write(`[relay-poller] error processing blob ${blob.id}: ${err.message}\n`);
      errors++;
    }
  }

  return { ingested, errors };
}

// ── Push mirror snapshot ──

async function pushMirror(): Promise<void> {
  if (!RELAY_URL || !RELAY_TOKEN) {
    throw new Error('CRYSTAL_RELAY_URL and CRYSTAL_RELAY_TOKEN must be set');
  }

  const relayKey = loadRelayKey();
  const config = resolveConfig();
  const paths = ldmPaths();
  const dbPath = existsSync(paths.crystalDb) ? paths.crystalDb : join(config.dataDir || join(OC_DIR, 'memory-crystal'), 'crystal.db');

  if (!existsSync(dbPath)) {
    throw new Error(`Crystal DB not found at ${dbPath}`);
  }

  // Read the DB file
  const dbData = readFileSync(dbPath);
  const dbHash = hashBuffer(dbData);

  // Build mirror payload: hash + encrypted DB
  const mirrorMeta = JSON.stringify({ hash: dbHash, size: dbData.length, pushed_at: new Date().toISOString() });
  const metaEncrypted = encrypt(Buffer.from(mirrorMeta, 'utf-8'), relayKey);
  const dbEncrypted = encrypt(dbData, relayKey);

  const payload = JSON.stringify({
    meta: metaEncrypted,
    db: dbEncrypted,
  });

  // Drop at Worker
  const resp = await fetch(`${RELAY_URL}/drop/mirror`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RELAY_TOKEN}`,
      'Content-Type': 'application/octet-stream',
    },
    body: payload,
  });

  if (!resp.ok) {
    throw new Error(`Mirror push failed: ${resp.status} ${await resp.text()}`);
  }

  const result = await resp.json() as any;
  process.stderr.write(`[relay-poller] mirror pushed: ${(dbData.length / 1024 / 1024).toFixed(1)}MB, hash=${dbHash.slice(0, 12)}...\n`);
}

// ── CLI ──

const args = process.argv.slice(2);

if (args.includes('--status')) {
  const state = loadState();
  const mode = (RELAY_URL && RELAY_TOKEN) ? 'configured' : 'not configured';
  console.log(`Relay poller status:`);
  console.log(`  Relay URL:      ${RELAY_URL || '(not set)'}`);
  console.log(`  Mode:           ${mode}`);
  console.log(`  Last poll:      ${state.lastPoll || 'never'}`);
  console.log(`  Total ingested: ${state.totalIngested}`);
  console.log(`  Last mirror:    ${state.lastMirrorPush || 'never'}`);
  process.exit(0);
}

if (args.includes('--push-mirror')) {
  pushMirror()
    .then(() => {
      const state = loadState();
      state.lastMirrorPush = new Date().toISOString();
      saveState(state);
      process.exit(0);
    })
    .catch(err => {
      process.stderr.write(`[relay-poller] mirror push error: ${err.message}\n`);
      process.exit(1);
    });
} else if (args.includes('--watch')) {
  // Continuous polling mode
  const POLL_INTERVAL = 2 * 60 * 1000; // 2 minutes

  async function loop() {
    process.stderr.write(`[relay-poller] watching (every ${POLL_INTERVAL / 1000}s)...\n`);
    while (true) {
      try {
        const { ingested, errors } = await pollOnce();
        const state = loadState();
        state.lastPoll = new Date().toISOString();
        state.totalIngested += ingested;
        saveState(state);

        if (ingested > 0) {
          process.stderr.write(`[relay-poller] poll complete: ${ingested} ingested, ${errors} errors\n`);
          // Push mirror after successful ingestion
          try {
            await pushMirror();
            state.lastMirrorPush = new Date().toISOString();
            saveState(state);
          } catch (mirrorErr: any) {
            process.stderr.write(`[relay-poller] mirror push failed (non-fatal): ${mirrorErr.message}\n`);
          }
        }
      } catch (err: any) {
        process.stderr.write(`[relay-poller] poll error: ${err.message}\n`);
      }
      await new Promise(r => setTimeout(r, POLL_INTERVAL));
    }
  }
  loop();
} else {
  // Single poll (cron mode)
  pollOnce()
    .then(({ ingested, errors }) => {
      const state = loadState();
      state.lastPoll = new Date().toISOString();
      state.totalIngested += ingested;
      saveState(state);

      if (ingested > 0) {
        process.stderr.write(`[relay-poller] ${ingested} chunks ingested, ${errors} errors\n`);
      }
      process.exit(errors > 0 ? 1 : 0);
    })
    .catch(err => {
      process.stderr.write(`[relay-poller] error: ${err.message}\n`);
      process.exit(1);
    });
}
