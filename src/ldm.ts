// memory-crystal/ldm.ts — LDM directory scaffolding and path resolution.
// Central module for all LDM directory knowledge. Every other file imports paths from here.
// LDM = Learning Dreaming Machines. ~/.ldm/ is the universal agent home.

import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, chmodSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HOME = process.env.HOME || '';
const LDM_ROOT = join(HOME, '.ldm');

// ── Agent ID resolution ──

export function getAgentId(): string {
  return process.env.CRYSTAL_AGENT_ID || 'cc-mini';
}

// ── Path resolution ──

export interface LdmPaths {
  root: string;           // ~/.ldm
  bin: string;            // ~/.ldm/bin
  config: string;         // ~/.ldm/config.json
  crystalDb: string;      // ~/.ldm/memory/crystal.db
  crystalLance: string;   // ~/.ldm/memory/lance/
  agentRoot: string;      // ~/.ldm/agents/{agent_id}
  transcripts: string;    // ~/.ldm/agents/{agent_id}/memory/transcripts/
  sessions: string;       // ~/.ldm/agents/{agent_id}/memory/sessions/
  daily: string;          // ~/.ldm/agents/{agent_id}/memory/daily/
  journals: string;       // ~/.ldm/agents/{agent_id}/memory/journals/
}

export function ldmPaths(agentId?: string): LdmPaths {
  const id = agentId || getAgentId();
  const agentRoot = join(LDM_ROOT, 'agents', id);

  return {
    root: LDM_ROOT,
    bin: join(LDM_ROOT, 'bin'),
    config: join(LDM_ROOT, 'config.json'),
    crystalDb: join(LDM_ROOT, 'memory', 'crystal.db'),
    crystalLance: join(LDM_ROOT, 'memory', 'lance'),
    agentRoot,
    transcripts: join(agentRoot, 'memory', 'transcripts'),
    sessions: join(agentRoot, 'memory', 'sessions'),
    daily: join(agentRoot, 'memory', 'daily'),
    journals: join(agentRoot, 'memory', 'journals'),
  };
}

// ── Config file ──

interface LdmConfig {
  version: string;
  agents: string[];
  createdAt: string;
  updatedAt: string;
}

function loadConfig(): LdmConfig | null {
  const configPath = join(LDM_ROOT, 'config.json');
  try {
    if (existsSync(configPath)) {
      return JSON.parse(readFileSync(configPath, 'utf-8'));
    }
  } catch {}
  return null;
}

function saveConfig(config: LdmConfig): void {
  const configPath = join(LDM_ROOT, 'config.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
}

// ── Scaffolding ──

export function scaffoldLdm(agentId?: string): LdmPaths {
  const paths = ldmPaths(agentId);

  // Create shared directories
  mkdirSync(join(paths.root, 'memory'), { recursive: true });
  mkdirSync(paths.crystalLance, { recursive: true });
  mkdirSync(paths.bin, { recursive: true });

  // Create agent-specific directories
  mkdirSync(paths.transcripts, { recursive: true });
  mkdirSync(paths.sessions, { recursive: true });
  mkdirSync(paths.daily, { recursive: true });
  mkdirSync(paths.journals, { recursive: true });

  // Update config.json
  const id = agentId || getAgentId();
  let config = loadConfig();
  if (!config) {
    config = {
      version: '1.0.0',
      agents: [id],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  } else {
    if (!config.agents.includes(id)) {
      config.agents.push(id);
    }
    config.updatedAt = new Date().toISOString();
  }
  saveConfig(config);

  return paths;
}

// ── Script deployment ──

/** Copy crystal-capture.sh from the package's scripts/ dir to ~/.ldm/bin/. */
export function deployCaptureScript(): string {
  const paths = ldmPaths();
  mkdirSync(paths.bin, { recursive: true });

  // Resolve the script: check same dir as this file (dist/), then ../scripts/ (repo dev)
  const thisDir = dirname(fileURLToPath(import.meta.url));
  let scriptSrc = join(thisDir, 'crystal-capture.sh');
  if (!existsSync(scriptSrc)) {
    scriptSrc = join(thisDir, '..', 'scripts', 'crystal-capture.sh');
  }
  const scriptDest = join(paths.bin, 'crystal-capture.sh');

  if (!existsSync(scriptSrc)) {
    throw new Error(`crystal-capture.sh not found at ${scriptSrc}`);
  }

  copyFileSync(scriptSrc, scriptDest);
  chmodSync(scriptDest, 0o755);
  return scriptDest;
}

// ── Cron management ──

const CRON_TAG = '# crystal-capture';
const CRON_ENTRY = '* * * * * ~/.ldm/bin/crystal-capture.sh >> /tmp/ldm-dev-tools/crystal-capture.log 2>&1';

/** Test if a crontab line belongs to crystal-capture (our tag or our entry). */
function isCrystalCaptureLine(line: string): boolean {
  return line === CRON_TAG || (line.includes('crystal-capture.sh') && line.startsWith('*'));
}

/** Install the crystal-capture cron entry. Idempotent: replaces existing entry if present. */
export function installCron(): void {
  // Ensure log directory exists
  mkdirSync('/tmp/ldm-dev-tools', { recursive: true });

  let existing = '';
  try {
    existing = execSync('crontab -l 2>/dev/null', { encoding: 'utf8' });
  } catch {
    // No crontab yet
  }

  // Remove any existing crystal-capture lines (our tag + our entry only)
  const lines = existing.split('\n').filter(line => !isCrystalCaptureLine(line));

  // Add our entry
  lines.push(CRON_TAG);
  lines.push(CRON_ENTRY);

  // Clean up trailing blank lines, ensure final newline
  const newCrontab = lines.filter((l, i, arr) => !(l === '' && i === arr.length - 1)).join('\n') + '\n';
  execSync('crontab -', { input: newCrontab, encoding: 'utf8' });
}

/** Remove the crystal-capture cron entry. */
export function removeCron(): void {
  let existing = '';
  try {
    existing = execSync('crontab -l 2>/dev/null', { encoding: 'utf8' });
  } catch {
    return; // No crontab
  }

  const lines = existing.split('\n').filter(line => !isCrystalCaptureLine(line));
  const newCrontab = lines.join('\n');
  execSync('crontab -', { input: newCrontab, encoding: 'utf8' });
}

// ── Quick check ──

export function ensureLdm(agentId?: string): LdmPaths {
  const paths = ldmPaths(agentId);

  // Quick check: if agent transcripts dir exists, everything is scaffolded
  if (existsSync(paths.transcripts) && existsSync(paths.config)) {
    return paths;
  }

  return scaffoldLdm(agentId);
}
