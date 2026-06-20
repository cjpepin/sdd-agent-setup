import { adapterPaths, corePaths } from './constants.js';
import { analyzeRepo } from './analyzer.js';
import { readTextIfExists } from './fs.js';
import { hasManagedBlock } from './managed.js';
import type { AgentId, DoctorIssue, DoctorResult } from './types.js';
import path from 'node:path';

export async function runDoctor(targetDir: string, agents: AgentId[]): Promise<DoctorResult> {
  const facts = await analyzeRepo(targetDir);
  const issues: DoctorIssue[] = [];
  const expectedPaths = new Set<string>(corePaths);

  for (const agent of agents) {
    if (agent !== 'codex') {
      expectedPaths.add(adapterPaths[agent]);
    }
  }

  for (const expectedPath of expectedPaths) {
    const absolutePath = path.join(facts.rootDir, expectedPath);
    const content = await readTextIfExists(absolutePath);
    if (content === null) {
      issues.push({
        severity: 'error',
        path: expectedPath,
        message: 'Missing expected SDD setup file.'
      });
      continue;
    }

    if (expectedPath !== '.sdd/setup-manifest.json' && !hasManagedBlock(content)) {
      issues.push({
        severity: 'warn',
        path: expectedPath,
        message: 'File exists but has no sdd-agent-setup managed block.'
      });
      continue;
    }

    issues.push({
      severity: 'ok',
      path: expectedPath,
      message: 'Present.'
    });
  }

  if (facts.existingAgentFiles.includes('.windsurfrules') || facts.existingAgentFiles.includes('.windsurf/rules')) {
    issues.push({
      severity: 'warn',
      message: 'Legacy Windsurf config detected. New setup uses .devin/rules/sdd.md while preserving legacy files.'
    });
  }

  return {
    rootDir: facts.rootDir,
    facts,
    issues
  };
}
