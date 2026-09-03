- authorization/business-rule failures
- transaction-related flows in orders

Acceptance:

- each core service has meaningful `.spec.ts` coverage
- mocks are isolated and readable
- important business rules are explicitly tested

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