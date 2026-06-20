import { promises as fs } from 'node:fs';
import type { Dirent } from 'node:fs';
import path from 'node:path';
import { adapterPaths, corePaths } from './constants.js';
import { findUp, listFiles, pathExists, readJsonIfExists } from './fs.js';
import { toPosixPath } from './path.js';
import type { PackageJson, RepoFacts } from './types.js';

const ignoredDirs = new Set([
  '.git',
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  'target',
  '.venv',
  'venv'
]);

const frameworkDependencies: Record<string, string> = {
  next: 'Next.js',
  react: 'React',
  vue: 'Vue',
  svelte: 'Svelte',
  astro: 'Astro',
  vite: 'Vite',
  '@angular/core': 'Angular',
  express: 'Express',
  fastify: 'Fastify',
  '@nestjs/core': 'NestJS',
  typescript: 'TypeScript',
  vitest: 'Vitest',
  jest: 'Jest',
  playwright: 'Playwright',
  cypress: 'Cypress',
  tailwindcss: 'Tailwind CSS',
  eslint: 'ESLint',
  prettier: 'Prettier'
};

export async function analyzeRepo(inputDir = process.cwd()): Promise<RepoFacts> {
  const targetDir = path.resolve(inputDir);
  const rootDir = (await findUp(targetDir, '.git')) ?? targetDir;
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = await readJsonIfExists<PackageJson>(packageJsonPath);
  const files = await collectFiles(rootDir);

  return {
    targetDir,
    rootDir,
    packageJson,
    packageManager: await detectPackageManager(rootDir, packageJson),
    scripts: packageJson?.scripts ?? {},
    languages: detectLanguages(rootDir, files, packageJson),
    frameworks: detectFrameworks(packageJson),
    monorepo: await detectMonorepo(rootDir, packageJson),
    ci: await detectCi(rootDir),
    existingAgentFiles: await detectExistingAgentFiles(rootDir),
    existingSddFiles: await detectExistingSddFiles(rootDir)
  };
}

async function collectFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(currentDir: string, depth: number): Promise<void> {
    if (depth > 4 || files.length > 700) {
      return;
    }

    let entries: Dirent<string>[];
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!ignoredDirs.has(entry.name)) {
          await walk(path.join(currentDir, entry.name), depth + 1);
        }
        continue;
      }

      if (entry.isFile()) {
        files.push(toPosixPath(path.relative(rootDir, path.join(currentDir, entry.name))));
      }
    }
  }

  await walk(rootDir, 0);
  return files.sort();
}

async function detectPackageManager(rootDir: string, packageJson?: PackageJson): Promise<string | undefined> {
  const declared = packageJson?.packageManager?.split('@')[0];
  if (declared) {
    return declared;
  }

  const candidates: Array<[string, string]> = [
    ['pnpm-lock.yaml', 'pnpm'],
    ['yarn.lock', 'yarn'],
    ['bun.lock', 'bun'],
    ['bun.lockb', 'bun'],
    ['package-lock.json', 'npm']
  ];

  for (const [file, manager] of candidates) {
    if (await pathExists(path.join(rootDir, file))) {
      return manager;
    }
  }

  return packageJson ? 'npm' : undefined;
}

function detectLanguages(rootDir: string, files: string[], packageJson?: PackageJson): string[] {
  const languages = new Set<string>();

  if (packageJson || files.some((file) => /\.(mjs|cjs|jsx)$/.test(file))) {
    languages.add('JavaScript');
  }
  if (files.some((file) => /\.(ts|tsx)$/.test(file)) || files.includes('tsconfig.json')) {
    languages.add('TypeScript');
  }
  if (files.some((file) => file.endsWith('.py')) || files.some((file) => ['pyproject.toml', 'requirements.txt', 'setup.py'].includes(file))) {
    languages.add('Python');
  }
  if (files.some((file) => file.endsWith('.rs')) || files.includes('Cargo.toml')) {
    languages.add('Rust');
  }
  if (files.some((file) => file.endsWith('.go')) || files.includes('go.mod')) {
    languages.add('Go');
  }
  if (files.some((file) => file.endsWith('.java')) || files.some((file) => ['pom.xml', 'build.gradle', 'settings.gradle'].includes(file))) {
    languages.add('Java');
  }
  if (files.some((file) => file.endsWith('.rb')) || files.includes('Gemfile')) {
    languages.add('Ruby');
  }
  if (files.some((file) => file.endsWith('.php')) || files.includes('composer.json')) {
    languages.add('PHP');
  }

  if (languages.size === 0 && rootDir) {
    languages.add('Unknown');
  }

  return [...languages].sort();
}

function detectFrameworks(packageJson?: PackageJson): string[] {
  if (!packageJson) {
    return [];
  }

  const dependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies
  };

  return Object.keys(frameworkDependencies)
    .filter((dependency) => dependencies[dependency])
    .map((dependency) => frameworkDependencies[dependency])
    .sort();
}

async function detectMonorepo(rootDir: string, packageJson?: PackageJson): Promise<boolean> {
  if (packageJson?.workspaces) {
    return true;
  }

  const markers = ['pnpm-workspace.yaml', 'turbo.json', 'nx.json', 'lerna.json', 'rush.json'];
  for (const marker of markers) {
    if (await pathExists(path.join(rootDir, marker))) {
      return true;
    }
  }

  return false;
}

async function detectCi(rootDir: string): Promise<string[]> {
  const workflowsDir = path.join(rootDir, '.github', 'workflows');
  const workflows = (await listFiles(workflowsDir)).filter((file) => /\.(ya?ml)$/.test(file));
  const ci = workflows.map((file) => `.github/workflows/${file}`);

  if (await pathExists(path.join(rootDir, '.gitlab-ci.yml'))) {
    ci.push('.gitlab-ci.yml');
  }
  if (await pathExists(path.join(rootDir, 'circle.yml')) || await pathExists(path.join(rootDir, '.circleci', 'config.yml'))) {
    ci.push('.circleci/config.yml');
  }

  return ci.sort();
}

async function detectExistingAgentFiles(rootDir: string): Promise<string[]> {
  const candidates = [
    'AGENTS.md',
    'CLAUDE.md',
    '.claude/CLAUDE.md',
    '.cursor/rules',
    '.cursorrules',
    '.github/copilot-instructions.md',
    '.github/instructions',
    '.devin/rules',
    '.windsurf/rules',
    '.windsurfrules',
    ...Object.values(adapterPaths)
  ];

  const existing = new Set<string>();
  for (const candidate of candidates) {
    if (await pathExists(path.join(rootDir, candidate))) {
      existing.add(candidate);
    }
  }

  return [...existing].sort();
}

async function detectExistingSddFiles(rootDir: string): Promise<string[]> {
  const candidates = [...corePaths, '.sdd'];
  const existing: string[] = [];
  for (const candidate of candidates) {
    if (await pathExists(path.join(rootDir, candidate))) {
      existing.push(candidate);
    }
  }
  return existing.sort();
}
