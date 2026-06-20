import { defaultAgents } from './constants.js';
import { agentIds } from './types.js';
import type { AgentId } from './types.js';

export function parseAgents(value?: string, allAgents = false): AgentId[] {
  if (allAgents || !value) {
    return [...defaultAgents];
  }

  const parsed = value
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  const invalid = parsed.filter((item) => !agentIds.includes(item as AgentId));
  if (invalid.length) {
    throw new Error(`Unknown agent adapter: ${invalid.join(', ')}`);
  }

  return [...new Set(parsed)] as AgentId[];
}

export function agentLabel(agent: AgentId): string {
  switch (agent) {
    case 'codex':
      return 'Codex';
    case 'claude':
      return 'Claude Code';
    case 'cursor':
      return 'Cursor';
    case 'copilot':
      return 'GitHub Copilot';
    case 'windsurf':
      return 'Windsurf/Devin';
  }
}
