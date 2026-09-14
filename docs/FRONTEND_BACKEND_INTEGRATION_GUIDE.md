# Connect the Red Power dashboard to the NestJS backend

## Purpose and inspection scope

This guide explains the changes needed to connect the **existing dashboard**, based on both projects' source code. It is an implementation guide; the connection has not been implemented by creating this document.

| Project | Location |
| --- | --- |
| Frontend repository | https://github.com/omran-alrbedan1/red-power-dashboard |
| Frontend local checkout | `C:\Users\Omran\Desktop\red power\red-power-dashboard` |
| Backend local checkout | `C:\Users\Omran\Desktop\red power\based-nestjs` |
| Frontend commit inspected | `f6c10a0691755b8d414cfabf914d4aa10f1b953e` |

Reverified September 11, 2026. The local checkout's `origin` matches the supplied GitHub URL and its working tree was clean. A successful `git ls-remote origin HEAD` returned the same frontend commit shown above. Backend HEAD was `ddfe5b73c2718a69416ad024e246aa37cb27b336`; this guide describes the local working tree, including existing uncommitted package/setup documentation changes. All frontend paths below refer to this inspected checkout; verify them again if the code changes.

Read [PROJECT_OVERVIEW.md](../PROJECT_OVERVIEW.md) for beginner-level NestJS explanations and backend setup. This guide focuses on the actual frontend migration.

For the frontend developer: start with sections 2–4 for connectivity and authentication, then migrate customers/vehicles before receipts. Sections 5–10 explain the contract differences that prevent a simple URL replacement. Section 13 contains concrete requests, and section 14 identifies backend follow-ups. The API inventory is in [api-endpoints.md](api-endpoints.md); import [the Postman collection](RedPowerGarage.postman_collection.json) for manual exploration. Source code takes precedence over saved API documents.

## 1. What exists today

The dashboard uses React 18, Vite, TypeScript, React Router, TanStack Query, React Hook Form, Zod, and i18next. Axios is installed, but no actual Axios/fetch requests were found in the inspected `src` code.

The current data flow is:

```text
Page -> feature hook -> mock feature service -> in-memory data
```

The target data flow is:

```text
Page -> feature hook -> feature service -> shared HTTP client
     -> NestJS controller -> service -> Prisma -> PostgreSQL
     <- feature mapper <- JSON response
```

Keep the existing Arabic/RTL design, components, forms, and query infrastructure. Replace mock data access and adjust contracts where necessary.

| Existing frontend file | Current behavior | Needed change |
| --- | --- | --- |
| `src/features/auth/services/auth.service.ts` | Chooses a mock role from the email; returns a fake user | Call real login, refresh, logout, and profile endpoints |
| `src/features/auth/context/AuthContext.tsx` | Treats a stored `red-power-user` object as a session | Validate a real token-backed session and handle startup loading |
| `src/features/customers/services/customer.service.ts` | Mutates local customer/vehicle arrays | Call customer, vehicle, and history APIs |
| `src/features/maintenance/services/maintenance.service.ts` | Generates IDs, receipt numbers, statuses, and activity locally | Use server records, work-item endpoints, and server lifecycle rules |
| `src/features/dashboard/hooks/useDashboardStats.ts` | Imports maintenance internals and counts mock statuses | Call a dashboard-owned service for `/dashboard/stats` |
| `src/constants/endpoints.ts` | Contains old product/vendor routes | Add garage endpoints deliberately; do not repurpose unrelated paths |
| `src/App.tsx` | Private route checks only `isAuthenticated` | Wait for session initialization, then allow or redirect |
| `src/main.tsx` | Creates the QueryClient and providers | Configure request retries/cache policy and arrange session cache cleanup |

The migration plan marks backend replacement as unfinished under **Phase 5 — Quality and operational readiness**. Follow the frontend's `AGENTS.md` and `.agents/skills/` when implementing. Its plan currently assumes identical Admin/Super Admin permissions; that assumption conflicts with the backend's restrictions and needs updating during integration.

## 2. Start both applications

Use separate terminals and ports:

| Application | Suggested address | Start command |
| --- | --- | --- |
| Backend | `http://localhost:3000` | `npm run dev` in `based-nestjs` |
| Frontend | `http://localhost:5173` | `npm run dev -- --port 5173 --strictPort` in `red-power-dashboard` |

First complete PostgreSQL, environment, Prisma generation, and migration setup from the backend overview. An active staff account with a bcrypt password hash must exist: the backend has no signup endpoint or configured account seed. The mock emails in the dashboard are not real backend credentials.

Create a frontend `.env.local` with:

```dotenv
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

This is a **proposed variable** to wire into the HTTP client; adding it alone does not change the current mock services. Frontend Vite variables are public browser configuration. Never put `DATABASE_URL` or JWT signing secrets there.

In the backend `.env`, include the frontend origin:

```dotenv
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173
SWAGGER_ENABLED=true
```

Preserve any other needed origins as comma-separated values. Restart the applications after changing configuration. If using a different port, update the base URL and allowed origin accordingly.

Check `GET http://localhost:3000/api/v1` and open `http://localhost:3000/api/docs` for Swagger. Swagger's path is `/api/docs`, not `/api/v1/docs`.

## 3. Add one shared HTTP boundary

Suggested new frontend files, not files that already exist:

```text
src/lib/api/client.ts          Axios instance and request/response handling
src/lib/api/api.types.ts       Success, error, and pagination contracts
src/lib/api/api-error.ts       Normalized request errors
```

Keep feature-specific DTOs and mapping functions inside their own feature. Do not import generated Prisma models into browser code or import one feature's internal service into another feature. If ownership selectors need a shared contract, expose a deliberate boundary rather than importing customer fixtures into maintenance.

The shared client should:

1. Read `import.meta.env.VITE_API_BASE_URL` and append relative routes such as `/customers` exactly once.
2. Attach the current access token as `Authorization: Bearer <accessToken>`.
3. Attach the current language as `Accept-Language: ar` or `en`.
4. Unwrap successful JSON envelopes consistently in one place.
5. Preserve HTTP status, `error.code`, `message`, and validation details when normalizing errors.
6. Use a separate response path for image blobs and multipart uploads.
7. Coordinate a single refresh attempt when concurrent requests receive `401`; retry each request at most once afterward.
8. Avoid refresh loops for login/refresh failures. Treat `403` as a permission error, not a reason to refresh.

For an Axios call, `response.data` is the whole backend JSON envelope. The business result is `response.data.data`. If the client unwraps it, a feature service should not unwrap it again.

```ts
// Proposed frontend contracts; this example does not implement the client.
type ApiSuccess<T> = { statusCode: number; message: string; data: T }
type Page<T> = {
  items: T[]
  meta: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNextPage: boolean
    hasPreviousPage: boolean
  }
}
type ApiFailure = {
  statusCode: number
  message: string
  error: { code: string; details?: unknown }
  timestamp: string
  path: string
}
```

Customer, vehicle, staff, and maintenance-card lists return `data.items` and `data.meta`. History routes instead return context plus `data.history.items` and `data.history.meta`. Configurable-option lists return an array directly in `data`; photo lists also use an array. Global search returns grouped arrays. Default pagination is page 1, limit 20, with a maximum limit of 100. Do not display the first API page as if it were the entire database.

## 4. Replace mock authentication first

All API paths below are relative to `/api/v1`.

| Operation | Request | Result/use |
| --- | --- | --- |
| Login | `POST /auth/login`, JSON `{ email, password }` | `data.accessToken`, `data.refreshToken`, `data.user` |
| Current user | `GET /users/me`, access-token header | Confirm and restore authenticated staff profile |
| Refresh | `POST /auth/refresh`, **refresh-token** bearer header | Replace both tokens with the returned pair |
| Logout | `POST /auth/logout`, access-token header | Revoke stored refresh session; clear local session/cache |
| Profile update | `PATCH /users/me` | Route exists, but its request DTO needs a backend fix; see section 14 |
| Password update | `PATCH /users/me/password` | JSON `{ currentPassword, newPassword }`; refresh session is revoked after success |

The backend does not set authentication cookies. For a first direct SPA integration, choose and document token storage explicitly: memory avoids persistent browser storage but requires login after reload unless another session mechanism is implemented; session storage supports tab reloads but remains accessible to JavaScript. Do not assume the existing user-only localStorage object authenticates any request. A server-managed cookie session would require additional architecture and is not the current API contract.

Add a session state such as `initializing`, `authenticated`, or `anonymous`. Clear or migrate the old `red-power-user` mock entry. During initialization, validate the session before rendering private screens. On logout, clear protected query data as well as user/tokens so another login cannot see cached records from the previous session.

The current `AuthProvider` wraps `QueryClientProvider`; it cannot call `useQueryClient` in that arrangement. During implementation, move the query provider above it or deliberately inject cache cleanup. Do not add a hook outside its provider.

Map backend `firstName`/`lastName` to the UI's `name`, using email as a fallback when names are missing. Map `ADMIN` to `admin` and `SUPER_ADMIN` to `super_admin` if preserving existing UI role types. Never derive a role from the email.

Both roles can manage normal garage operations. Reopening cards, managing configurable options, and listing/reading other staff require `SUPER_ADMIN`. Preserve these restrictions in the UI. The backend remains the authority.

Refresh tokens rotate; one hash is stored per staff account. A later login replaces its refresh session. Logout does not immediately revoke an already-issued access JWT. The `.env.example` lifetimes are 15 minutes and 7 days; runtime settings control them.

Login validates password format as well as credentials: at least eight characters, uppercase and lowercase letters, and a digit or non-word character. Invalid input can therefore return `400` before credential checking. The login service uses the supplied email for lookup without normalizing it; match the provisioned account email and do not trim passwords.

Exclude `auth.errors.current_password_incorrect` from automatic token refresh: that `401` is a form error. After a successful password change, clear the local session and require login because the refresh token was revoked. Use the translated outer envelope `message`; the password endpoint also returns a hardcoded English message inside `data`.

## 5. Map customer and vehicle contracts

| Frontend field/behavior | Backend contract | Implementation decision |
| --- | --- | --- |
| Customer `name`, `phone`, `email` | Same names | Trim fields; omit blank optional email |
| Customer `address`, `notes` | No matching fields | Mark unavailable or plan backend support; do not pretend they save |
| Vehicle `year` | Required `manufactureYear` | Rename in request mapper; require a valid year |
| Vehicle `transmissionType` | Required `transmission` | Map `automatic/manual` to `AUTOMATIC/MANUAL` |
| Vehicle `customerId` | Required at creation; ownership relation on reads | Keep an ownership-aware UI model |
| Vehicle `mileage` | Stored on maintenance cards | Collect per visit, not in vehicle create/update requests |
| Vehicle `fuelType`, `notes` | No matching fields | Hide/defer persistence or extend the backend separately |
| Vehicle `vin` | Optional, exactly 17 characters if supplied | Omit empty string; validate nonempty values |
| Vehicle `color` | Optional `color` | Direct mapping |
| Generated `cus-*` / `veh-*` IDs | Server UUIDs | Remove local ID generation from API mode |

The backend year range is 1886 through the current UTC year plus one; the existing frontend allows an optional year between 1900 and 2100. Align the frontend schema to the API. Transmission is also currently optional in the UI but required by the API.

Service mappings:

| Existing service operation | API call |
| --- | --- |
| `customerService.list/search` | `GET /customers?page=1&limit=20&search=...&isActive=true` |
| `getById` | `GET /customers/:id` |
| `create` | `POST /customers` |
| `update` | `PATCH /customers/:id` |
| `listVehicles(customerId)` | `GET /vehicles?customerId=...` with pagination, or the customer's `currentVehicles` detail array |
| `addVehicle(customerId, input)` | `POST /vehicles` with `customerId` and mapped vehicle fields |
| `getHistory(customerId)` | `GET /customers/:id/maintenance-history` |
| Ownership transfer | `POST /vehicles/:id/transfer-ownership` with `{ customerId }` |

The customer detail response has `currentVehicles`, each with `ownershipId`. Vehicle detail uses `currentOwnership.id`. Both represent the identifier needed to create a card. Preserve that identifier alongside the vehicle's own `id`.

There is **no bulk vehicle-count endpoint** matching `getVehicleCounts()`, and the customer list does not include vehicle counts. Do not compute global counts from one page or request every customer detail on every render. Remove/defer that count column or plan an aggregate backend field.

### Search is not a direct replacement

The current customer mock has separate name, phone, plate, VIN, make, and model filters. The backend customer list accepts `search` over name/phone/email, plus `isActive`, `page`, and `limit`. It does not accept those individual filter fields or search customer vehicles.

Vehicle search is available through `/vehicles?search=...`, and grouped global search through `/search?q=...` (2–100 trimmed characters, up to 10 matches per category). Neither is an exhaustive customer-directory search across vehicles. For the first integration, adjust the customer filter UI to the supported contract and offer vehicle/global search separately; preserving the exact multi-field customer search requires a backend enhancement. Do not silently combine filters into a string and claim equivalent results.

## 6. Reconcile maintenance states before wiring buttons

| Frontend card status | Backend card status |
| --- | --- |
| `open` | `OPEN` |
| `closed` | `CLOSED` |
| `draft`, `in_progress`, `waiting_parts`, `ready_for_delivery`, `cancelled` | No corresponding persisted card status |

Recommended first integration: show `open/closed` for persisted cards and remove unsupported transition/filter choices from connected flows. Keep any unsaved draft clearly local. If the extra workflow stages remain a product requirement, implement them in the backend separately; do not collapse all of them to `OPEN` and then present them as saved states.

Work-item statuses do map directly by explicit enum conversion: `pending`, `in_progress`, `completed`, `cancelled` correspond to `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.

The mock's `canTransitionWorkStatus` restricts transition order. The backend currently accepts enum updates on open cards without that same transition graph. Remove accidental mock-only restrictions or agree on a matching backend rule before enforcing them as product policy.

Close through `POST /maintenance-cards/:id/close`, not a generic status PATCH. Required work must be completed or cancelled. Reopen through `POST /maintenance-cards/:id/reopen` as a super admin. Closed cards are read-only for work, card edits, and media changes.

## 7. Convert the receipt form deliberately

Current owner: `src/features/maintenance/pages/receipt-create.page.tsx`, its section components, and `validation/maintenance.validation.ts`.

| Frontend model/form field | Backend field or source |
| --- | --- |
| `receiptNumber` | Read server `cardNumber`; do not generate it locally |
| `customerId` | Required existing customer UUID |
| `vehicleId` | Resolve current ownership, then send required `vehicleOwnershipId` |
| Customer/vehicle snapshots | Derive display values from response relations; not accepted create fields |
| Visit date/time | Required `receivedAt` ISO timestamp; do not substitute record `createdAt` when displaying receipt time |
| `vehicleMileage` | Required integer `mileage >= 0` |
| `condition.fuelLevel` / form `fuelLevel` | Required `fuelLevel` enum in uppercase |
| `complaint` | `customerComplaint` |
| `visitReason` text | Selected `visitReasonIds` from backend options |
| Structured receipt conditions | `vehicleConditionOptionIds` plus intentional `inspectionNotes` text |
| `itemsLeftInCar` / `itemsLeft` strings | Selected `vehicleItemOptionIds` |
| `workItems` | `requiredWorks` at creation only |
| `approval.approved` / form `approved` | Required boolean `customerApproved` |
| Approval name and time | `customerApprovalName`, `customerApprovedAt`; required when approved |
| `approval.amount` / `approvalAmount` | No matching persisted field |
| Separate delivery date/time | One `expectedDeliveryAt` ISO timestamp |
| `receiverName` | Server associates authenticated staff through `createdBy`; not a create field |
| `activityEvents` | Map available server `statusEvents`; do not submit fabricated audit events |

The backend preserves the customer/ownership relationship of a visit, but returns related customer and vehicle records rather than immutable copies of every name/vehicle field. Do not describe mapped `customerSnapshot`/`vehicleSnapshot` objects as permanent historical snapshots.

Load options using `GET /maintenance-card-options/visit-reasons`, `/vehicle-conditions`, and `/vehicle-items`. Use real option IDs, not hardcoded labels. Selecting “other” does not create an arbitrary option through the card request. Either use an existing option and explicitly save additional text in a suitable notes field, or plan a backend field. Ordinary admins cannot create configurable options.

Each path above shares the `/maintenance-card-options` prefix. Fetch selectable options with `?isActive=true`; an unfiltered request includes inactive options. Each option has one stored `label`, not separate Arabic/English label fields. `Accept-Language` translates API messages, not these stored labels. Render previously selected options from card detail even when they are no longer selectable.

Combine dates/times in the intended garage timezone and convert to an explicit-offset or UTC timestamp. Do not infer garage time from an arbitrary user's computer timezone. Expected delivery cannot precede receipt.

The current form lacks the complete approval-name/time flow required by the API. Add those inputs or explicit capture behavior before allowing approved submissions. When `customerApproved` is false on creation, omit approval metadata.

### Save sequence

1. Select an existing customer or create one, then retain its returned UUID.
2. Select an owned vehicle or create one, then retain the returned current ownership UUID.
3. Build the allowed card DTO from the form and submit it.
4. Retain the returned card UUID and `cardNumber`.
5. Upload photos/signature as separate operations if provided.

These are separate API writes, not one atomic transaction. If card creation fails after customer/vehicle creation, reuse those records on retry. Do not recreate them or automatically delete them to undo the form.

Example card payload, replacing placeholder UUIDs with real returned IDs:

```json
{
  "customerId": "<customer-uuid>",
  "vehicleOwnershipId": "<ownership-uuid>",
  "receivedAt": "2026-09-10T09:00:00+03:00",
  "mileage": 85000,
  "fuelLevel": "HALF",
  "customerApproved": false,
  "customerComplaint": "Inspect braking noise",
  "requiredWorks": [
    {
      "description": "Inspect brakes",
      "displayOrder": 0,
      "isRequired": true,
      "estimatedCost": 25
    }
  ]
}
```

Do not send local IDs, `status`, `receiptNumber`, snapshots, `receiverName`, or activity arrays in this request. The backend rejects extra fields.

## 8. Work updates, lists, history, and media

### Work items

| Operation | Endpoint | Response business data |
| --- | --- | --- |
| Add work | `POST /maintenance-cards/:id/required-works` | Created work item |
| Edit work | `PATCH /maintenance-cards/:id/required-works/:workId` | Updated work item |
| Delete work | `DELETE /maintenance-cards/:id/required-works/:workId` | `{ id: workId }` |

The mock methods return the whole card. The backend returns the work item instead. Update consumers accordingly: invalidate the card using the mutation's input `cardId`, not returned `data.id`, which is the work ID.

Map `description`, `isRequired`, `estimatedCost`, and status where supported. Add a stable unique `displayOrder` per card. Initial work creation does not accept status: it starts `PENDING`; the update endpoint accepts status. Do not submit frontend-only `quantity`, `progress`, or `assignee`. Their persistence requires separate backend work. Do not multiply cost by a hidden quantity or fabricate progress percentages.

The frontend form defaults `isRequired` to false while the backend defaults omitted `isRequired` to true. Send the selected boolean explicitly and make the intended default clear to users. Costs can be null and serialized as decimal strings; retain “no estimate” distinctly from zero when mapping to display values.

The main card PATCH excludes `requiredWorks`, `customerId`, `vehicleOwnershipId`, and `receivedAt`. Supplied option arrays replace their set, omitted arrays preserve it, and `[]` clears it.

### Lists and history

Use a separate list-row model from the full receipt-detail model. Do not assume list responses contain every detail, work item, or timeline event. Supported card filters are `page`, `limit`, `search`, `status`, `customerId`, `vehicleId`, `receivedFrom`, and `receivedTo`.

Card `search` matches **cardNumber only**. It does not search customer names or plates. History supports pagination, status, and receipt-date bounds; customer history additionally supports `vehicleId`. Date upper bounds are inclusive in these queries, so a date-only midnight bound excludes the rest of that day. Send explicit timestamps representing the desired garage-local range.

Customer history is `/customers/:id/maintenance-history`; vehicle history is `/vehicles/:id/maintenance-history`. History rows are visit summaries, not the mock's `{ visits, workItems }` aggregate. Fetch card details when opening a visit to show its work. Do not claim totals or work summaries that the history API does not return.

Never filter customer history only by currently owned vehicles: that would remove visits from before an ownership transfer. The backend history preserves those visits.

Map the available `statusEvents` to a timeline for creation/close/reopen using server dates and actors. The API does not expose the mock's full audit stream of every work edit. Do not invent those events on reload.

### Media

Photos use multipart `POST /maintenance-cards/:cardId/photos` with repeated **`files`** fields (not the literal key `files[]`), up to 20 per request and 8 MiB each. Signature uses `/signature` with **`file`**, up to 4 MiB. Supported storage image types are JPEG, PNG, and WebP with valid content and extension.

Let the browser set the multipart boundary. Retrieve metadata from the photos/signature GET routes, then fetch private `contentUrl` values with the access-token header and a blob response. Resolve those `/api/v1/...` URLs against the API origin rather than appending the base prefix twice. Use and revoke object URLs for image display. Content routes return bytes, not the JSON envelope. Upload failures should leave the successfully created card available for upload retry.

## 9. Update query caching and dashboard statistics

Existing keys are inconsistent: the list hook uses `["maintenance-cards"]`, while work/close hooks invalidate `["maintenance", "list"]`. That does not refresh the actual list. Define shared key factories per domain and migrate hooks and invalidations together.

The detail query also uses `["maintenance-card", id]`, while work/close hooks invalidate `["maintenance", "card", id]`. Correct both mismatches. The timeline can select `statusEvents` from the same cached card-detail query rather than fetching the card again under an unrelated key.

Include pagination and filters in list keys. Invalidate relevant detail, list, history, and dashboard queries after writes. Use mutation input IDs when response shapes differ. Clear protected caches on logout; if the session layer needs query hooks, fix provider nesting first.

Add a dashboard-owned service and map `/dashboard/stats`:

| Response field | Suggested tile |
| --- | --- |
| `maintenance.openCards` | Open cards |
| `maintenance.closedCards` | Closed cards |
| `maintenance.todayReceived` | Received today |
| `maintenance.totalCards` | Total cards |
| `customers.active` / `customers.total` | Active / total customers |
| `vehicles.active` / `vehicles.total` | Active / total vehicles |

Update `Dashboard.tsx` and its Arabic/English labels. The existing in-progress/waiting-parts/ready-for-delivery counters have no matching backend statistic. Do not show zero as if it were a measured value. “Today” is calculated by the backend in `Asia/Amman`.

Configure query retries/refetching deliberately: the globally registered throttle defaults to 10 requests per 60 seconds **per controller handler and client IP**, using the installed guard's default key. It is not one shared ten-request allowance across all endpoints. Login allows 5, refresh 10, and logout 20 per 60 seconds. Requests for different IDs handled by the same method share that handler's bucket. Debounce search, avoid aggressive polling or redundant detail requests, and handle `429` without a retry loop. Validate the throttle against actual dashboard traffic before deployment. Current CORS settings do not expose `Retry-After`; browser code cannot rely on reading it cross-origin until the backend exposes it.

## 10. Error and form behavior

- Render translated `message`; branch on stable `error.code` or HTTP status.
- For validation details shaped as `{ field, messages }[]`, translate backend field paths to frontend form paths, for example `manufactureYear -> year` and `requiredWorks.0.description -> workItems.0.description`.
- Normalize blank optional inputs to omission where required; an empty string is not a valid UUID, enum, date, VIN, or email.
- Keep real `404` errors distinct from the mock's `undefined` return value.
- Handle `409` conflicts such as closed cards, invalid ownership, and incomplete required work with a useful message and refreshed server data.
- Keep loading, empty, permission-denied, and failed-load states distinct. A failed statistics request must not appear as zero records.
- Never fall back to mock arrays when an API request fails in connected mode.

## 11. Implementation order and completion checks

1. **Foundation/session:** add the shared client, envelope/error handling, real auth, initialization, and cache cleanup. Verify incorrect credentials fail and valid login survives the chosen session lifecycle.
2. **Customers/vehicles:** replace services, introduce paginated results, align Zod schemas and payload mapping, and handle ownership IDs. Verify newly created records remain after a reload.
3. **Receipt creation/details:** replace fixtures and selectors with server data, reconcile statuses and unsupported fields, map detailed responses, and implement the multi-request save flow.
4. **Work/lifecycle:** wire dedicated work routes, correct cache keys, close/reopen permissions, and the available status timeline.
5. **History/media:** preserve historical ownership behavior, add paginated visit summaries, and verify private uploads/downloads and retries.
6. **Dashboard/profile:** use real counts and staff identity, removing mock identity fallbacks from connected views.
7. **Verification:** run the frontend build/lint and appropriate backend checks if backend code changed. Inspect existing failures before attributing them to integration. Test the flows below and update Phase 5's checklist only for delivered work.

Manual integration checklist:

- [ ] Valid/invalid login, expired access token, successful refresh, failed refresh, logout, and reload behavior.
- [ ] Admin cannot reopen cards or manage options; super admin can perform allowed operations.
- [ ] Customer and vehicle creation persists; unsupported fields are not presented as saved.
- [ ] More than one page of records can be searched and browsed correctly.
- [ ] Receipt creation uses the correct current ownership and handles partial-save retries without duplicate records.
- [ ] Updating a work item refreshes the correct card and list.
- [ ] Required pending work blocks closure; completed/cancelled required work permits it.
- [ ] Closed cards reject edits; reopening works only for authorized staff.
- [ ] Ownership transfer leaves prior visits under the original customer and in the vehicle's full history.
- [ ] Photos/signatures render using authenticated content requests and retry independently.
- [ ] Arabic validation messages, RTL forms/tables/dialogs, loading/empty/error states, and `429` behavior work.
- [ ] No active connected feature reads fixture arrays or creates fake server IDs, roles, receipt numbers, or audit entries.

Documentation inspection alone does not verify runtime connectivity. No application code or database was changed to produce this guide, and no integration checks above have been marked complete.

## 12. Handoff prompt for the dashboard task

```text
Implement Phase 5 backend integration for this Red Power dashboard.

Read the frontend AGENTS.md, applicable project skills, and
docs/RED_POWER_MIGRATION_PLAN.md first. Then read:
C:\Users\Omran\Desktop\red power\based-nestjs\docs\FRONTEND_BACKEND_INTEGRATION_GUIDE.md
and the linked PROJECT_OVERVIEW.md.

Inspect current source before edits; the guide is based on frontend commit
f6c10a0691755b8d414cfabf914d4aa10f1b953e, matching remote HEAD on September 11, 2026.

Preserve the Arabic/RTL design and reusable components. Replace the actual
mock feature services incrementally. Implement real JWT session handling,
pagination, DTO mapping, ownership-aware receipt creation, individual work
updates, API error handling, and consistent query invalidation.

Use current backend controllers and DTOs as the contract. Reconcile unsupported
card states, form fields, search behavior, and Admin/Super Admin permissions
explicitly. Do not invent endpoints or silently pretend unsupported fields save.

Follow the guide's implementation order and verify each connected flow.
Record delivered work and remaining contract gaps in the frontend migration plan.
```

This document remains in the backend repository so it can be read from either task. No frontend migration-plan boxes were changed: implementation has not yet been delivered.

## 13. Concrete request and response mapping reference

All requests below use the configured API base `/api/v1`. These are request examples, not an implemented HTTP client. Send `Accept-Language: ar` for Arabic messages and `Content-Type: application/json` for JSON bodies. Supply real IDs returned by prior requests.

### Login and first authenticated read

```http
POST /api/v1/auth/login
Content-Type: application/json
Accept-Language: ar

{"email":"<provisioned-staff-email>","password":"<actual-password>"}
```

Read `data.accessToken`, `data.refreshToken`, and `data.user` from the response. Then:

```http
GET /api/v1/customers?page=1&limit=20
Authorization: Bearer <accessToken>
Accept-Language: ar
```

For refresh, send `POST /api/v1/auth/refresh` with `Authorization: Bearer <refreshToken>` and no required body. Replace both stored tokens and the returned user. The access-token interceptor must not overwrite this refresh header. Coordinate refresh in one shared promise, and discard late refresh results if logout or a different login occurred while it was pending.

### Create a customer, then its vehicle

`POST /customers`:

```json
{
  "name": "Ahmad Saleh",
  "phone": "+962790000000",
  "email": "customer@example.com"
}
```

`POST /vehicles`, using the returned customer `data.id`:

```json
{
  "customerId": "<customer-uuid>",
  "make": "Toyota",
  "model": "Corolla",
  "manufactureYear": 2022,
  "plateNumber": "12-34567",
  "transmission": "AUTOMATIC",
  "color": "White"
}
```

The created vehicle returns `data.id` and `data.currentOwnership.id`. Send the latter as `vehicleOwnershipId` in the card payload in section 7. A vehicle list/detail's owner customer ID is under `currentOwnership.customer.id`; do not assume every vehicle response contains a top-level `customerId`. Vehicle PATCH returns basic vehicle fields without ownership, so invalidate/refetch detail instead of replacing a complete detail cache with that partial shape.

### Update work and close the card

`PATCH /maintenance-cards/<card-uuid>/required-works/<work-uuid>`:

```json
{
  "description": "Inspect and replace brake pads",
  "status": "COMPLETED",
  "estimatedCost": 45.5
}
```

Then `POST /maintenance-cards/<card-uuid>/close` with no required body. The close response contains the updated card. If another required work item remains pending or in progress, expect `409` with `error.code = maintenanceCards.errors.required_work_incomplete`. Refresh detail and identify the remaining work. `POST` lifecycle endpoints currently use Nest's default `201`; handle all successful 2xx statuses, not only `200`. Auth endpoints explicitly use `200`.

### Read detailed receipt relations

These paths are inside the unwrapped `data` from `GET /maintenance-cards/:id`:

| UI information | Response path |
| --- | --- |
| Receipt number and time | `cardNumber`, `receivedAt` |
| Customer | `customer` |
| Vehicle and visit ownership | `vehicleOwnership.vehicle`, `vehicleOwnership.id` |
| Receiver | `createdBy.firstName`, `createdBy.lastName`, fallback `createdBy.email` |
| Work rows | `requiredWorks` |
| Selected visit reasons | `visitReasons[].visitReason` |
| Selected condition options | `conditionOptions[].conditionOption` |
| Selected items | `itemOptions[].itemOption` |
| Lifecycle timeline | `statusEvents[]`, including `fromStatus`, `toStatus`, `createdAt`, `changedBy` |
| Approval | `customerApproved`, `customerApprovalName`, `customerApprovedAt` |

Use the media endpoints for photos/signature metadata. A storage key on a record is not a public image URL. Fuel values are exactly `EMPTY`, `QUARTER`, `HALF`, `THREE_QUARTERS`, `FULL`. Decimal estimates may arrive as strings or null; choose a deliberate decimal/display conversion rather than directly summing JSON values.

### Additional supported operations

| Operation | Request | Notes |
| --- | --- | --- |
| Activate/deactivate customer | `PATCH /customers/:id/activate` or `/deactivate` | No required body; do not PATCH `isActive` to the ordinary edit route |
| Activate/deactivate vehicle | `PATCH /vehicles/:id/activate` or `/deactivate` | No required body |
| Read ownership history | `GET /vehicles/:id/ownership` | `data.currentOwner` plus `data.history` array; this is not maintenance history |
| Transfer ownership | `POST /vehicles/:id/transfer-ownership` | `{ "customerId": "<new-owner-uuid>" }`; response is the new ownership record |
| Remove photo | `DELETE /maintenance-cards/:cardId/photos/:photoId` | Returns `data: null` |
| Remove signature | `DELETE /maintenance-cards/:cardId/signature` | Returns `data: null` |

There are no customer, vehicle, or maintenance-card DELETE endpoints. Preserve records through their supported lifecycle operations. After ownership transfer, refresh the vehicle, old/new customer details, and selectors; do not reassign historical cards in frontend state.

## 14. Backend follow-ups and evidence

These findings do not change the implementation scope of this documentation task. They identify behavior the frontend developer must account for and backend changes to address separately.

| Finding | Evidence | Integration impact |
| --- | --- | --- |
| Profile update DTO has no validation decorators | [update-user-dto.ts](../src/modules/users/dto/update-user-dto.ts), [main.ts](../src/main.ts) | Whitelist validation rejects fields such as `firstName`. A local validator probe confirmed this. Keep profile read-only until the backend defines and validates allowed editable fields; do not disable the global whitelist. |
| Access JWT strategy does not check `isActive` | [jwt.strategy.ts](../src/modules/auth/strategies/jwt.strategy.ts), [users.service.ts](../src/modules/users/users.service.ts) | Account deactivation prevents login/refresh, but existing access JWTs may continue working until expiry. Backend enforcement is needed before claiming immediate deactivation. UI logout alone cannot enforce this. |
| First staff account is not provisioned by the API | [auth.controller.ts](../src/modules/auth/auth.controller.ts), [package.json](../package.json) | Backend maintainer must provision an active account with the appropriate role and a bcrypt hash before testing login. No mock account is automatically imported. |
| Extra dashboard fields/stages are not stored | [schema.prisma](../prisma/schema.prisma), [maintenance-card.dto.ts](../src/modules/maintenance-cards/dto/maintenance-card.dto.ts) | Apply the mappings/deferred-field decisions above, or implement a separate backend extension before presenting those features as persistent. |

Additional source references for maintaining this guide:

- [Authentication controller](../src/modules/auth/auth.controller.ts) and [service](../src/modules/auth/auth.service.ts): token headers, rotation, response data, and auth limits.
- [Customer service](../src/modules/customers/customers.service.ts) and [vehicle service](../src/modules/vehicles/vehicles.service.ts): list/detail differences and ownership response shapes.
- [Card service](../src/modules/maintenance-cards/maintenance-cards.service.ts), [validator](../src/modules/maintenance-cards/maintenance-card.validator.ts), and [detail relations](../src/modules/maintenance-cards/maintenance-card.selects.ts): lifecycle, approval, work, and nested data.
- [Media controller](../src/modules/maintenance-cards/maintenance-card-media.controller.ts): multipart fields, upload limits, and streaming endpoints.
- [Response interceptor](../src/common/interceptors/transform.interceptor.ts) and [exception filter](../src/common/filters/api-exception.filter.ts): JSON success/error contracts.
- [Dashboard service](../src/modules/dashboard/dashboard.service.ts) and [search service](../src/modules/search/search.service.ts): supported statistics and grouped search.

Verification performed for this revision: read frontend services, hooks, schemas, session/provider structure, and migration plan; cross-checked backend routes, DTOs, services, Prisma schema, and installed throttler key behavior; verified frontend remote HEAD; exercised the profile DTO's whitelist validation locally. No live database/API/browser integration test was performed, and no application code was changed.
