import type { AgentId } from './types.js';

export const packageVersion = '0.1.0';

export const defaultAgents: AgentId[] = ['codex', 'claude', 'cursor', 'copilot', 'windsurf'];

export const managedStart = '<!-- sdd-agent-setup:start -->';
export const managedEnd = '<!-- sdd-agent-setup:end -->';

export const managedFileHeader = `${managedStart}
This section is managed by sdd-agent-setup. Keep custom notes outside the markers.
${managedEnd}`;

export const adapterPaths: Record<Exclude<AgentId, 'codex'>, string> = {
  claude: 'CLAUDE.md',
  cursor: '.cursor/rules/sdd.mdc',
  copilot: '.github/copilot-instructions.md',
  windsurf: '.devin/rules/sdd.md'
};

export const corePaths = [
  'AGENTS.md',
  '.sdd/workflow.md',
  '.sdd/templates/spec.md',
  '.sdd/templates/plan.md',
  '.sdd/templates/tasks.md',
  '.sdd/setup-manifest.json'
] as const;
