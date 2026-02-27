// memory-crystal/ldm.ts — LDM directory scaffolding and path resolution.
// Central module for all LDM directory knowledge. Every other file imports paths from here.
// LDM = Learning Dreaming Machines. ~/.ldm/ is the universal agent home.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const HOME = process.env.HOME || '';
const LDM_ROOT = join(HOME, '.ldm');

// ── Agent ID resolution ──

export function getAgentId(): string {
  return process.env.CRYSTAL_AGENT_ID || 'cc-mini';
}

// ── Path resolution ──

export interface LdmPaths {
  root: string;           // ~/.ldm
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

  // Create shared memory directories
  mkdirSync(join(paths.root, 'memory'), { recursive: true });
  mkdirSync(paths.crystalLance, { recursive: true });

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

export function ensureLdm(agentId?: string): LdmPaths {
  const paths = ldmPaths(agentId);

  // Quick check: if agent transcripts dir exists, everything is scaffolded
  if (existsSync(paths.transcripts) && existsSync(paths.config)) {
    return paths;
  }

  return scaffoldLdm(agentId);
}
