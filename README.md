# sdd-agent-setup

Set up a spec driven development workflow for coding agents from one CLI.

```sh
npx sdd-agent-setup init
```

The CLI creates a portable `AGENTS.md` plus lightweight adapter files for Codex, Claude Code, Cursor, GitHub Copilot, and Windsurf/Devin. It keeps generated regions behind managed markers so `update` can refresh the workflow without trampling your hand-written notes.

## Commands

```sh
sdd-setup init [path]
sdd-setup update [path]
sdd-setup preview [path]
sdd-setup doctor [path]
```

Useful flags:

```sh
--agents codex,claude,cursor,copilot,windsurf
--all-agents
--dry-run
--yes
--no-interactive
--format text|json
```

## What It Writes

- `AGENTS.md`
- `CLAUDE.md`
- `.cursor/rules/sdd.mdc`
- `.github/copilot-instructions.md`
- `.devin/rules/sdd.md`
- `.sdd/workflow.md`
- `.sdd/templates/spec.md`
- `.sdd/templates/plan.md`
- `.sdd/templates/tasks.md`
- `.sdd/setup-manifest.json`

All writes are repository-local in v1.
