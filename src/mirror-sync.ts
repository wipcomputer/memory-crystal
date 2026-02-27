#!/usr/bin/env node
// memory-crystal/mirror-sync.ts — Device-side mirror pull.
// Pulls encrypted DB snapshot from relay Worker, verifies integrity,
// decrypts, and replaces local read-only crystal mirror.
//
// Usage:
//   node mirror-sync.js              Pull latest mirror (if available)
//   node mirror-sync.js --status     Show mirror state
//   node mirror-sync.js --force      Pull even if current mirror is recent

import { loadRelayKey, decrypt, decryptJSON, hashBuffer, type EncryptedPayload } from './crypto.js';
import { ldmPaths } from './ldm.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';

const HOME = process.env.HOME || '';
const RELAY_URL = process.env.CRYSTAL_RELAY_URL || '';
const RELAY_TOKEN = process.env.CRYSTAL_RELAY_TOKEN || '';
const OC_DIR = join(HOME, '.openclaw');
const _ldmPaths = ldmPaths();
const MIRROR_DIR = join(_ldmPaths.root, 'memory');
const MIRROR_DB_PATH = _ldmPaths.crystalDb;
const MIRROR_STATE_PATH = join(OC_DIR, 'memory', 'mirror-sync-state.json');

interface MirrorState {
  lastSync: string | null;
  lastHash: string | null;
  lastSize: number | null;
}

function loadState(): MirrorState {
  try {
    if (existsSync(MIRROR_STATE_PATH)) {
      return JSON.parse(readFileSync(MIRROR_STATE_PATH, 'utf-8'));
    }
  } catch {}
  return { lastSync: null, lastHash: null, lastSize: null };
}

function saveState(state: MirrorState): void {
  const dir = dirname(MIRROR_STATE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(MIRROR_STATE_PATH, JSON.stringify(state, null, 2));
}

// ── Pull mirror ──

async function pullMirror(force: boolean): Promise<boolean> {
  if (!RELAY_URL || !RELAY_TOKEN) {
    throw new Error('CRYSTAL_RELAY_URL and CRYSTAL_RELAY_TOKEN must be set');
  }

  const relayKey = loadRelayKey();

  // List available mirror blobs
  const listResp = await fetch(`${RELAY_URL}/pickup/mirror`, {
    headers: { 'Authorization': `Bearer ${RELAY_TOKEN}` },
  });

  if (!listResp.ok) {
    throw new Error(`Relay list failed: ${listResp.status} ${await listResp.text()}`);
  }

  const listData = await listResp.json() as { count: number; blobs: Array<{ id: string; size: number; dropped_at: string }> };

  if (listData.count === 0) {
    process.stderr.write('[mirror-sync] no mirror available\n');
    return false;
  }

  // Take the latest blob (last in list by drop time)
  const latestBlob = listData.blobs[listData.blobs.length - 1];

  // Fetch the encrypted mirror
  const blobResp = await fetch(`${RELAY_URL}/pickup/mirror/${latestBlob.id}`, {
    headers: { 'Authorization': `Bearer ${RELAY_TOKEN}` },
  });

  if (!blobResp.ok) {
    throw new Error(`Mirror fetch failed: ${blobResp.status}`);
  }

  const encryptedText = await blobResp.text();
  const mirrorPayload = JSON.parse(encryptedText) as { meta: EncryptedPayload; db: EncryptedPayload };

  // Decrypt metadata
  const meta = decryptJSON<{ hash: string; size: number; pushed_at: string }>(mirrorPayload.meta, relayKey);

  // Check if we already have this version
  const state = loadState();
  if (!force && state.lastHash === meta.hash) {
    process.stderr.write('[mirror-sync] mirror is already up to date\n');
    return false;
  }

  // Decrypt the DB
  const dbData = decrypt(mirrorPayload.db, relayKey);

  // Verify integrity
  const actualHash = hashBuffer(dbData);
  if (actualHash !== meta.hash) {
    throw new Error(
      `Mirror integrity check failed!\n` +
      `  Expected: ${meta.hash}\n` +
      `  Got:      ${actualHash}\n` +
      `Mirror REJECTED — keeping existing local mirror.`
    );
  }

  // Atomic replace: write to temp, then rename
  if (!existsSync(MIRROR_DIR)) mkdirSync(MIRROR_DIR, { recursive: true });
  const tmpPath = MIRROR_DB_PATH + '.tmp';
  writeFileSync(tmpPath, dbData);

  // Backup existing mirror
  if (existsSync(MIRROR_DB_PATH)) {
    const backupPath = MIRROR_DB_PATH + '.bak';
    try { renameSync(MIRROR_DB_PATH, backupPath); } catch {}
  }

  renameSync(tmpPath, MIRROR_DB_PATH);

  // Update state
  state.lastSync = new Date().toISOString();
  state.lastHash = meta.hash;
  state.lastSize = dbData.length;
  saveState(state);

  process.stderr.write(
    `[mirror-sync] updated: ${(dbData.length / 1024 / 1024).toFixed(1)}MB, ` +
    `hash=${meta.hash.slice(0, 12)}..., pushed=${meta.pushed_at}\n`
  );

  // Confirm receipt — Worker deletes all mirror blobs
  for (const blob of listData.blobs) {
    try {
      await fetch(`${RELAY_URL}/confirm/mirror/${blob.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${RELAY_TOKEN}` },
      });
    } catch {} // Best effort cleanup
  }

  return true;
}

// ── CLI ──

const args = process.argv.slice(2);

if (args.includes('--status')) {
  const state = loadState();
  const hasDb = existsSync(MIRROR_DB_PATH);
  console.log('Mirror sync status:');
  console.log(`  Relay URL:    ${RELAY_URL || '(not set)'}`);
  console.log(`  Local mirror: ${hasDb ? MIRROR_DB_PATH : '(none)'}`);
  console.log(`  Last sync:    ${state.lastSync || 'never'}`);
  console.log(`  Last hash:    ${state.lastHash ? state.lastHash.slice(0, 16) + '...' : '(none)'}`);
  console.log(`  Last size:    ${state.lastSize ? (state.lastSize / 1024 / 1024).toFixed(1) + 'MB' : '(none)'}`);
  process.exit(0);
}

const force = args.includes('--force');

pullMirror(force)
  .then(updated => {
    if (updated) {
      process.stderr.write('[mirror-sync] done\n');
    }
    process.exit(0);
  })
  .catch(err => {
    process.stderr.write(`[mirror-sync] error: ${err.message}\n`);
    process.exit(1);
  });
