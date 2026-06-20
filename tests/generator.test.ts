import { describe, expect, it } from 'vitest';
import { generateFiles } from '../src/generator.js';
import type { RepoFacts } from '../src/types.js';

const facts: RepoFacts = {
  targetDir: '/repo',
  rootDir: '/repo',
  packageJson: {
    name: 'fixture',
    scripts: {
      dev: 'vite',
      test: 'vitest',
      lint: 'eslint .',
      build: 'vite build'
    }
  },
  packageManager: 'pnpm',
  scripts: {
    dev: 'vite',
    test: 'vitest',
    lint: 'eslint .',
    build: 'vite build'
  },
  languages: ['TypeScript'],
  frameworks: ['React', 'Vite'],
  monorepo: false,
  ci: ['.github/workflows/ci.yml'],
  existingAgentFiles: [],
  existingSddFiles: []
};

describe('generateFiles', () => {
  it('generates core SDD assets and selected adapters', () => {
    const files = generateFiles(facts, ['codex', 'claude', 'cursor', 'copilot', 'windsurf']);
    const paths = files.map((file) => file.path);

    expect(paths).toEqual(expect.arrayContaining([
      'AGENTS.md',
      'CLAUDE.md',
      '.cursor/rules/sdd.mdc',
      '.github/copilot-instructions.md',
      '.devin/rules/sdd.md',
      '.sdd/workflow.md',
      '.sdd/templates/spec.md',
      '.sdd/templates/plan.md',
      '.sdd/templates/tasks.md',
      '.sdd/setup-manifest.json'
    ]));

    const agents = files.find((file) => file.path === 'AGENTS.md');
    expect(agents?.content).toContain('pnpm install');
    expect(agents?.content).toContain('pnpm test');
    expect(agents?.content).toContain('Spec Driven Development Workflow');

    const claude = files.find((file) => file.path === 'CLAUDE.md');
    expect(claude?.content).toContain('@AGENTS.md');

    const windsurf = files.find((file) => file.path === '.devin/rules/sdd.md');
    expect(windsurf?.content).toContain('trigger: always_on');
  });
});
