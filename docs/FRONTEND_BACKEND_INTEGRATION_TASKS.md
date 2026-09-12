# Red Power dashboard backend integration tasks

Use this checklist to connect the Red Power dashboard to this NestJS API. It is
an execution tracker; the detailed API contracts, request examples, and known
limitations remain in [FRONTEND_BACKEND_INTEGRATION_GUIDE.md](FRONTEND_BACKEND_INTEGRATION_GUIDE.md).

## Working rules

- Complete phases in order unless a task explicitly says otherwise.
- Treat the existing NestJS controllers and DTOs as the source of truth.
- Keep the Arabic/RTL UI and existing reusable components intact.
- Do not use mock data as a fallback once a feature is connected.
- Record newly discovered API-contract gaps in the backlog instead of masking them in the UI.
- Mark a task complete only after its acceptance checks pass.

## Phase 0 - Environment and contract baseline

### Tasks

- [ ] Read the dashboard `AGENTS.md`, applicable skills, and its migration plan.
- [ ] Read the backend integration guide and confirm the frontend revision still matches its inspected revision.
- [ ] Configure PostgreSQL, backend environment variables, Prisma generation, and migrations.
- [ ] Configure `ALLOWED_ORIGINS` with the dashboard origin.
- [ ] Add `VITE_API_BASE_URL=http://localhost:3000/api/v1` to the dashboard `.env.local`.
- [ ] Provision an active backend staff account with a bcrypt password and intended role.
- [ ] Start the API and dashboard on separate ports.
- [ ] Verify `GET /api/v1` and Swagger at `/api/docs`.

### Acceptance checks

- [ ] The dashboard can reach the API origin without a CORS failure.
- [ ] A real staff account can be used for login testing.
- [ ] No server secrets are present in frontend environment files.

## Phase 1 - Shared API boundary and real session

### Tasks

- [ ] Create one shared HTTP client that reads `VITE_API_BASE_URL` and appends relative paths once.
- [ ] Define shared success-envelope, error, and pagination contracts.
- [ ] Unwrap successful API envelopes in the shared client, not feature services.
- [ ] Attach access tokens and the current `Accept-Language` value to authenticated requests.
- [ ] Normalize API failures while retaining HTTP status, error code, translated message, and validation details.
- [ ] Add separate client paths for multipart uploads and authenticated blob downloads.
- [ ] Select and document token storage. Use real access and refresh tokens; remove the mock user-only session.
- [ ] Implement login, `GET /users/me`, refresh, logout, and password-update session behavior.
- [ ] Coordinate concurrent `401` responses through one refresh attempt and retry each original request at most once.
- [ ] Exclude login, refresh, and `auth.errors.current_password_incorrect` from automatic refresh behavior.
- [ ] Add `initializing`, `authenticated`, and `anonymous` session states.
- [ ] Move provider nesting or inject cache cleanup so logout can clear protected query data safely.
- [ ] Map backend names and roles to the dashboard UI model without deriving roles from email addresses.

### Acceptance checks

- [ ] Invalid credentials display the translated backend failure.
- [ ] Valid login restores the intended session behavior after reload.
- [ ] Expired access tokens refresh once; failed refresh returns the user to an anonymous session.
- [ ] Logout clears tokens, user state, and protected cached data.
- [ ] Password updates invalidate the local session and require login again.

## Phase 2 - Customers, vehicles, and ownership

### Tasks

- [ ] Replace customer fixture reads and mutations with customer API calls.
- [ ] Add paginated customer-list models and include page, limit, and filters in query keys.
- [ ] Align customer form mapping: trim values and omit blank optional email fields.
- [ ] Remove or label customer address and notes as unavailable until backend support exists.
- [ ] Replace vehicle fixture reads and mutations with vehicle API calls.
- [ ] Map `year` to `manufactureYear` and UI transmission values to backend enums.
- [ ] Align vehicle validation with API requirements, including required transmission and VIN rules.
- [ ] Remove vehicle fields that do not persist, including per-vehicle mileage, fuel type, and notes.
- [ ] Preserve `ownershipId` / `currentOwnership.id` in frontend models for maintenance-card creation.
- [ ] Implement ownership transfer and refresh affected vehicle, customer, and selector data.
- [ ] Replace unsupported customer multi-field filters with supported customer, vehicle, or global search behavior.
- [ ] Remove or defer global vehicle-count UI that cannot be calculated from paginated customer results.

### Acceptance checks

- [ ] Customer and vehicle creation persist after a full page reload.
- [ ] Pagination never presents one API page as the full record set.
- [ ] Empty optional values are omitted rather than submitted as invalid empty strings.
- [ ] Ownership transfer retains the vehicle's historical maintenance records.

## Phase 3 - Maintenance-card creation and detail views

### Tasks

- [ ] Replace generated receipt numbers with server `cardNumber` values.
- [ ] Limit persisted maintenance-card statuses to `OPEN` and `CLOSED`; keep unsaved drafts explicitly local.
- [ ] Map the receipt form to the create-card DTO, including `vehicleOwnershipId`, `receivedAt`, mileage, fuel level, complaint, and expected delivery time.
- [ ] Load visit reasons, vehicle conditions, and vehicle items from their option endpoints.
- [ ] Store option IDs rather than hardcoded labels and request only active selectable options.
- [ ] Add required approval name and timestamp handling when customer approval is selected.
- [ ] Omit approval metadata when customer approval is false.
- [ ] Build a multi-step save flow: customer, vehicle, card, then optional photos/signature.
- [ ] Preserve successful customer and vehicle writes when a later card write fails, so retries do not create duplicates.
- [ ] Separate list-row models from full maintenance-card detail models.
- [ ] Map card detail relations, required work, approval data, and status events to the existing UI.
- [ ] Remove frontend-only receipt payload fields, including snapshots, receiver name, audit arrays, and local IDs.

### Acceptance checks

- [ ] Card creation sends only accepted DTO fields and a real current ownership ID.
- [ ] A failed later save step can be retried without duplicating earlier records.
- [ ] Receipt views use server timestamps and related entities rather than fabricated snapshots.
- [ ] The UI does not claim that unsupported fields or status stages are persisted.

## Phase 4 - Work items, lifecycle, and query consistency

### Tasks

- [ ] Implement dedicated create, update, and delete requests for required work items.
- [ ] Use the mutation input card ID when invalidating a work item's parent card.
- [ ] Map supported work fields only: description, required flag, estimate, display order, and status.
- [ ] Send `isRequired` explicitly and preserve null estimates separately from zero.
- [ ] Define domain query-key factories for maintenance lists, details, history, and dashboard data.
- [ ] Migrate all maintenance hooks and mutations to the shared keys.
- [ ] Invalidate relevant detail, list, history, and dashboard queries after writes.
- [ ] Close cards through the close endpoint and display incomplete-required-work conflicts clearly.
- [ ] Allow reopening only for super administrators and make closed-card forms read-only.
- [ ] Render lifecycle timelines from server `statusEvents`, without inventing work-edit audit events.

### Acceptance checks

- [ ] Updating a work item refreshes the correct card and any affected list.
- [ ] Required pending or in-progress work blocks card closure.
- [ ] Completed or cancelled required work permits closure.
- [ ] Admin and super-admin controls match server authorization rules.

## Phase 5 - History, media, dashboard, and profile

### Tasks

- [ ] Replace fixture history with paginated customer and vehicle maintenance-history endpoints.
- [ ] Fetch card detail when a history summary needs work-item detail.
- [ ] Preserve historical visits after vehicle ownership transfers.
- [ ] Implement photo upload using repeated `files` multipart fields and signature upload using `file`.
- [ ] Render private photo and signature content through authenticated blob requests and revoke object URLs when no longer needed.
- [ ] Keep successfully created cards available when a media upload fails, with an independent retry action.
- [ ] Add a dashboard-owned service for `/dashboard/stats`.
- [ ] Map supported backend statistics and remove unsupported mock-only counters.
- [ ] Make profile display use the authenticated staff identity.
- [ ] Keep profile editing unavailable until the backend profile DTO is corrected.
- [ ] Debounce search, avoid redundant refetches, and handle `429` without retry loops.

### Acceptance checks

- [ ] History includes visits that predate a vehicle ownership transfer.
- [ ] Photos and signatures render only through authenticated content requests.
- [ ] Dashboard errors, empty states, and permissions are not represented as zero-valued statistics.
- [ ] Dashboard traffic remains within the configured throttling limits during normal use.

## Phase 6 - Error handling, localization, and release verification

### Tasks

- [ ] Map backend validation field paths to frontend form paths.
- [ ] Render translated API messages and branch behavior on stable error codes or HTTP status.
- [ ] Keep loading, empty, failed-load, not-found, and permission-denied states distinct.
- [ ] Handle `409` conflicts by showing a useful message and refreshing affected server data.
- [ ] Confirm connected features never read fixture arrays or generate fake server IDs, roles, receipt numbers, or audit entries.
- [ ] Run dashboard type checking, linting, build, and existing tests.
- [ ] Run relevant backend checks if backend code changed during integration.
- [ ] Update the dashboard migration plan with delivered work and remaining gaps.

### Release checklist

- [ ] Valid and invalid login, access-token expiry, refresh failure, logout, and reload behavior are tested.
- [ ] More than one page of customer, vehicle, and maintenance data can be browsed correctly.
- [ ] Customer and vehicle create/update flows persist and reject unsupported fields honestly.
- [ ] Receipt creation handles partial-save retries without duplicates.
- [ ] Work-item updates, closure rules, and reopen permissions work as expected.
- [ ] Closed cards reject edits, work changes, and media changes.
- [ ] Ownership transfers preserve customer and vehicle history.
- [ ] Media upload, authenticated rendering, deletion, and retry behavior are tested.
- [ ] Arabic validation, RTL layouts, errors, and rate-limit behavior are tested.
- [ ] No connected feature silently falls back to mock data.

## Backend contract backlog

These items are intentionally outside the dashboard integration work. Track and
resolve them in backend work before exposing the related UI behavior as fully
supported.

- [ ] Add validation decorators and an explicit editable-field contract to the profile update DTO.
- [ ] Enforce active-account status in access-token authentication, not only login and refresh.
- [ ] Provide a supported staff-account provisioning or seed workflow for non-development environments.
- [ ] Decide whether the dashboard's extra maintenance states should become persisted backend states.
- [ ] Decide whether unsupported customer, vehicle, receipt, and work fields need backend persistence.
- [ ] Add customer/vehicle aggregate data only if product requirements need it; do not derive it from partial pages.
- [ ] Extend CORS exposure if frontend rate-limit handling must read `Retry-After`.

## Definition of complete

The integration is complete when every release-checklist item is verified in a
real browser against a running backend and database, the connected dashboard
has no mock fallback paths, and any unchecked backlog item is either hidden
from the UI or clearly represented as unavailable.
