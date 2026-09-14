# TokTickIT Sprint 3 (Lab 3) — REST API Specification

**Document Title**: Sprint 3 REST API Contract & DTO Schemas  
**Document ID**: API-SPEC-LAB-03  
**Version**: 1.0 (Approved Baseline)  
**Status**: Ready for Implementation  
**Base URL**: `http://localhost:3000/api/v1`  
**Authentication**: Session Cookie (`toktickit_session`) or Bearer Token (`Authorization: Bearer <token>`)  
**Data Formats**: JSON (`application/json`) for endpoints; `multipart/form-data` for file uploads; `application/octet-stream` for file downloads  
**Traceability Reference**: [Lab_3_sheet.pdf](../reference/Lab_3_sheet.pdf) (§6, §14), [specification.md](./specification.md)

---

## 1. Global API Conventions

### 1.1. HTTP Headers
* `Content-Type: application/json` (Required for all JSON request bodies).
* `Authorization: Bearer <session-token>` (Optional alternative to HTTP-only session cookie).
* `Accept: application/json` (Standard API response negotiation).

### 1.2. Standard Error Response Envelope
All non-2xx responses follow a uniform error structure:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The submitted payload failed validation.",
    "fieldErrors": [
      {
        "field": "email",
        "message": "Email is already registered to another account."
      }
    ],
    "timestamp": "2026-09-14T12:00:00.000Z"
  }
}
```

#### Standard Error Codes:
* `UNAUTHENTICATED`: No valid session or session expired (`401 Unauthorized`).
* `PASSWORD_CHANGE_REQUIRED`: User must change password before accessing operational routes (`403 Forbidden`).
* `FORBIDDEN`: User lacks permitted role or resource access (`403 Forbidden`).
* `NOT_FOUND`: Resource does not exist (`404 Not Found`).
* `VALIDATION_FAILED`: Request payload or query parameters violate schema constraints (`400 Bad Request`).
* `CONFLICT`: Resource conflict, such as duplicate email (`409 Conflict`).
* `SAFETY_VIOLATION`: Administrative action blocked by safety guardrails (`400 Bad Request` or `409 Conflict`).
* `INTERNAL_ERROR`: Unexpected backend failure without leaking stack traces (`500 Internal Server Error`).

### 1.3. Information Disclosure & Existence Leak Prevention
To prevent unauthorized account enumeration or metadata leakage:
1. Login failures return a generic message: `"Invalid email or password"`. The API never reveals whether an email is not registered or if an account is inactive (`BR-01`).
2. If a Requester queries a ticket ID or internal note ID belonging to another user or internal staff, the system returns `404 Not Found` or generic `403 Forbidden` without revealing the target entity's contents.

---

## 2. Authentication & Session APIs (`/api/v1/auth/*`)

### 2.1. User Login
`POST /api/v1/auth/login`

* **Access**: Public.
* **Request Headers**: `Content-Type: application/json`.
* **Request Body**:
```json
{
  "email": "sompong.it@kmutt.ac.th",
  "password": "Password123!"
}
```
* **Validation Rules**:
  - `email`: Required, valid email format, trimmed, normalized to lowercase.
  - `password`: Required string, min 1 char.
* **Success Response `200 OK`**:
  - Sets HTTP-only secure cookie `toktickit_session`.
```json
{
  "user": {
    "id": 1,
    "name": "Sompong IT",
    "email": "sompong.it@kmutt.ac.th",
    "role": "REQUESTER",
    "mustChangePassword": false,
    "isActive": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```
* **Error Responses**:
  - `401 Unauthorized` (`UNAUTHENTICATED`): Invalid credentials or inactive account (`isActive = false`).
  - `400 Bad Request` (`VALIDATION_FAILED`): Missing email or password.

---

### 2.2. User Logout
`POST /api/v1/auth/logout`

* **Access**: Authenticated.
* **Request Body**: None.
* **Success Response `200 OK`**:
  - Clears `toktickit_session` cookie and invalidates session token.
```json
{
  "message": "Successfully logged out."
}
```

---

### 2.3. Get Current Authenticated User Profile
`GET /api/v1/auth/me`

* **Access**: Authenticated.
* **Success Response `200 OK`**:
```json
{
  "user": {
    "id": 1,
    "name": "Sompong IT",
    "email": "sompong.it@kmutt.ac.th",
    "role": "REQUESTER",
    "mustChangePassword": false,
    "isActive": true
  }
}
```
* **Error Responses**:
  - `401 Unauthorized`: Missing, expired, or invalid session.

---

### 2.4. Change Password (Mandatory or User-Initiated)
`POST /api/v1/auth/change-password`

* **Access**: Authenticated (Permitted even when `mustChangePassword === true`).
* **Request Body**:
```json
{
  "currentPassword": "InitialPass123!",
  "newPassword": "SecurePassword456!",
  "confirmPassword": "SecurePassword456!"
}
```
* **Validation Rules**:
  - `currentPassword`: Required, matches active password hash.
  - `newPassword`: Min 8 chars, at least 1 uppercase letter, 1 lowercase letter, 1 digit, 1 special character (`[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]`).
  - `confirmPassword`: Exactly matches `newPassword`.
* **Success Response `200 OK`**:
```json
{
  "message": "Password changed successfully.",
  "user": {
    "id": 1,
    "name": "Sompong IT",
    "email": "sompong.it@kmutt.ac.th",
    "role": "REQUESTER",
    "mustChangePassword": false,
    "isActive": true
  }
}
```
* **Error Responses**:
  - `400 Bad Request` (`VALIDATION_FAILED`): Weak password or password mismatch.
  - `401 Unauthorized` (`UNAUTHENTICATED`): Current password incorrect.

---

## 3. Requester Ticket APIs (Regression & Extension)

### 3.1. Create Ticket
`POST /api/v1/tickets`

* **Access**: Authenticated Requester, IT Staff, or Administrator.
* **Identity Source**: Strictly `req.user.id` from authenticated session (`BR-03`).
* **Request Body**:
```json
{
  "categoryId": 1,
  "relatedSystemId": 2,
  "requestedPriority": "HIGH",
  "summary": "Cannot connect to campus Wi-Fi in CB2",
  "description": "Wi-Fi signals disconnect repeatedly when connecting in CB2 3rd floor."
}
```
* **Success Response `201 Created`**:
```json
{
  "ticket": {
    "id": 101,
    "ticketNumber": "TKT-2026-00045",
    "requesterId": 1,
    "categoryId": 1,
    "relatedSystemId": 2,
    "summary": "Cannot connect to campus Wi-Fi in CB2",
    "description": "Wi-Fi signals disconnect repeatedly...",
    "requestedPriority": "HIGH",
    "itPriority": "HIGH",
    "currentStatus": "NEW",
    "ownerId": null,
    "requesterResolvedAt": null,
    "createdAt": "2026-09-14T10:00:00.000Z",
    "updatedAt": "2026-09-14T10:00:00.000Z"
  }
}
```

---

### 3.2. Get My Tickets (Requester List)
`GET /api/v1/tickets`

* **Access**: Authenticated Requester.
* **Scope**: Automatically filters `WHERE requesterId = req.user.id`.
* **Query Parameters**:
  - `search`: string (ticket number or summary).
  - `category`: integer or string.
  - `status`: string.
  - `sortBy`: `createdAt` | `ticketNumber` | `summary` (default `createdAt`).
  - `sortOrder`: `asc` | `desc` (default `desc`).
  - `page`: integer (default 1).
  - `pageSize`: integer (10, 25, 50, default 10).
* **Success Response `200 OK`**:
```json
{
  "items": [
    {
      "id": 101,
      "ticketNumber": "TKT-2026-00045",
      "summary": "Cannot connect to campus Wi-Fi in CB2",
      "categoryName": "Network",
      "requestedPriority": "HIGH",
      "currentStatus": "NEW",
      "createdAt": "2026-09-14T10:00:00.000Z"
    }
  ],
  "totalCount": 1,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

---

### 3.3. Get Ticket Detail
`GET /api/v1/tickets/:id`

* **Access**: Authenticated.
  - **Requester**: Allowed only if `ticket.requesterId === req.user.id`. Internal notes are **strictly omitted** (`BR-04`).
  - **IT Staff / Administrator**: Allowed for all tickets. Internal notes included.
* **Success Response `200 OK` (for IT Staff / Admin)**:
```json
{
  "ticket": {
    "id": 101,
    "ticketNumber": "TKT-2026-00045",
    "summary": "Cannot connect to campus Wi-Fi in CB2",
    "description": "Full problem description...",
    "requestedPriority": "HIGH",
    "itPriority": "HIGH",
    "currentStatus": "OPEN",
    "requesterResolvedAt": null,
    "requester": {
      "id": 1,
      "name": "Sompong IT",
      "email": "sompong.it@kmutt.ac.th"
    },
    "owner": {
      "id": 6,
      "name": "Wichai IT",
      "email": "wichai.it@kmutt.ac.th"
    },
    "category": { "id": 1, "name": "Network" },
    "relatedSystem": { "id": 2, "name": "Campus Wi-Fi" },
    "attachments": [
      {
        "id": 12,
        "originalFilename": "wifi_error.png",
        "fileSize": 204850,
        "mimeType": "image/png",
        "createdAt": "2026-09-14T10:00:00.000Z"
      }
    ],
    "publicComments": [
      {
        "id": 5,
        "content": "Access point CB2-04 was rebooted.",
        "author": { "id": 6, "name": "Wichai IT", "role": "IT_STAFF" },
        "createdAt": "2026-09-14T11:00:00.000Z"
      }
    ],
    "internalNotes": [
      {
        "id": 2,
        "content": "Switch 3A port flap detected.",
        "author": { "id": 6, "name": "Wichai IT", "role": "IT_STAFF" },
        "createdAt": "2026-09-14T10:30:00.000Z"
      }
    ]
  }
}
```
* **Success Response `200 OK` (for Requester)**:
  - Exact same shape, but `"internalNotes"` field is omitted or undefined.
* **Error Responses**:
  - `403 Forbidden`: Requester attempting to view another requester's ticket.
  - `404 Not Found`: Ticket does not exist.

---

### 3.4. Indicate Problem Appears Resolved
`POST /api/v1/tickets/:id/resolve-request`

* **Access**: Authenticated Requester (owner of ticket).
* **Behavior**: Sets `ticket.requesterResolvedAt = NOW()`. Does not modify `currentStatus` (`BR-05`).
* **Success Response `200 OK`**:
```json
{
  "message": "Problem resolution recorded.",
  "requesterResolvedAt": "2026-09-14T14:00:00.000Z"
}
```
* **Error Responses**:
  - `403 Forbidden`: Not the ticket owner or ticket already closed.

---

## 4. IT Staff Ticket Queue & Operations (`/api/v1/staff/*`)

### 4.1. Retrieve IT Staff Ticket Queue
`GET /api/v1/staff/tickets`

* **Access**: IT Staff and Administrator only (`BR-06`). `403 Forbidden` for Requesters.
* **Query Parameters**:
  - `search`: string (ticket number or summary).
  - `status`: string (single status filter).
  - `category`: integer (category ID).
  - `itPriority`: `LOW` | `MEDIUM` | `HIGH` | `URGENT`.
  - `owner`: integer (owner user ID) or string `unassigned`.
  - `sortBy`: `createdAt` | `ticketNumber` | `summary` | `itPriority` | `currentStatus` (default `createdAt`).
  - `sortOrder`: `asc` | `desc` (default `desc`).
  - `page`: integer (default 1).
  - `pageSize`: integer (10, 25, 50, default 10).
* **Success Response `200 OK`**:
```json
{
  "items": [
    {
      "id": 101,
      "ticketNumber": "TKT-2026-00045",
      "summary": "Cannot connect to campus Wi-Fi in CB2",
      "categoryName": "Network",
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "currentStatus": "OPEN",
      "requesterName": "Sompong IT",
      "ownerName": "Wichai IT",
      "ownerId": 6,
      "requesterResolved": false,
      "createdAt": "2026-09-14T10:00:00.000Z"
    }
  ],
  "totalCount": 42,
  "page": 1,
  "pageSize": 10,
  "totalPages": 5
}
```
* **Error Responses**:
  - `403 Forbidden`: Authenticated as `REQUESTER`.

---

### 4.2. Claim / Assign Ticket Ownership
`PATCH /api/v1/staff/tickets/:id/assignment`

* **Access**: IT Staff and Administrator only.
* **Request Body**:
```json
{
  "ownerId": 6
}
```
* *Note: Pass `ownerId: null` to unassign.*
* **Validation Rules**:
  - `ownerId`: Must belong to an active user with role `IT_STAFF` or `ADMINISTRATOR`.
* **Success Response `200 OK`**:
```json
{
  "message": "Ownership updated successfully.",
  "owner": {
    "id": 6,
    "name": "Wichai IT",
    "email": "wichai.it@kmutt.ac.th"
  }
}
```

---

### 4.3. Update IT Priority
`PATCH /api/v1/staff/tickets/:id/priority`

* **Access**: IT Staff and Administrator only.
* **Request Body**:
```json
{
  "itPriority": "URGENT"
}
```
* **Validation Rules**:
  - `itPriority`: Required, must be one of `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
* **Success Response `200 OK`**:
```json
{
  "message": "IT Priority updated.",
  "itPriority": "URGENT"
}
```

---

### 4.4. Transition Ticket Status
`PATCH /api/v1/staff/tickets/:id/status`

* **Access**: IT Staff and Administrator only.
* **Request Body**:
```json
{
  "status": "IN_PROGRESS"
}
```
* **Validation Rules**:
  - `status`: Must be a valid next status from the current status according to the Ticket Status Transition Matrix. Invalid transitions rejected with `400 Bad Request` (`INVALID_STATUS_TRANSITION`).
* **Success Response `200 OK`**:
```json
{
  "message": "Ticket status transitioned.",
  "currentStatus": "IN_PROGRESS"
}
```

---

## 5. Comments & Notes APIs (`/api/v1/tickets/:id/*`)

### 5.1. Append Public Comment
`POST /api/v1/tickets/:id/comments`

* **Access**: Owning Requester, IT Staff, Administrator.
* **Request Body**:
```json
{
  "content": "Please verify if the connection is working on the 2nd floor as well."
}
```
* **Validation Rules**:
  - `content`: Required string, 1 to 2,000 characters after trimming whitespace (`BR-08`).
* **Success Response `201 Created`**:
```json
{
  "comment": {
    "id": 14,
    "ticketId": 101,
    "content": "Please verify if the connection is working on the 2nd floor as well.",
    "author": {
      "id": 6,
      "name": "Wichai IT",
      "role": "IT_STAFF"
    },
    "createdAt": "2026-09-14T11:45:00.000Z"
  }
}
```

---

### 5.2. Append Internal Note
`POST /api/v1/tickets/:id/notes`

* **Access**: IT Staff and Administrator strictly (`BR-04`).
* **Request Body**:
```json
{
  "content": "Discovered bad transceiver on core switch 2. Ordering replacement part."
}
```
* **Validation Rules**:
  - `content`: Required string, 1 to 2,000 characters after trimming whitespace.
* **Success Response `201 Created`**:
```json
{
  "note": {
    "id": 8,
    "ticketId": 101,
    "content": "Discovered bad transceiver on core switch 2. Ordering replacement part.",
    "author": {
      "id": 6,
      "name": "Wichai IT",
      "role": "IT_STAFF"
    },
    "createdAt": "2026-09-14T11:46:00.000Z"
  }
}
```
* **Error Responses**:
  - `403 Forbidden`: Authenticated as `REQUESTER`.

---

## 6. Administrator User Management APIs (`/api/v1/admin/users/*`)

### 6.1. Retrieve User List
`GET /api/v1/admin/users`

* **Access**: Administrator strictly.
* **Query Parameters**:
  - `search`: string (case-insensitive search matching name or email).
  - `role`: string (`REQUESTER` | `IT_STAFF` | `ADMINISTRATOR`).
* **Success Response `200 OK`**:
```json
{
  "users": [
    {
      "id": 1,
      "name": "Sompong IT",
      "email": "sompong.it@kmutt.ac.th",
      "role": "REQUESTER",
      "isActive": true,
      "mustChangePassword": false,
      "createdAt": "2026-09-01T08:00:00.000Z"
    }
  ],
  "totalCount": 1
}
```
* **Error Responses**:
  - `403 Forbidden`: Role is not `ADMINISTRATOR`.

---

### 6.2. Create User
`POST /api/v1/admin/users`

* **Access**: Administrator strictly.
* **Request Body**:
```json
{
  "name": "New Employee",
  "email": "new.employee@kmutt.ac.th",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "InitialPass123!"
}
```
* **Validation Rules**:
  - `name`: Required string (min 2, max 100 chars).
  - `email`: Required valid email, unique across system.
  - `role`: One of `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR` (`BR-09`).
  - `initialPassword`: Valid password conforming to strength rules.
  - Automatically persists with `mustChangePassword = true`.
* **Success Response `201 Created`**:
```json
{
  "user": {
    "id": 15,
    "name": "New Employee",
    "email": "new.employee@kmutt.ac.th",
    "role": "IT_STAFF",
    "isActive": true,
    "mustChangePassword": true,
    "createdAt": "2026-09-14T12:30:00.000Z"
  }
}
```
* **Error Responses**:
  - `409 Conflict` (`EMAIL_ALREADY_EXISTS`): Email already in use (`BR-10`).
  - `400 Bad Request`: Validation failure.

---

### 6.3. Edit User Details & Active Status
`PATCH /api/v1/admin/users/:id`

* **Access**: Administrator strictly.
* **Request Body**:
```json
{
  "name": "Updated Name",
  "email": "updated.email@kmutt.ac.th",
  "role": "IT_STAFF",
  "isActive": false
}
```
* **Safety Rules Enforced**:
  - **Self-Deactivation Prevention (`BR-11`)**: If `id === req.user.id` and `isActive === false`, rejects with `400 Bad Request` (`CANNOT_DEACTIVATE_SELF`).
  - **Last Administrator Preservation (`BR-12`)**: If target user is an active Administrator and the total active Administrator count is 1, attempting to set `isActive: false` or changing `role` to non-Admin rejects with `409 Conflict` (`CANNOT_DEACTIVATE_LAST_ADMIN`).
  - **Unique Email**: If email changed to one owned by another user, rejects with `409 Conflict`.
* **Success Response `200 OK`**:
```json
{
  "user": {
    "id": 15,
    "name": "Updated Name",
    "email": "updated.email@kmutt.ac.th",
    "role": "IT_STAFF",
    "isActive": false,
    "mustChangePassword": true,
    "updatedAt": "2026-09-14T12:45:00.000Z"
  }
}
```

---

### 6.4. Reset Initial Password
`POST /api/v1/admin/users/:id/reset-password`

* **Access**: Administrator strictly.
* **Request Body**:
```json
{
  "initialPassword": "TempPassReset456!"
}
```
* **Behavior**: Hashes the new password and sets `mustChangePassword = true`.
* **Success Response `200 OK`**:
```json
{
  "message": "Initial password has been reset. User will be required to change it at next login.",
  "userId": 15
}
```
