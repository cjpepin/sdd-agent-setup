#!/usr/bin/env node
import { cancel, confirm, intro, isCancel, multiselect, outro } from '@clack/prompts';
import { Command } from 'commander';
import pc from 'picocolors';
import { agentLabel, parseAgents } from './agents.js';
import { runDoctor } from './doctor.js';
import { renderDoctorText, renderPlanText, doctorToJson, planToJson } from './output.js';
import { createPlan } from './planner.js';
import { agentIds } from './types.js';
import type { AgentId, CliOptions, OutputFormat } from './types.js';
import { applyChanges } from './writer.js';

const program = new Command();

program
  .name('sdd-agent-setup')
  .description('Set up spec driven development workflows for coding agents.')
  .version('0.1.0');

addPlanCommand('init', 'Install SDD agent config in a repository.');
addPlanCommand('update', 'Refresh managed SDD agent config in a repository.');
addPlanCommand('preview', 'Show planned SDD setup changes without writing.');

program
  .command('doctor')
  .description('Report missing, stale, or conflicting SDD agent config.')
  .argument('[path]', 'Repository path', process.cwd())
  .option('--agents <agents>', 'Comma-separated adapters to inspect.')
  .option('--all-agents', 'Inspect every supported adapter.')
  .option('--no-interactive', 'Accepted for flag parity; doctor never prompts.')
  .option('--format <format>', 'Output format: text or json.', validateFormat, 'text')
  .action(async (targetPath: string, options: CliOptions) => {
    await handleDoctor(targetPath, options);
  });

program.parseAsync().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(pc.red(message));
  process.exitCode = 1;
});

function addPlanCommand(commandName: 'init' | 'update' | 'preview', description: string): void {
  program
    .command(commandName)
    .description(description)
    .argument('[path]', 'Repository path', process.cwd())
    .option('--agents <agents>', 'Comma-separated adapters to enable.')
    .option('--all-agents', 'Enable every supported adapter.')
    .option('--dry-run', 'Show planned changes without writing.')
    .option('--yes', 'Apply without confirmation.')
    .option('--no-interactive', 'Disable interactive prompts.')
    .option('--format <format>', 'Output format: text or json.', validateFormat, 'text')
    .action(async (targetPath: string, options: CliOptions) => {
      await handlePlanCommand(commandName, targetPath, options);
    });
}

async function handlePlanCommand(commandName: 'init' | 'update' | 'preview', targetPath: string, options: CliOptions): Promise<void> {
  const format = options.format ?? 'text';
  const interactive = Boolean(options.interactive) && format === 'text' && !options.yes;
  const selectedAgents = interactive ? await selectAgents(options) : parseAgents(options.agents, options.allAgents);
  const effectiveDryRun = Boolean(options.dryRun) || commandName === 'preview';
  const plan = await createPlan(commandName, targetPath, selectedAgents);

  if (format === 'json') {
    console.log(JSON.stringify(planToJson(plan), null, 2));
  } else {
    if (interactive) {
      intro('sdd-agent-setup');
    }
    console.log(renderPlanText(plan));
  }

  const writableChanges = plan.changes.filter((change) => change.status === 'create' || change.status === 'update');
  if (effectiveDryRun || writableChanges.length === 0) {
    if (format === 'text') {
      outro(effectiveDryRun ? 'Dry run complete. No files written.' : 'No changes needed.');
    }
    return;
  }

  const shouldApply = options.yes || !interactive ? true : await confirmApply(writableChanges.length);
  if (!shouldApply) {
    if (format === 'text') {
      cancel('No files written.');
    }
    return;
  }

  await applyChanges(plan.changes);
  if (format === 'text') {
    outro(`Wrote ${writableChanges.length} file${writableChanges.length === 1 ? '' : 's'}.`);
  }
}

async function handleDoctor(targetPath: string, options: CliOptions): Promise<void> {
  const format = options.format ?? 'text';
  const agents = parseAgents(options.agents, options.allAgents);
  const result = await runDoctor(targetPath, agents);

  if (format === 'json') {
    console.log(JSON.stringify(doctorToJson(result), null, 2));
  } else {
    console.log(renderDoctorText(result));
  }

  if (result.issues.some((issue) => issue.severity === 'error')) {
    process.exitCode = 1;
  }
}

async function selectAgents(options: CliOptions): Promise<AgentId[]> {
  if (options.agents || options.allAgents) {
    return parseAgents(options.agents, options.allAgents);
  }

  const selected = await multiselect({
    message: 'Which agent adapters should be configured?',
    initialValues: [...agentIds],
    options: agentIds.map((agent) => ({
      value: agent,
      label: agentLabel(agent)
    }))
  });

  if (isCancel(selected)) {
    cancel('Setup cancelled.');
    process.exit(0);
  }

  return selected as AgentId[];
}

async function confirmApply(count: number): Promise<boolean> {
  const answer = await confirm({
    message: `Write ${count} planned file change${count === 1 ? '' : 's'}?`,
    initialValue: true
  });

  if (isCancel(answer)) {
    return false;
  }

  return Boolean(answer);
}

function validateFormat(value: string): OutputFormat {
  if (value !== 'text' && value !== 'json') {
    throw new Error('Format must be text or json.');
  }
  return value;
}
