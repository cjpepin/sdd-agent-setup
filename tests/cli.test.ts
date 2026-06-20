import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';

const execFileAsync = promisify(execFile);
const cliPath = path.join(process.cwd(), 'src', 'cli.ts');
const tsxLoader = path.join(process.cwd(), 'node_modules', 'tsx', 'dist', 'loader.mjs');

async function tempRepo(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'sdd-cli-'));
  await mkdir(path.join(dir, '.git'));
  await writeFile(path.join(dir, 'package.json'), JSON.stringify({ name: 'cli-fixture', scripts: { test: 'vitest' } }));
  return dir;
}

async function runCli(args: string[], cwd: string): Promise<{ stdout: string; stderr: string }> {
  return execFileAsync(process.execPath, ['--import', tsxLoader, cliPath, ...args], {
    cwd,
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      NO_COLOR: '1'
    }
  });
}

describe('cli', () => {
  it('prints preview JSON without writing files', async () => {
    const dir = await tempRepo();
    const { stdout } = await runCli(['preview', dir, '--format', 'json', '--no-interactive'], dir);
    const result = JSON.parse(stdout);

    expect(result.command).toBe('preview');
    expect(result.changes.some((change: { path: string }) => change.path === 'AGENTS.md')).toBe(true);

    await expect(readFile(path.join(dir, 'AGENTS.md'), 'utf8')).rejects.toThrow();
  });

  it('writes files with init --yes --no-interactive', async () => {
    const dir = await tempRepo();
    await runCli(['init', dir, '--yes', '--no-interactive', '--agents', 'codex,claude'], dir);

    const agents = await readFile(path.join(dir, 'AGENTS.md'), 'utf8');
    const claude = await readFile(path.join(dir, 'CLAUDE.md'), 'utf8');
    expect(agents).toContain('cli-fixture');
    expect(claude).toContain('@AGENTS.md');
  });

  it('reports missing setup in doctor JSON', async () => {
    const dir = await tempRepo();

    await expect(runCli(['doctor', dir, '--format', 'json', '--no-interactive'], dir)).rejects.toMatchObject({
      stdout: expect.stringContaining('"severity": "error"')
    });
  });
});
