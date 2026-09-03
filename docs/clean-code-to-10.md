# Clean Code Roadmap to 10/10

This file is the practical backlog for moving this NestJS backend from a strong `7.5/10` clean-code level to a `9.5-10/10` level.

The goal is not to over-engineer the project.

The goal is to make the codebase:

- easier to extend
- safer to change
- more consistent across modules
- more production-ready
- more testable

## Current Assessment

Current estimated clean-code score: `7.5/10`

Why it is already good:

- feature-based module structure exists
- controllers are mostly thin
- error handling and i18n are centralized
- pagination and response structure are mostly consistent
- `orders` is a strong reference module

Why it is not `10/10` yet:

- module patterns are not fully consistent
- some services still hold too many responsibilities
- shared files can still become catch-all files
- there are no automated tests
- verification discipline is not yet strong enough across the whole codebase

## Success Criteria for 10/10

The project can be considered near `10/10` when:

- every feature module follows the same architectural style
- every controller is thin and predictable
- every service has a clear orchestration responsibility
- mapping, query building, and complex filtering are extracted only when meaningful
- all user-facing messages are fully centralized
- shared infrastructure files stay focused
- core flows are protected by unit and integration tests
- refactors can be made with confidence because the project is verifiable

## Priority 1: Testing Foundation

### Task 1. Add unit tests for core services

Start with:

- `AuthService`
- `UsersService`
- `CategoryService`
- `ProductsService`
- `OrdersService`

Focus on:

- happy paths
- not found cases
- conflict cases
- authorization/business-rule failures
- transaction-related flows in orders

Acceptance:

- each core service has meaningful `.spec.ts` coverage
- mocks are isolated and readable
- important business rules are explicitly tested

### Task 2. Add integration or e2e tests for critical API flows

Start with:

- auth login/register/refresh/logout
- category CRUD
- product CRUD
- order creation and order update flows
- translated error responses

Acceptance:

- the real HTTP response shape is tested
- status codes are verified
- translated error keys/messages are verified where needed
- major regressions can be caught before shipping

## Priority 2: Module Consistency

### Task 3. Make all feature modules follow one clean internal pattern

Use `orders` as the reference style.

Target pattern when needed:

```text
<feature>/
├── dto/
├── <feature>.controller.ts
├── <feature>.service.ts
├── <feature>.mapper.ts
├── <feature>.query-builder.ts
├── <feature>.types.ts
└── <feature>.module.ts
```

Do this only when each extra file has a real responsibility.

Acceptance:

- `users`, `category`, `products`, and `orders` feel structurally consistent
- no feature uses random local patterns without a reason

### Task 4. Review every service for orchestration-only responsibility

Check each service and ask:

- is this method orchestrating a use case
- or is it hiding mapping/query/formatting logic that belongs elsewhere

Refactor only meaningful drift.

Acceptance:

- services mostly read as high-level business flows
- helper logic is either private and tightly local, or extracted cleanly

## Priority 3: Shared Infrastructure Quality

### Task 5. Refactor large shared files carefully

Main watch targets:

- `src/common/filters/api-exception.filter.ts`
- `src/utils/transform.interceptor.ts`

Goals:

- keep them focused
- avoid turning them into multi-responsibility infrastructure files
- extract formatting or normalization helpers only if they are meaningful

Acceptance:

- shared files remain understandable end to end
- cross-cutting behavior stays centralized but not bloated

### Task 6. Standardize response behavior everywhere

Review the project for:

- hardcoded success messages
- response behavior that bypasses shared patterns
- inconsistent null/delete responses
- inconsistent paginated response usage

Acceptance:

- all success responses use the same response pipeline
- all errors use the same exception pipeline
- no module behaves “special” without a strong reason

## Priority 4: Data and Query Discipline

### Task 7. Standardize Prisma select/query patterns

Review all modules for:

- duplicated `select` objects
- inconsistent detail/list query structure
- repeated existence checks
- avoidable extra queries

Acceptance:

- list and detail selects are explicit and easy to find
- query builders are used only where filtering is meaningful
- no unnecessary database round trips remain in obvious places

### Task 8. Review transaction boundaries in all write flows

Focus on:

- order creation/update
- future payment/inventory flows
- any multi-step write operations

Questions:

- does this operation need to be atomic
- is anything inside the transaction unnecessary
- is anything outside the transaction risky

Acceptance:

- every multi-write operation has a justified transaction boundary
- no transaction exists only by habit

## Priority 5: Naming, Readability, and Duplication

### Task 9. Remove vague naming and accidental duplication

Search for:

- unclear helper names
- duplicated validation logic
- repeated query fragments
- repeated formatting logic
- comments that explain weak code instead of improving code

Acceptance:

- names communicate intent clearly
- reused concepts are shared once
- files do not contain “mystery” helpers

### Task 10. Make comments and documentation intentional

Keep comments only where they add real value.

Prefer:

- clear method names
- clear file names
- focused code flow

Document:

- architectural rules
- shared conventions
- module patterns

Acceptance:

- comments explain why, not obvious what
- docs support team consistency without becoming stale

## Priority 6: Engineering Discipline

### Task 11. Enforce verification on every meaningful refactor

After structural changes, always run:

- `npx tsc --noEmit`
- `npx eslint ...`
- `npx prettier --check ...`
- `npm test -- --runInBand`
- `npm run build`

Acceptance:

- refactors are not considered done without verification
- failures are fixed before moving on

### Task 12. Introduce a repeatable review checklist

Before merging or finishing a feature, review:

- controller thickness
- service responsibility
- error consistency
- response consistency
- test coverage
- transaction safety
- duplicated logic
- naming clarity

Acceptance:

- code reviews become consistent
- clean-code quality stops drifting over time

## Suggested Execution Order

1. Add unit tests for existing modules.
2. Add e2e coverage for core flows.
3. Finish module-pattern consistency.
4. Refine shared infrastructure files.
5. Standardize Prisma/query discipline.
6. Tighten naming, duplication, and review discipline.

## Recommended First Sprint

If you want the highest ROI first, do these next:

1. Add tests for `AuthService` and `OrdersService`.
2. Add e2e tests for auth and order flows.
3. Standardize the remaining shared response/error behavior.
4. Review `api-exception.filter.ts` for focused extraction.

## Final Note

Reaching `10/10` is not about making the project more complicated.

It is about making every part of the codebase predictable, focused, safe to change, and backed by verification.

If this roadmap is followed well, the biggest jump in quality will come from:

- tests
- consistency
- disciplined refactoring
- protecting the architecture from future drift
