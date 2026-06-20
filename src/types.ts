export const agentIds = ['codex', 'claude', 'cursor', 'copilot', 'windsurf'] as const;

export type AgentId = (typeof agentIds)[number];

export type OutputFormat = 'text' | 'json';

export interface CliOptions {
  agents?: string;
  allAgents?: boolean;
  dryRun?: boolean;
  yes?: boolean;
  interactive?: boolean;
  noInteractive?: boolean;
  format?: OutputFormat;
}

export interface PackageJson {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
  packageManager?: string;
}

export interface RepoFacts {
  targetDir: string;
  rootDir: string;
  packageJson?: PackageJson;
  packageManager?: string;
  scripts: Record<string, string>;
  languages: string[];
  frameworks: string[];
  monorepo: boolean;
  ci: string[];
  existingAgentFiles: string[];
  existingSddFiles: string[];
}

export interface GeneratedFile {
  path: string;
  content: string;
  kind: 'core' | 'adapter' | 'metadata';
  agent?: AgentId;
  managed: boolean;
}

export interface PlannedChange extends GeneratedFile {
  absolutePath: string;
  previousContent: string | null;
  nextContent: string;
  status: 'create' | 'update' | 'unchanged' | 'blocked';
  reason?: string;
}

export interface PlanResult {
  rootDir: string;
  command: 'init' | 'update' | 'preview';
  agents: AgentId[];
  facts: RepoFacts;
  changes: PlannedChange[];
}

export interface DoctorIssue {
  severity: 'ok' | 'warn' | 'error';
  path?: string;
  message: string;
}

export interface DoctorResult {
  rootDir: string;
  facts: RepoFacts;
  issues: DoctorIssue[];
}

export interface SetupManifest {
  tool: 'sdd-agent-setup';
  version: string;
  agents: AgentId[];
  root: {
    packageManager?: string;
    languages: string[];
    frameworks: string[];
    monorepo: boolean;
  };
  files: string[];
}
