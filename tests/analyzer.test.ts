import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { analyzeRepo } from '../src/analyzer.js';

async function tempRepo(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'sdd-analyzer-'));
  await mkdir(path.join(dir, '.git'));
  return dir;
}

describe('analyzeRepo', () => {
  it('detects npm projects, scripts, frameworks, CI, and agent files', async () => {
    const dir = await tempRepo();
    await mkdir(path.join(dir, '.github', 'workflows'), { recursive: true });
    await mkdir(path.join(dir, '.cursor', 'rules'), { recursive: true });
    await writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({
        name: 'fixture-app',
        scripts: {
          dev: 'vite',
          test: 'vitest',
          build: 'vite build'
        },
        dependencies: {
          react: '^19.0.0',
          vite: '^7.0.0'
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^4.0.0'
        }
      })
    );
    await writeFile(path.join(dir, 'package-lock.json'), '{}');
    await writeFile(path.join(dir, 'tsconfig.json'), '{}');
    await writeFile(path.join(dir, '.github', 'workflows', 'ci.yml'), 'name: ci');
    await writeFile(path.join(dir, 'AGENTS.md'), '# Existing');

    const facts = await analyzeRepo(dir);

    expect(facts.rootDir).toBe(dir);
    expect(facts.packageManager).toBe('npm');
    expect(facts.scripts.test).toBe('vitest');
    expect(facts.languages).toContain('TypeScript');
    expect(facts.frameworks).toEqual(expect.arrayContaining(['React', 'TypeScript', 'Vite', 'Vitest']));
    expect(facts.ci).toEqual(['.github/workflows/ci.yml']);
    expect(facts.existingAgentFiles).toContain('AGENTS.md');
    expect(facts.existingAgentFiles).toContain('.cursor/rules');
  });

  it('detects non-node language markers and monorepos', async () => {
    const dir = await tempRepo();
    await writeFile(path.join(dir, 'pyproject.toml'), '[project]\nname = "py-fixture"');
    await writeFile(path.join(dir, 'Cargo.toml'), '[package]\nname = "rust-fixture"');
    await writeFile(path.join(dir, 'go.mod'), 'module example.com/fixture');
    await writeFile(path.join(dir, 'pnpm-workspace.yaml'), 'packages:\n  - packages/*');

    const facts = await analyzeRepo(dir);

    expect(facts.languages).toEqual(expect.arrayContaining(['Go', 'Python', 'Rust']));
    expect(facts.monorepo).toBe(true);
  });
});
