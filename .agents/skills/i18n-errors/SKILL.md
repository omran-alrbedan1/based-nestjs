---
name: i18n-errors
description: Implement and maintain translated backend errors and success messages in this NestJS API using nestjs-i18n, Accept-Language, centralized translation keys, AppException, ResponseMessage keys, and the global API exception filter.
---

Use this skill whenever you add or change:

- user-facing backend error messages
- user-facing backend success messages
- DTO validation messages
- authentication or authorization failures
- Prisma or database errors exposed to API clients
- exception filters, guards, pipes, interceptors, or translated response behavior

## Goal

All user-facing API messages in this repository must be:

- translated through `nestjs-i18n`
- selectable by `Accept-Language`
- centralized in `src/i18n/en` and `src/i18n/ar`
- returned through one consistent response structure
- free of raw Prisma errors, stack traces, or internal implementation details

## Current Project Pattern

This repository uses:

- `I18nModule` in `src/app.module.ts`
- `I18nValidationPipe` in `src/main.ts`
- `AppException` in `src/common/exceptions/app.exception.ts`
- `ApiExceptionFilter` in `src/common/filters/api-exception.filter.ts`
- `ResponseMessage(...)` translation keys translated in `src/common/interceptors/transform.interceptor.ts`

### Error response shape

All translated API errors should follow this structure:

```json
{
  "statusCode": 400,
  "message": "Translated human-readable message",
  "error": {
    "code": "validation.invalid_input",
    "details": []
  },
  "timestamp": "2026-08-25T12:00:00.000Z",
  "path": "/api/v1/example"
}
```

### Success response shape

All translated API success responses should follow this structure:

```json
{
  "statusCode": 200,
  "message": "Translated human-readable message",
  "data": {}
}
```

## Rules

### 1. Do not hardcode user-facing messages

Do not hardcode English strings for either exceptions or `@ResponseMessage(...)`.

Do not write:

```ts
throw new BadRequestException('Email is invalid');
@ResponseMessage('User created successfully')
```

Instead use:

```ts
throw new AppException(400, 'validation.invalid_input');
@ResponseMessage('users.responses.user_created')
```

### 2. Keep translation keys centralized

Put keys in:

- `src/i18n/en/*.json`
- `src/i18n/ar/*.json`

Group by domain:

- `auth.json`
- `users.json`
- `category.json`
- `common.json`
- `database.json`
- `system.json`
- `validation.json`
- `responses.json`

Do not duplicate the same sentence under many keys when one shared key is enough.

### 3. Validation messages must use i18n keys

For DTO validation decorators, use `i18nValidationMessage(...)`.

### 4. Do not translate manually inside controllers

Controllers should not manually call i18n for responses.

Prefer:

- services throwing `AppException`
- guards throwing `AppException`
- strategies throwing `AppException`
- `@ResponseMessage(...)` storing translation keys only
- the global `TransformInterceptor` translating success messages
- the global `ApiExceptionFilter` formatting and translating errors
- the global `I18nValidationPipe` handling validation exceptions

### 5. Never expose internal database details

Do not return:

- raw Prisma error messages
- SQL details
- stack traces
- internal config failures

Map them to safe translation keys and let `ApiExceptionFilter` sanitize the response.

### 6. Respect language resolution

The API language is selected from `Accept-Language`.

Supported languages:

- `en`
- `ar`

Fallback language:

- `en`

## When adding a new translated message

1. Choose the correct domain file under `src/i18n/en` and `src/i18n/ar`.
2. Add the same key in both languages.
3. For errors, throw `AppException` with that key.
4. For success responses, pass that key to `@ResponseMessage(...)`.
5. If the message is validation-related, use `i18nValidationMessage(...)` instead.
6. Build the project and verify the response shape stays consistent.

## What to avoid

- hardcoded English strings in thrown exceptions
- hardcoded English strings in `@ResponseMessage(...)`
- translation calls scattered through controllers
- duplicate keys for the same meaning
- exposing raw Prisma failures
- adding a new response format for one module only

## Quick checks before finishing

- Are all new user-facing messages backed by translation keys?
- Did you add both `en` and `ar` entries?
- Does the success message still flow through `TransformInterceptor`?
- Does the error still flow through `ApiExceptionFilter`?
- Does the response avoid internal details?
- Does `npm run build` still pass?
