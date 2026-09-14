---
name: clean-code-architecture
description: Keep this NestJS API aligned with its feature-based architecture by enforcing thin controllers, orchestration-focused services, meaningful extractions, small focused files, and behavior-preserving refactors.
---

Use this skill before creating, modifying, or refactoring backend code in this repository.

## Goal

Keep the codebase maintainable as it grows without forcing generic enterprise patterns that do not fit this project.

This skill should help the agent:

- preserve the existing feature-based NestJS structure
- keep files focused on one clear responsibility
- keep controllers thin
- keep services centered on use-case orchestration
- extract meaningful responsibilities when complexity grows
- avoid God services, God files, and vague utility dumping grounds
- preserve API behavior while refactoring

## Current Repository Shape

This repository already follows a mostly feature-based structure:

- `src/modules/<feature>/` for feature code such as `auth`, `category`, `products`, `orders`, and `users`
- `dto/` folders inside each feature module
- `src/common/` for cross-cutting concerns such as decorators, DTOs, exceptions, filters, guards, constants, and utilities
- `src/prisma/` for Prisma integration
- `src/i18n/` for translated messages
- `src/common/interceptors/transform.interceptor.ts` for shared success-response formatting

Follow that structure unless the user explicitly requests a different architecture.

Do not introduce global folders like `src/controllers`, `src/services`, `src/mappers`, or `src/utils` for feature code.

## Repository Conventions To Preserve

### Controllers

Controllers in this repo should stay thin.

They should mainly:

1. receive request data
2. read route params, query params, and authenticated user data
3. call the service
4. return the service result

Do not place these directly in controllers:

- Prisma queries
- business rules
- calculations
- mapping logic
- transaction logic
- domain-specific authorization rules

### Services

Services should represent use cases and orchestration.

A service method should be readable at a high level. For example:

```text
validate input context
-> resolve related entities
-> enforce business rules
-> run transaction if needed
-> map response
```

Keep lightweight helpers inside the service when they are tightly coupled to one use case.

Extract logic from a service when it becomes:

- independently understandable
- reused
- structurally different from orchestration
- large enough to hide the service's main flow

### DTOs

DTOs in this repo are for:

- request validation
- transformation
- request and response contracts

Do not move service business logic into DTOs.

### Exceptions and API Messages

User-facing errors should follow the shared `AppException` and i18n pattern already used in the project.

Success messages should continue to flow through `@ResponseMessage(...)` and `TransformInterceptor`.

Do not introduce ad hoc error or response formats.

### Prisma Access

Prisma access should stay close to the feature service unless there is a strong local reason to extract it.

Do not add repository classes everywhere by default.

Use:

- shared `select` objects when they improve clarity
- transactions when several writes must succeed or fail together
- explicit `where` builders when filtering becomes complex

Avoid:

- unnecessary round trips
- duplicated query fragments when a local shared select/helper would be clearer
- exposing Prisma internals to API clients

## File Responsibility Rules

Each file must have one clear reason to change.

Use these cues before adding code to an existing file:

- Does the new code belong to the same responsibility?
- Will this make the file harder to understand end to end?
- Am I adding mapping, query construction, formatting, and orchestration into one file?
- Is there already a nearby file that owns this concern better?

### Good examples in this repository

- `orders.service.ts` orchestrates order use cases
- `orders.mapper.ts` handles response mapping
- `orders.query-builder.ts` handles order filtering logic
- feature `dto/` folders keep request/response contracts local to the feature

### Warning signs

Review a file carefully before extending it when:

- it grows past roughly 300-400 lines
- it has many unrelated private methods
- it mixes orchestration, mapping, query building, and formatting
- different features would need to modify unrelated sections of the same file
- the method flow is hard to follow without scrolling heavily

These are review signals, not automatic reasons to split a file.

Do not create meaningless files just to reduce line count.

## When To Extract A New File

Create a dedicated file only when the new file improves clarity and discoverability.

Good extraction candidates in this repo:

- `<feature>.mapper.ts`
- `<feature>.query-builder.ts`
- `<feature>.types.ts`
- a focused domain service when a second domain grows beyond simple orchestration

Avoid vague names such as:

- `helper.ts`
- `utils.ts`
- `common.ts`
- `manager.ts`
- `processor.ts`
- `data.ts`
- `misc.ts`

Prefer names that describe the exact responsibility.

## Avoid God Services

Do not let one service absorb multiple independent domains.

Simple orchestration across related domains is acceptable.

For example, an order flow may coordinate cart validation, stock checks, payment creation, and shipping data inside the order use case.

That same service should not gradually become the permanent home for unrelated notification, analytics, reporting, and admin maintenance logic.

## Avoid Over-Engineering

Do not introduce a class, interface, factory, repository, strategy, or adapter for every small step.

Extract only when there is a real benefit such as:

- clearer responsibility boundaries
- meaningful reuse
- easier testing
- lower complexity
- cleaner orchestration

Prefer the simplest structure that will still age well in a large codebase.

## Duplication Rules

Before adding new logic:

1. search the repository for a similar implementation
2. reuse the existing pattern if it already fits
3. extract a shared concept only when it is truly shared

Do not create fake-generic utilities for unrelated code just because two snippets look similar.

## Refactoring Rules

Refactoring in this repository must be behavior-preserving unless the user explicitly asks for functional change.

Do not change:

- API routes
- DTO validation behavior
- HTTP status codes
- translation keys
- response shapes
- Prisma schema
- authentication behavior
- authorization behavior
- business rules

When refactoring, keep the before-and-after behavior identical and improve structure only where it gives real value.

## Before Editing Checklist

Before making a substantial change:

1. read the full target file if it is already non-trivial
2. inspect neighboring files in the same module
3. identify the file's current responsibilities
4. decide whether the new code belongs there
5. check whether this repository already has a local pattern for the same problem

## After Structural Changes

After a meaningful refactor or architectural change, run the relevant verification:

- TypeScript type checking
- ESLint
- Prettier
- tests
- build

Fix the issues introduced by the change before finishing.

## Current Problems This Skill Should Prevent

This repository already has a good direction, but the skill should actively prevent:

- services accumulating query-building and mapping logic without review
- large service files growing further without checking natural extraction points
- inconsistent use of feature-specific helper files
- hardcoded success or error messages outside the shared i18n flow
- introducing Better Auth patterns into this JWT-based project

## Refactor Candidates To Watch Later

These are watch areas, not automatic refactor orders:

- `src/modules/products/products.service.ts` still mixes orchestration, mapping, and query construction
- `src/modules/category/category.service.ts` still mixes orchestration, mapping, and query construction
- `src/modules/users/users.service.ts` contains some hardcoded-style response behavior and can be made more consistent with the shared i18n and response patterns
- large shared files such as `src/common/filters/api-exception.filter.ts` should be extended carefully to avoid becoming catch-all files

Use those observations to guide future decisions, not to trigger unrelated refactors.
