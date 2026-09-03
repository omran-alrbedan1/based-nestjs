# Agent Guide

## Mandatory Workflow

Before making any code change in this repository:

1. Read `README.md`.
2. Inspect `.agents/skills/`.
3. Read the relevant `SKILL.md` files for the task.
4. Follow those skills while implementing the change.

Do not start implementation until the applicable skills have been read.

## Clean Code & Architecture

Before creating or modifying code, follow:

- `.agents/skills/clean-code-architecture/SKILL.md`

Key requirements:

- Prefer the existing feature-based architecture under `src/modules/`.
- Keep files focused on one responsibility.
- Keep controllers thin.
- Keep services focused on use-case orchestration.
- Extract meaningful responsibilities when complexity grows.
- Do not split files merely to reduce line count.
- Avoid God files, God services, and vague utility files.
- Avoid unnecessary abstractions.
- Reuse existing project patterns where they are reasonable.
- Preserve existing API behavior and business rules during refactoring.
- Run verification after significant structural changes.

## Other Skills

Use additional project skills when relevant, especially:

- `architect` for planning and architecture decisions
- `i18n-errors` for translated errors and success messages
- `review` for post-implementation verification
- `recover` when diagnosing broken builds or failed changes

## Project Constraints

- This is a NestJS API project.
- Authentication must follow the existing JWT implementation in `src/modules/auth/`.
- Do not apply Better Auth patterns here.
- Use senior-level, production-oriented practices by default.
