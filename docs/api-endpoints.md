# Red Power Garage API Endpoints

Development base URL: `http://localhost:3000/api/v1`

Except for the system status and login endpoints, send `Authorization: Bearer <accessToken>`. API JSON responses use the shared `{ statusCode, message, data }` success envelope. Error responses use the shared translated error envelope.

## System

| Method | Route | Authentication | Roles | Request DTO | Purpose |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1` | Public | — | — | Confirm that the API is running. |

## Auth and staff profiles

| Method | Route | Authentication | Roles | Request DTO | Purpose |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/auth/login` | Public | — | `LoginDto` | Authenticate active staff and return access/refresh tokens. |
| POST | `/api/v1/auth/refresh` | Refresh JWT | Active staff | Refresh token | Rotate and return access/refresh tokens. |
| POST | `/api/v1/auth/logout` | Access JWT | Authenticated staff | — | Revoke the stored refresh session. |
| GET | `/api/v1/users/me` | Access JWT | ADMIN, SUPER_ADMIN | — | Return the authenticated staff profile. |
| PATCH | `/api/v1/users/me` | Access JWT | ADMIN, SUPER_ADMIN | `UpdateUserDto` | Update the authenticated staff profile. |
| PATCH | `/api/v1/users/me/password` | Access JWT | ADMIN, SUPER_ADMIN | `UpdatePasswordDto` | Change the authenticated staff password. |
| DELETE | `/api/v1/users/me` | Access JWT | ADMIN, SUPER_ADMIN | — | Deactivate the authenticated staff account. |
| GET | `/api/v1/users` | Access JWT | SUPER_ADMIN | `BaseListQueryDto` | List staff accounts with pagination/search. |
| GET | `/api/v1/users/{id}` | Access JWT | SUPER_ADMIN | Path `id` | Return one staff account. |

## Customers

| Method | Route | Authentication | Roles | Request DTO | Purpose |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/customers` | Access JWT | ADMIN, SUPER_ADMIN | `CreateCustomerDto` | Create a customer. |
| GET | `/api/v1/customers` | Access JWT | ADMIN, SUPER_ADMIN | `CustomerListQueryDto` | Search/list customers by name, phone, email, and active state. |
| GET | `/api/v1/customers/{id}` | Access JWT | ADMIN, SUPER_ADMIN | Path `id` | Return customer details and currently owned vehicles. |
| PATCH | `/api/v1/customers/{id}` | Access JWT | ADMIN, SUPER_ADMIN | `UpdateCustomerDto` | Update customer profile data. |
| PATCH | `/api/v1/customers/{id}/deactivate` | Access JWT | ADMIN, SUPER_ADMIN | Path `id` | Deactivate a customer without changing ownership history. |
| PATCH | `/api/v1/customers/{id}/activate` | Access JWT | ADMIN, SUPER_ADMIN | Path `id` | Reactivate a customer. |

## Vehicles and ownership

| Method | Route | Authentication | Roles | Request DTO | Purpose |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/vehicles` | Access JWT | ADMIN, SUPER_ADMIN | `CreateVehicleDto` | Create a vehicle and its initial ownership. |
| GET | `/api/v1/vehicles` | Access JWT | ADMIN, SUPER_ADMIN | `VehicleListQueryDto` | Search/filter vehicles and return current-owner summaries. |
| GET | `/api/v1/vehicles/{id}` | Access JWT | ADMIN, SUPER_ADMIN | Path `id` | Return vehicle details and its current owner. |
| PATCH | `/api/v1/vehicles/{id}` | Access JWT | ADMIN, SUPER_ADMIN | `UpdateVehicleDto` | Update mutable vehicle details. |
| PATCH | `/api/v1/vehicles/{id}/deactivate` | Access JWT | ADMIN, SUPER_ADMIN | Path `id` | Deactivate a vehicle without altering ownership. |
| PATCH | `/api/v1/vehicles/{id}/activate` | Access JWT | ADMIN, SUPER_ADMIN | Path `id` | Reactivate a vehicle. |
| GET | `/api/v1/vehicles/{id}/ownership` | Access JWT | ADMIN, SUPER_ADMIN | Path `id` | Return current ownership and immutable ownership history. |
| POST | `/api/v1/vehicles/{id}/transfer-ownership` | Access JWT | ADMIN, SUPER_ADMIN | `TransferOwnershipDto` | Transfer an active vehicle to an active customer. |

## Maintenance cards

| Method | Route | Authentication | Roles | Request DTO | Purpose |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/maintenance-cards` | Access JWT | ADMIN, SUPER_ADMIN | `CreateMaintenanceCardDto` | Create an OPEN card with its initial status event. |
| GET | `/api/v1/maintenance-cards` | Access JWT | ADMIN, SUPER_ADMIN | `MaintenanceCardListQueryDto` | List/filter cards by number, status, customer, vehicle, and received date. |
| GET | `/api/v1/maintenance-cards/{id}` | Access JWT | ADMIN, SUPER_ADMIN | Path `id` | Return complete maintenance-card details. |
| PATCH | `/api/v1/maintenance-cards/{id}` | Access JWT | ADMIN, SUPER_ADMIN | `UpdateMaintenanceCardDto` | Update an OPEN card and optionally replace supplied selection/work sets. |
| POST | `/api/v1/maintenance-cards/{id}/close` | Access JWT | ADMIN, SUPER_ADMIN | Path `id` | Close an OPEN card and record the status transition. |
| POST | `/api/v1/maintenance-cards/{id}/reopen` | Access JWT | SUPER_ADMIN | Path `id` | Reopen a CLOSED card and record the status transition. |

## Maintenance-card options

`{kind}` is one of `visit-reasons`, `vehicle-conditions`, or `vehicle-items`.

| Method | Route | Authentication | Roles | Request DTO | Purpose |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/maintenance-card-options/{kind}` | Access JWT | ADMIN, SUPER_ADMIN | `OptionListQueryDto` | List active/inactive configurable options. |
| POST | `/api/v1/maintenance-card-options/{kind}` | Access JWT | SUPER_ADMIN | `CreateMaintenanceCardOptionDto` | Create an option. |
| PATCH | `/api/v1/maintenance-card-options/{kind}/{id}` | Access JWT | SUPER_ADMIN | `UpdateMaintenanceCardOptionDto` | Update an unused option subject to immutability rules. |
| PATCH | `/api/v1/maintenance-card-options/{kind}/{id}/activate` | Access JWT | SUPER_ADMIN | Path `kind`, `id` | Reactivate an option. |
| PATCH | `/api/v1/maintenance-card-options/{kind}/{id}/deactivate` | Access JWT | SUPER_ADMIN | Path `kind`, `id` | Deactivate an option without changing historical cards. |
| DELETE | `/api/v1/maintenance-card-options/{kind}/{id}` | Access JWT | SUPER_ADMIN | Path `kind`, `id` | Delete an unused option when safe. |

## Photos and signature

Media content is private. Metadata returns authenticated `contentUrl` values, never raw or absolute storage paths.

| Method | Route | Authentication | Roles | Request DTO | Purpose |
| --- | --- | --- | --- | --- | --- |
| POST | `/api/v1/maintenance-cards/{cardId}/photos` | Access JWT | ADMIN, SUPER_ADMIN | Multipart `files[]`, optional `displayOrder` | Upload JPEG/PNG/WebP photos to an OPEN card. |
| GET | `/api/v1/maintenance-cards/{cardId}/photos` | Access JWT | ADMIN, SUPER_ADMIN | Path `cardId` | Return ordered photo metadata and private content URLs. |
| GET | `/api/v1/maintenance-cards/{cardId}/photos/{photoId}/content` | Access JWT | ADMIN, SUPER_ADMIN | Path IDs | Stream private photo content after card ownership verification. |
| DELETE | `/api/v1/maintenance-cards/{cardId}/photos/{photoId}` | Access JWT | ADMIN, SUPER_ADMIN | Path IDs | Delete a photo from an OPEN card. |
| POST | `/api/v1/maintenance-cards/{cardId}/signature` | Access JWT | ADMIN, SUPER_ADMIN | Multipart `file` | Upload or replace the optional signature on an OPEN card. |
| GET | `/api/v1/maintenance-cards/{cardId}/signature` | Access JWT | ADMIN, SUPER_ADMIN | Path `cardId` | Return signature metadata and its private content URL. |
| GET | `/api/v1/maintenance-cards/{cardId}/signature/content` | Access JWT | ADMIN, SUPER_ADMIN | Path `cardId` | Stream private signature content. |
| DELETE | `/api/v1/maintenance-cards/{cardId}/signature` | Access JWT | ADMIN, SUPER_ADMIN | Path `cardId` | Delete the signature from an OPEN card. |

## Search and maintenance history

| Method | Route | Authentication | Roles | Request DTO | Purpose |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/search` | Access JWT | ADMIN, SUPER_ADMIN | `GlobalSearchQueryDto` (`q`) | Return up to 10 grouped customer, vehicle, and card matches. |
| GET | `/api/v1/customers/{id}/maintenance-history` | Access JWT | ADMIN, SUPER_ADMIN | `CustomerMaintenanceHistoryQueryDto` | Return paginated visits associated with the immutable card customer. |
| GET | `/api/v1/vehicles/{id}/maintenance-history` | Access JWT | ADMIN, SUPER_ADMIN | `MaintenanceHistoryQueryDto` | Return paginated visits across all vehicle ownership records. |

## Dashboard

| Method | Route | Authentication | Roles | Request DTO | Purpose |
| --- | --- | --- | --- | --- | --- |
| GET | `/api/v1/dashboard/stats` | Access JWT | ADMIN, SUPER_ADMIN | — | Return maintenance, customer, and vehicle operational counts in one response. |

`todayReceived` uses `receivedAt` and the `Asia/Amman` calendar day. The backend converts local midnight and the following local midnight to an exclusive UTC query range.

## Common query conventions

- Pagination uses `page` and `limit`.
- History filters use `status`, `receivedFrom`, and `receivedTo`; customer history also supports `vehicleId`.
- Dates are ISO 8601 timestamps and history bounds are inclusive.
- Global search trims `q`, requires 2–100 characters, and returns at most 10 records per category.
- `MaintenanceCardStatus`: `OPEN`, `CLOSED`.
- Roles: `ADMIN`, `SUPER_ADMIN`.
