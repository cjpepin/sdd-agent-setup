import path from 'node:path';
import { analyzeRepo } from './analyzer.js';
import { readTextIfExists } from './fs.js';
import { generateFiles } from './generator.js';
import { hasManagedBlock, replaceManagedBlock, wrapManaged } from './managed.js';
import type { AgentId, PlanResult, PlannedChange } from './types.js';

export async function createPlan(
  command: 'init' | 'update' | 'preview',
  targetDir: string,
  agents: AgentId[]
): Promise<PlanResult> {
  const facts = await analyzeRepo(targetDir);
  const generatedFiles = generateFiles(facts, agents);
  const changes: PlannedChange[] = [];

  for (const generatedFile of generatedFiles) {
    const absolutePath = path.join(facts.rootDir, generatedFile.path);
    const previousContent = await readTextIfExists(absolutePath);
    const nextContent = resolveNextContent(previousContent, generatedFile.content, generatedFile.managed);
    const status = previousContent === null ? 'create' : previousContent === nextContent ? 'unchanged' : 'update';

    changes.push({
      ...generatedFile,
      absolutePath,
      previousContent,
      nextContent,
      status
    });
  }

  return {
    rootDir: facts.rootDir,
    command,
    agents,
    facts,
    changes
  };
}

function resolveNextContent(previousContent: string | null, generatedContent: string, managed: boolean): string {
  if (!managed) {
    return generatedContent;
  }

  if (previousContent === null) {
    return wrapManaged(generatedContent);
  }

  if (hasManagedBlock(previousContent)) {
    return replaceManagedBlock(previousContent, generatedContent);
  }

  return `${previousContent.trimEnd()}\n\n${wrapManaged(generatedContent)}`;
}
