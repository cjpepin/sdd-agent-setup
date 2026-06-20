import pc from 'picocolors';
import { createUnifiedDiff } from './diff.js';
import type { DoctorResult, PlanResult, PlannedChange } from './types.js';

export function renderPlanText(plan: PlanResult): string {
  const changed = plan.changes.filter((change) => change.status !== 'unchanged');
  const unchanged = plan.changes.length - changed.length;
  const lines = [
    pc.bold(`sdd-agent-setup ${plan.command}`),
    `Root: ${plan.rootDir}`,
    `Agents: ${plan.agents.join(', ')}`,
    `Changes: ${changed.length} planned, ${unchanged} unchanged`
  ];

  for (const change of plan.changes) {
    const marker = statusMarker(change);
    lines.push(`${marker} ${change.path}`);
  }

  const diffs = changed
    .map((change) => createUnifiedDiff(change.path, change.previousContent, change.nextContent))
    .filter(Boolean);

  if (diffs.length) {
    lines.push('', pc.bold('Diff Preview'), diffs.join('\n\n'));
  }

  return lines.join('\n');
}

export function renderDoctorText(result: DoctorResult): string {
  const lines = [pc.bold('sdd-agent-setup doctor'), `Root: ${result.rootDir}`];

  for (const issue of result.issues) {
    const prefix = issue.severity === 'ok' ? pc.green('ok') : issue.severity === 'warn' ? pc.yellow('warn') : pc.red('error');
    lines.push(`${prefix} ${issue.path ? `${issue.path}: ` : ''}${issue.message}`);
  }

  const errors = result.issues.filter((issue) => issue.severity === 'error').length;
  const warnings = result.issues.filter((issue) => issue.severity === 'warn').length;
  lines.push(`Summary: ${errors} errors, ${warnings} warnings`);

  return lines.join('\n');
}

export function planToJson(plan: PlanResult): unknown {
  return {
    rootDir: plan.rootDir,
    command: plan.command,
    agents: plan.agents,
    facts: plan.facts,
    changes: plan.changes.map((change) => ({
      path: change.path,
      status: change.status,
      kind: change.kind,
      agent: change.agent
    }))
  };
}

export function doctorToJson(result: DoctorResult): unknown {
  return result;
}

function statusMarker(change: PlannedChange): string {
  switch (change.status) {
    case 'create':
      return pc.green('+ create');
    case 'update':
      return pc.yellow('~ update');
    case 'blocked':
      return pc.red('! blocked');
    case 'unchanged':
      return pc.dim('= unchanged');
  }
}
