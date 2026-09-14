# Red Power Garage: backend overview and dashboard connection guide

Written for someone new to NestJS. Checked against this repository on September 10, 2026.

## 1. What this project does

This project is the **backend API** for Red Power Garage. It stores garage data, checks requests, manages staff login, and applies business rules. Your Red Power dashboard is the **frontend**: the screens, forms, tables, and buttons that call this API.

```text
Red Power dashboard
  -> HTTP request (for example, GET /api/v1/customers)
NestJS API
  -> validates permissions and input, runs business rules
Prisma
  -> reads or writes PostgreSQL
NestJS API
  -> returns JSON to the dashboard
```

The dashboard connects to the API, not directly to PostgreSQL. Database credentials and JWT signing secrets belong only in the backend.

The current stack is NestJS 11, TypeScript, Express, Prisma 7, PostgreSQL, JWT authentication, and English/Arabic API messages. These versions describe the dependencies declared here.

## 2. Learn these NestJS terms first

| Term | Meaning in this project | Example |
| --- | --- | --- |
| Module | Groups one feature and connects its dependencies | `CustomersModule` |
| Controller | Defines URLs and passes requests to a service | `GET /customers` |
| Service | Performs an operation and applies business rules | Create a vehicle and its ownership record |
| DTO | Describes allowed request fields and validates their values | `CreateCustomerDto` requires `name` and `phone` |
| Guard | Checks whether a request may enter a route | JWT login check and role check |
| Prisma | The typed database client used by services | `prisma.customer.findMany(...)` |
| Interceptor | Formats successful results consistently | Wraps results in `{ statusCode, message, data }` |
| Exception filter | Turns failures into consistent API errors | A validation failure becomes a translated response |
| Dependency injection | Nest creates a service and supplies it to classes that need it | A controller receives its service in its constructor |

A decorator such as `@Get()` or `@Controller('customers')` tells Nest how to use the class or method below it.

For a concrete example, submitting a customer form reaches `CustomersController.create`, passes DTO validation, calls `CustomersService.create`, writes through Prisma, and returns the created customer inside `data`.

## 3. Where to find things

Paths below are relative to the root of this backend repository.

| File or folder | What it owns |
| --- | --- |
| `src/main.ts` | Starts the server; sets `/api/v1`, CORS, validation, and Swagger |
| `src/app.module.ts` | Connects the feature modules, configuration, translations, throttling, and response handling |
| `src/modules/auth/` | Login, token refresh, logout, and JWT strategies |
| `src/modules/users/` | Staff profiles, password changes, and staff lookup |
| `src/modules/customers/` | Garage customers and their maintenance history |
| `src/modules/vehicles/` | Vehicles, owners, ownership transfers, and vehicle maintenance history |
| `src/modules/maintenance-cards/` | Garage visits, work items, status changes, photos, and signatures |
| `src/modules/maintenance-card-options/` | Configurable visit reasons, vehicle conditions, and vehicle items |
| `src/modules/search/` | Search across customers, vehicles, and cards |
| `src/modules/dashboard/` | Operational totals for the dashboard home screen |
| `src/common/` | Shared guards, decorators, pagination, errors, and supporting code |
| `src/common/interceptors/transform.interceptor.ts` | Success response envelope |
| `src/common/filters/api-exception.filter.ts` | Error response envelope |
| `src/i18n/en/`, `src/i18n/ar/` | English and Arabic messages |
| `src/prisma/` | Shared database connection service |
| `prisma/schema.prisma` | Database models, fields, relations, and enums |
| `prisma/migrations/` | Versioned SQL changes, including constraints and card numbering |
| `generated/prisma/` | Generated Prisma client; regenerate rather than edit |
| `src/storage/` | Private image storage; files are saved under `uploads/` |
| `.env.example` | Environment configuration template without real credentials |
| `docs/api-endpoints.md` | Existing route reference; see the corrections below |
| `docs/openapi.json` | Saved API specification; may lag behind source changes |

Start by reading a controller, then its DTO, then its service. You do not need to understand the entire application before connecting one screen.

## 4. Understand the garage data

**User** means a staff account that logs in. **Customer** means a person whose vehicle visits the garage. Customers do not have login accounts in the current API.

```text
Customer ---- VehicleOwnership ---- Vehicle
                    |
              MaintenanceCard
                    |
       work items, selected options,
       photos, signature, status events
```

A vehicle can have several ownership records over time. Its current ownership has `endedAt: null`. A maintenance card belongs to a specific ownership record and customer, preserving who owned the vehicle for that visit even after a transfer.

Examples:

- Creating a vehicle also creates its initial ownership for the supplied `customerId`.
- Transferring ownership ends the old record and creates a new one; it does not move old visits to the new customer.
- Deactivating a customer or vehicle preserves historical records.
- A maintenance card starts `OPEN`. Closing it records the staff member, time, and a status event.
- A `CLOSED` card is read-only for edits and media changes. Only a `SUPER_ADMIN` can reopen it.
- Closing requires all work items marked `isRequired: true` to be `COMPLETED` or `CANCELLED`.

| Value | Allowed API strings |
| --- | --- |
| Staff role | `ADMIN`, `SUPER_ADMIN` |
| Card status | `OPEN`, `CLOSED` |
| Work status | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED` |
| Transmission | `MANUAL`, `AUTOMATIC` |
| Fuel level | `EMPTY`, `QUARTER`, `HALF`, `THREE_QUARTERS`, `FULL` |

Translate labels for display, but send these exact enum values to the API.

## 5. Run the backend locally

You need Node.js/npm and PostgreSQL. The repository includes Docker Compose for PostgreSQL if you use Docker.

1. Install dependencies from the backend directory with `npm install`.
2. If `.env` does not already exist, copy `.env.example` to `.env`. Preserve an existing configuration.
3. Set `DATABASE_URL`, the PostgreSQL settings, and two independent JWT secrets of at least 32 characters. The example database port is `5436`.
4. If using the included database container, run `docker compose up -d postgres` and wait for it to become healthy.
5. Run `npx prisma generate` to generate the database client.
6. On your intended local development database, run `npx prisma migrate deploy` to apply the existing migrations. This changes that database. The migrations include SQL beyond the Prisma models, so do not substitute `db push` for this setup.
7. Run `npm run dev` to start the API in watch mode.

The actual watch script is `npm run dev`; the existing README's `npm run start:dev` command is not defined in `package.json`.

With `PORT=3000`:

- API base URL: `http://localhost:3000/api/v1`
- Public status route: `GET http://localhost:3000/api/v1`
- Swagger UI: `http://localhost:3000/api/docs` when `SWAGGER_ENABLED=true`

If the dashboard already uses port 3000, use another backend port, such as `PORT=3001`, and update the dashboard's API base URL accordingly.

`ALLOWED_ORIGINS` must contain the dashboard's exact origin, including its port, for example `http://localhost:5173`. It contains frontend origins, not API paths. Restart the API after configuration changes.

**First login prerequisite:** no public registration route or configured seed script was found. A fresh database needs an active staff user provisioned separately, with a bcrypt password hash and role `ADMIN` or `SUPER_ADMIN`. There are no documented default login credentials. Migrations alone do not provide a working login.

## 6. Login and session flow

All routes below are relative to `/api/v1`.

1. Send `POST /auth/login` with JSON `{ "email": "your-staff-email", "password": "your-password" }`.
2. Read `data.accessToken`, `data.refreshToken`, and `data.user` from the JSON response.
3. For protected requests, send `Authorization: Bearer <accessToken>`.
4. On access-token expiry, send `POST /auth/refresh` with **the refresh token in the Authorization header**. It is not a JSON body field or a cookie.
5. Store both tokens returned by refresh, then retry the original request once. Coordinate concurrent requests so they share one refresh attempt.
6. If refresh fails, clear the local session and return to login.
7. To log out, call `POST /auth/logout` with the access token, then clear both tokens from the dashboard session.

The example lifetimes are 15 minutes for access and 7 days for refresh; environment settings control them. Refresh tokens rotate, and the database holds one refresh-token hash per staff account. A later login replaces the stored refresh session. Logout removes that refresh session; it does not immediately invalidate an already-issued access JWT.

The API does not currently set authentication cookies. Choose token/session storage to fit the dashboard's existing architecture; do not assume cookies alone authenticate these endpoints.

Both staff roles can perform normal garage operations. Staff list/detail access, option management, and card reopening require `SUPER_ADMIN`. The API enforces roles; the dashboard should also hide unavailable actions.

## 7. Read responses correctly

Successful JSON responses have this shape (illustrative data):

```json
{
  "statusCode": 200,
  "message": "Customers retrieved successfully.",
  "data": {
    "items": [],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

For ordinary paginated lists, table rows are in `body.data.items`, and pagination is in `body.data.meta`. With Axios, `response.data` is the whole JSON body, so rows are in `response.data.data.items` unless a shared client unwraps it.

History endpoints have additional nesting: their paginated visits are in `body.data.history.items` and `body.data.history.meta`, alongside customer or vehicle context. Not every endpoint returns a paginated list.

Errors have this shape (illustrative validation failure):

```json
{
  "statusCode": 400,
  "message": "Invalid input.",
  "error": {
    "code": "validation.invalid_input",
    "details": [{ "field": "name", "messages": ["Name is required."] }]
  },
  "timestamp": "2026-09-10T12:00:00.000Z",
  "path": "/api/v1/customers"
}
```

Use `message` for display and `error.code` for application logic. Validation details can map to form fields; other errors may omit details or use a different shape.

- Send `Accept-Language: ar` for Arabic or `en` for English. English is the fallback.
- Check the HTTP result, not the wording of the translated message.
- Handle `400` validation, `401` authentication, `403` permissions, `404` missing records, `409` business conflicts, and `429` rate limits.
- Extra request fields are rejected. Build payloads from the DTO contract rather than submitting an entire frontend object.
- Use ISO timestamps with an explicit timezone, JSON booleans, numeric values, and server-returned UUIDs.
- Database decimal costs can arrive as strings; format money deliberately in the dashboard.

## 8. Map dashboard screens to endpoints

All paths in this table are relative to the API base URL.

| Dashboard feature | Main API calls |
| --- | --- |
| Login | `POST /auth/login` |
| Current staff profile | `GET /users/me`, `PATCH /users/me` |
| Change password | `PATCH /users/me/password` |
| Home statistics | `GET /dashboard/stats` |
| Customer table/form | `GET /customers`, `POST /customers`, `PATCH /customers/:id` |
| Customer detail/history | `GET /customers/:id`, `GET /customers/:id/maintenance-history` |
| Activate/deactivate customer | `PATCH /customers/:id/activate`, `PATCH /customers/:id/deactivate` |
| Vehicle table/form | `GET /vehicles`, `POST /vehicles`, `PATCH /vehicles/:id` |
| Vehicle details/history | `GET /vehicles/:id`, `GET /vehicles/:id/maintenance-history` |
| Ownership history/transfer | `GET /vehicles/:id/ownership`, `POST /vehicles/:id/transfer-ownership` |
| Activate/deactivate vehicle | `PATCH /vehicles/:id/activate`, `PATCH /vehicles/:id/deactivate` |
| Maintenance card table/form | `GET /maintenance-cards`, `POST /maintenance-cards`, `GET /maintenance-cards/:id`, `PATCH /maintenance-cards/:id` |
| Add work item | `POST /maintenance-cards/:id/required-works` |
| Update/delete work item | `PATCH` or `DELETE /maintenance-cards/:id/required-works/:workId` |
| Close/reopen card | `POST /maintenance-cards/:id/close`, `POST /maintenance-cards/:id/reopen` |
| Intake option lists | `GET /maintenance-card-options/:kind` |
| Global search | `GET /search?q=...` |
| Staff list (super admin) | `GET /users`, `GET /users/:id` |

Option `kind` is `visit-reasons`, `vehicle-conditions`, or `vehicle-items`. Super admins can create, update, activate, deactivate, or delete options subject to historical-use rules.

Ordinary lists use `page`, `limit`, and `search`, with a default page size of 20 and maximum of 100. Feature DTOs define additional filters. Global search uses `q`, requires 2–100 characters after trimming, and returns up to 10 matches per category. History filters include `status`, `receivedFrom`, and `receivedTo`; customer history also accepts `vehicleId`.

Dashboard statistics return `data.maintenance` (`openCards`, `closedCards`, `todayReceived`, `totalCards`), `data.customers` (`active`, `total`), and `data.vehicles` (`active`, `total`). “Today” uses the `Asia/Amman` calendar day. There are no revenue statistics in this response.

## 9. Connect the first maintenance-card form

Use this order to keep the relationships correct:

1. Select or create a customer. Customer creation requires `name` and `phone`; `email` is optional.
2. Select or create their vehicle. Vehicle creation requires `customerId`, `make`, `model`, `manufactureYear`, `plateNumber`, and `transmission`; `vin` and `color` are optional.
3. Read the selected vehicle's `currentOwnership.id` from the vehicle response. This is the `vehicleOwnershipId` needed below. The ownership endpoint instead calls the current record `currentOwner`.
4. Load the three option lists and send selected option IDs.
5. Create the maintenance card, then upload its photos/signature using the returned card ID.

Minimal card request, with placeholder IDs to replace with real UUIDs:

```json
{
  "customerId": "<selected-customer-uuid>",
  "vehicleOwnershipId": "<current-ownership-uuid>",
  "receivedAt": "2026-09-10T09:00:00.000Z",
  "mileage": 85000,
  "fuelLevel": "HALF",
  "customerApproved": false
}
```

Optional fields include `expectedDeliveryAt`, `customerComplaint`, `inspectionNotes`, `visitReasonIds`, `vehicleConditionOptionIds`, `vehicleItemOptionIds`, and initial `requiredWorks`.

- The customer and vehicle must be active, and the ownership must be current and belong to that customer.
- `customerApproved: true` requires `customerApprovalName` and `customerApprovedAt`. When creating an unapproved card, omit approval metadata.
- Expected delivery cannot precede receipt.
- Initial work items need `description` and a unique nonnegative `displayOrder`; they may include `isRequired` and `estimatedCost`.
- The server generates `cardNumber`, status, creator, and timestamps. Do not submit those fields.
- Card edits cannot change `customerId`, `vehicleOwnershipId`, or `receivedAt`.
- On card edits, an omitted selection array keeps its existing values; `[]` clears it; a supplied array replaces that selection set.
- **Do not send `requiredWorks` to the card PATCH endpoint.** Use the dedicated work-item routes. For example, PATCH a work item with `{ "status": "COMPLETED" }`.

## 10. Photos and signatures

Use multipart form data:

- Photos: `POST /maintenance-cards/:cardId/photos`; append each image under the exact field name `files` repeatedly. Do not use the literal key `files[]`. Optional `displayOrder` sets the starting order. The upload interceptor permits up to 20 files per request, 8 MiB each.
- Signature: `POST /maintenance-cards/:cardId/signature`; use the field `file`, up to 4 MiB.
- The storage service accepts JPEG, PNG, and WebP with matching file extensions and file signatures.
- Do not manually set the multipart `Content-Type` header when using browser `FormData`; let the browser add the boundary.

GET the same photos/signature collection paths to obtain metadata and private `contentUrl` values. Content URLs require the access-token header and return image bytes, not a JSON envelope. For browser display, fetch the content with authorization, convert it to a Blob URL, and revoke that Blob URL when finished. A plain image tag cannot attach your bearer token.

Resolve returned `/api/v1/...` content paths against the backend origin; do not add `/api/v1` twice. Do not treat filesystem storage keys as public image URLs. File bytes currently live under the backend's local `uploads/` directory, so hosting needs persistent storage for them as well as the database.

## 11. Integration details and current gaps

- The existing `docs/api-endpoints.md` omits the dedicated required-work routes and incorrectly suggests card PATCH can replace work sets. The current controller and DTO define the behavior described here.
- Its photo notation `files[]` means multiple files conceptually; the actual multipart field name is `files`.
- Use running Swagger plus source DTOs/controllers to resolve differences with saved documentation. A saved OpenAPI file is a snapshot, not proof of current runtime behavior.
- The global throttle is configured for 10 requests per 60 seconds, with login limited to 5 and refresh to 10 per minute; logout has an override of 20. Avoid aggressive polling, debounce search, and handle `429` responses. Check route-specific overrides when investigating limits.
- There is no public signup, staff-creation route, or configured account seed workflow. Provisioning the first user is a separate setup task.
- No invoice/payment, inventory/parts, or appointment modules are registered in the current app. A work estimate is not an invoice API. Dashboard screens for those features need a separate backend contract.
- This guide documents inspected source. It does not certify that your database is configured, that login credentials exist, or that the other dashboard is already connected. The dashboard code and its current task were not inspected for this document.

## 12. Suggested connection order

1. Configure one API base URL and confirm the public status route responds.
2. Implement login, current-user loading, token refresh, and logout in the dashboard's shared API/session layer.
3. Connect customer and vehicle lists, including empty states, pagination, errors, and filters.
4. Connect customer creation, vehicle creation, and ownership selection.
5. Connect maintenance-card creation/details and individual work items.
6. Connect close/reopen, photos, signatures, and history.
7. Connect dashboard statistics, global search, and super-admin option screens.

Keep API calls in the dashboard's established data-access layer. Map backend fields to existing UI models there so screen components remain focused on presentation.

For backend changes, follow the repository's `README.md`, `AGENTS.md`, and relevant `.agents/skills/`. Preserve feature modules and the existing JWT authentication system. Useful verification commands are `npm run build` and `npm test`; inspect individual tests before assuming they use a real database. This documentation-only update did not run the application or tests.

## 13. Paste this into the Red Power dashboard task

```text
Connect this Red Power dashboard to the existing NestJS backend.

Backend repository:
C:\Users\Omran\Desktop\red power\based-nestjs

First read PROJECT_OVERVIEW.md in that repository. Inspect its current
controllers and DTOs when implementing requests; docs/api-endpoints.md
and docs/openapi.json may lag behind source changes.

Follow the dashboard project's own instructions and architecture.
Inspect its existing API client, session handling, and screen models first.
Use a configurable API base URL (backend default:
http://localhost:3000/api/v1; confirm the actual port).

Implement the connection in the order described in the overview.
Use JWT bearer authentication, refresh-token rotation, the shared response
envelope, English/Arabic error messages, and backend role restrictions.
Maintenance cards need vehicleOwnershipId; work updates use dedicated
required-works routes; media content needs authenticated requests.

Identify dashboard features without matching backend endpoints and report
those gaps. Do not invent endpoints or assume an initial staff account exists.
Preserve the dashboard's existing design and verify each connected flow.
```

If the other task cannot access this folder, attach this Markdown file there. Another task should not be assumed to know this conversation automatically.
