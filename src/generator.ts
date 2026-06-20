import { packageVersion } from './constants.js';
import type { AgentId, GeneratedFile, RepoFacts, SetupManifest } from './types.js';

export function generateFiles(facts: RepoFacts, agents: AgentId[]): GeneratedFile[] {
  const files: GeneratedFile[] = [
    {
      path: 'AGENTS.md',
      content: renderAgentsMd(facts, agents),
      kind: 'core',
      managed: true
    },
    {
      path: '.sdd/workflow.md',
      content: renderWorkflow(),
      kind: 'core',
      managed: true
    },
    {
      path: '.sdd/templates/spec.md',
      content: renderSpecTemplate(),
      kind: 'core',
      managed: true
    },
    {
      path: '.sdd/templates/plan.md',
      content: renderPlanTemplate(),
      kind: 'core',
      managed: true
    },
    {
      path: '.sdd/templates/tasks.md',
      content: renderTasksTemplate(),
      kind: 'core',
      managed: true
    }
  ];

  for (const agent of agents) {
    const adapter = renderAdapter(agent);
    if (adapter) {
      files.push(adapter);
    }
  }

  files.push({
    path: '.sdd/setup-manifest.json',
    content: `${JSON.stringify(renderManifest(facts, agents, files), null, 2)}\n`,
    kind: 'metadata',
    managed: false
  });

  return files;
}

function renderAgentsMd(facts: RepoFacts, agents: AgentId[]): string {
  const installCommand = commandFor(facts, 'install');
  const testCommand = commandFor(facts, 'test');
  const lintCommand = commandFor(facts, 'lint');
  const buildCommand = commandFor(facts, 'build');
  const devCommand = commandFor(facts, 'dev');
  const projectName = facts.packageJson?.name ?? 'this repository';
  const frameworks = facts.frameworks.length ? facts.frameworks.join(', ') : 'none detected';
  const languages = facts.languages.join(', ');
  const ci = facts.ci.length ? facts.ci.map((item) => `- ${item}`).join('\n') : '- No CI workflow detected yet.';

  return `# Agent Instructions

## Project Context
- Project: ${projectName}
- Languages: ${languages}
- Frameworks and tools detected: ${frameworks}
- Package manager: ${facts.packageManager ?? 'not detected'}
- Monorepo: ${facts.monorepo ? 'yes' : 'no'}
- Enabled agent adapters: ${agents.join(', ')}

## Setup Commands
${installCommand ? `- Install dependencies: \`${installCommand}\`` : '- Install dependencies: not detected. Ask before adding new tooling.'}
${devCommand ? `- Start development server: \`${devCommand}\`` : '- Start development server: not detected.'}
${buildCommand ? `- Build: \`${buildCommand}\`` : '- Build: not detected.'}
${lintCommand ? `- Lint: \`${lintCommand}\`` : '- Lint: not detected.'}
${testCommand ? `- Test: \`${testCommand}\`` : '- Test: not detected. Prefer adding focused tests for changed behavior.'}

## CI
${ci}

## Spec Driven Development Workflow
- Begin non-trivial work by drafting or updating a spec in \`.sdd/templates/spec.md\` format.
- Turn the accepted spec into an implementation plan using \`.sdd/templates/plan.md\`.
- Break the plan into trackable tasks using \`.sdd/templates/tasks.md\`.
- Keep specs, plans, and tasks close to the work they describe, or store them under \`.sdd/\` when no feature folder exists.
- Do not implement while requirements are still ambiguous. Ask concise questions or state assumptions before changing code.

## Agent Operating Rules
- Prefer small, reviewable changes that match the existing project style.
- Read relevant files before editing and avoid unrelated refactors.
- Preserve user-authored content outside managed blocks.
- Run the most specific useful validation before finishing. If validation cannot run, explain why.
- Never mutate global editor, agent, or machine configuration for this project setup.

## Quality Gates
- Update tests or examples when behavior changes.
- Keep generated code and documentation consistent with the spec.
- Call out risks, follow-up work, and any skipped validation in the final response.

## Updating This File
- \`AGENTS.md\` is the canonical agent instruction source for this repository.
- Run \`npx sdd-agent-setup update\` to refresh managed sections after scripts, tools, or adapters change.`;
}

function renderWorkflow(): string {
  return `# Spec Driven Development Workflow

## 1. Spec
- Capture the user goal, audience, success criteria, constraints, and non-goals.
- Record assumptions only when they are low risk and easy to revise.
- Keep acceptance criteria concrete enough for an agent or reviewer to verify.

## 2. Plan
- Map the spec to implementation steps, affected interfaces, data flow, and tests.
- Prefer existing project conventions over new abstractions.
- Identify migration, compatibility, and rollback concerns when they exist.

## 3. Tasks
- Convert the plan into small tasks that can be completed and validated independently.
- Keep a visible checklist during longer work.
- Revisit the spec before expanding scope.

## 4. Implement
- Read before editing.
- Make the smallest coherent change.
- Preserve user changes and generated config outside managed regions.

## 5. Validate
- Run focused checks first, then broader checks when risk warrants it.
- Document skipped checks and remaining risk.`;
}

function renderSpecTemplate(): string {
  return `# Spec: <feature or change>

## Goal
Describe the user-visible outcome.

## Success Criteria
- 

## Audience
Who is this for?

## In Scope
- 

## Out of Scope
- 

## Constraints
- 

## Open Questions
- 
`;
}

function renderPlanTemplate(): string {
  return `# Plan: <feature or change>

## Summary
Briefly describe the approach.

## Interfaces And Data Flow
- 

## Implementation Steps
- 

## Edge Cases
- 

## Test Plan
- 

## Rollout Notes
- 
`;
}

function renderTasksTemplate(): string {
  return `# Tasks: <feature or change>

- [ ] Confirm spec and acceptance criteria.
- [ ] Implement the smallest coherent change.
- [ ] Add or update focused tests.
- [ ] Run validation.
- [ ] Update docs or examples if behavior changed.
- [ ] Summarize changes, validation, and residual risk.
`;
}

function renderAdapter(agent: AgentId): GeneratedFile | undefined {
  switch (agent) {
    case 'codex':
      return undefined;
    case 'claude':
      return {
        path: 'CLAUDE.md',
        content: `# Claude Code Instructions

@AGENTS.md

## Claude Code Notes
- Treat \`AGENTS.md\` as the shared project instruction source.
- Keep Claude-specific preferences in this file only when they are not useful to other agents.`,
        kind: 'adapter',
        agent,
        managed: true
      };
    case 'cursor':
      return {
        path: '.cursor/rules/sdd.mdc',
        content: `---
description: Spec driven development workflow and shared agent instructions
alwaysApply: true
---

# Spec Driven Development
- Use \`AGENTS.md\` as the canonical project instruction source.
- Follow \`.sdd/workflow.md\` for spec, plan, tasks, implementation, and validation.
- Keep Cursor-specific notes here only when they do not belong in the shared agent instructions.`,
        kind: 'adapter',
        agent,
        managed: true
      };
    case 'copilot':
      return {
        path: '.github/copilot-instructions.md',
        content: `# GitHub Copilot Instructions

- Use \`AGENTS.md\` as the canonical project instruction source.
- Follow \`.sdd/workflow.md\` for spec driven development.
- Prefer the repository's detected scripts and CI checks before suggesting new tooling.
- Keep generated changes small, tested, and aligned with existing conventions.`,
        kind: 'adapter',
        agent,
        managed: true
      };
    case 'windsurf':
      return {
        path: '.devin/rules/sdd.md',
        content: `---
trigger: always_on
---

# Spec Driven Development
- Use \`AGENTS.md\` as the canonical project instruction source.
- Follow \`.sdd/workflow.md\` for spec, plan, tasks, implementation, and validation.
- Prefer repo-local rules over global memories for durable project knowledge.`,
        kind: 'adapter',
        agent,
        managed: true
      };
  }
}

function renderManifest(facts: RepoFacts, agents: AgentId[], files: GeneratedFile[]): SetupManifest {
  return {
    tool: 'sdd-agent-setup',
    version: packageVersion,
    agents,
    root: {
      packageManager: facts.packageManager,
      languages: facts.languages,
      frameworks: facts.frameworks,
      monorepo: facts.monorepo
    },
    files: files.map((file) => file.path).sort()
  };
}

function commandFor(facts: RepoFacts, script: string): string | undefined {
  if (script === 'install') {
    switch (facts.packageManager) {
      case 'pnpm':
        return 'pnpm install';
      case 'yarn':
        return 'yarn install';
      case 'bun':
        return 'bun install';
      case 'npm':
        return 'npm install';
      default:
        return undefined;
    }
  }

  if (!facts.scripts[script]) {
    return undefined;
  }

  switch (facts.packageManager) {
    case 'pnpm':
      return `pnpm ${script}`;
    case 'yarn':
      return `yarn ${script}`;
    case 'bun':
      return `bun run ${script}`;
    case 'npm':
    default:
      return `npm run ${script}`;
  }
}
