import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createPlan } from '../src/planner.js';
import { applyChanges } from '../src/writer.js';

async function tempRepo(): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), 'sdd-planner-'));
  await mkdir(path.join(dir, '.git'));
  return dir;
}

describe('createPlan and applyChanges', () => {
  it('appends managed blocks to existing user-authored files', async () => {
    const dir = await tempRepo();
    await writeFile(path.join(dir, 'AGENTS.md'), '# Team Notes\n\nKeep this.');

    const plan = await createPlan('init', dir, ['codex']);
    const agentsChange = plan.changes.find((change) => change.path === 'AGENTS.md');

    expect(agentsChange?.status).toBe('update');
    expect(agentsChange?.nextContent).toContain('# Team Notes');
    expect(agentsChange?.nextContent).toContain('sdd-agent-setup:start');

    await applyChanges(plan.changes);
    const written = await readFile(path.join(dir, 'AGENTS.md'), 'utf8');
    expect(written).toContain('Keep this.');
    expect(written).toContain('Spec Driven Development Workflow');
  });

  it('updates only managed blocks on subsequent runs', async () => {
    const dir = await tempRepo();
    const firstPlan = await createPlan('init', dir, ['codex']);
    await applyChanges(firstPlan.changes);

    const file = path.join(dir, 'AGENTS.md');
    const previous = await readFile(file, 'utf8');
    await writeFile(file, `${previous}\n# Local Notes\n\nDo not remove.`);

    const secondPlan = await createPlan('update', dir, ['codex', 'claude']);
    await applyChanges(secondPlan.changes);

    const written = await readFile(file, 'utf8');
    expect(written).toContain('# Local Notes');
    expect(written).toContain('Do not remove.');
    expect(written.match(/sdd-agent-setup:start/g)).toHaveLength(1);
  });

  it('does not churn files when generated content is unchanged', async () => {
    const dir = await tempRepo();
    const firstPlan = await createPlan('init', dir, ['codex', 'claude']);
    await applyChanges(firstPlan.changes);

    const secondPlan = await createPlan('update', dir, ['codex', 'claude']);

    expect(secondPlan.changes.every((change) => change.status === 'unchanged')).toBe(true);
  });
});
