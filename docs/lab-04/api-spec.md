# TokTickIT Sprint 4 (Lab 4) — REST API Specification

**Document Title**: Sprint 4 REST API Contract & DTO Schemas  
**Document ID**: API-SPEC-LAB-04  
**Version**: 1.0 (Approved Baseline)  
**Status**: Ready for Implementation  
**Base URL**: `http://localhost:3000/api/v1`  
**Authentication**: Session Cookie (`toktickit_session`) or Bearer Token (`Authorization: Bearer <token>`)  
**Data Format**: JSON (`application/json`)  
**Traceability Reference**: [Lab_04_labsheet.pdf](../reference/Lab_04_labsheet.pdf) (§6, §14), [specification.md](./specification.md)

---

## 1. Global API Conventions

### 1.1. HTTP Request & Response Headers
* `Content-Type: application/json` (Required for JSON request bodies).
* `Authorization: Bearer <session-token>` (Optional alternative to HTTP-only session cookie).
* `Accept: application/json` (Standard API response format).

### 1.2. Standard Error Response Envelope
All error responses (HTTP 4xx and 5xx) strictly follow the uniform error contract:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The submitted payload failed validation.",
    "fieldErrors": [
      {
        "field": "actionDescription",
        "message": "Action description must be between 5 and 1000 characters."
      }
    ],
    "timestamp": "2026-10-29T10:00:00.000Z"
  }
}
```

#### Standard Error Codes:
* `UNAUTHENTICATED` (`401 Unauthorized`): No active session or session expired.
* `FORBIDDEN` (`403 Forbidden`): Authenticated user lacks required role or ownership.
* `NOT_FOUND` (`404 Not Found`): Target ticket, action taken, or entity does not exist.
* `VALIDATION_FAILED` (`400 Bad Request`): Payload violates schema constraints.
* `RESOLUTION_REQUIRES_ACTION_TAKEN` (`400 Bad Request`): Ticket cannot be resolved without at least one recorded Action Taken (BR-07).
* `INVALID_STATUS_TRANSITION` (`400 Bad Request`): Requested status transition is not permitted by the state machine (BR-09).
* `STALE_RECORD_CONFLICT` (`409 Conflict`): Optimistic concurrency failure due to concurrent updates (BR-10).
* `INTERNAL_ERROR` (`500 Internal Server Error`): Unexpected server exception without leaking internal stack traces.

---

## 2. Actions Taken Endpoints

### 2.1. Create Action Taken
`POST /api/v1/tickets/:id/actions-taken`

Creates a new Action Taken line item under the specified ticket. The performer identity is automatically assigned by the server runtime from the authenticated user's session (`req.user.id`).

* **Authorization**: `IT_STAFF`, `ADMINISTRATOR`. (Requesters return `403 Forbidden`).
* **Path Parameters**:
  - `id` (integer, required): Target Ticket ID.
* **Request Body**:
```json
{
  "actionDateTime": "2026-10-29T09:30:00.000Z",
  "actionDescription": "Inspected Building 2 Cisco switch. Found port 14 flapping. Replaced patch cord.",
  "result": "Port link stabilized at 1Gbps full duplex. Packet loss reduced to 0%.",
  "followUpRequired": true,
  "followUpNote": "Check port drop statistics tomorrow morning after 9:00 AM lectures.",
  "attachmentNotes": "Photo of damaged RJ45 clip uploaded to attachments (switch_patch_bad.jpg)."
}
```

* **Validation Rules**:
  - `actionDateTime`: Optional ISO 8601 string; defaults to `NOW()`. Must be $\le \text{NOW()}$ (no future timestamps).
  - `actionDescription`: Mandatory string, min 5, max 1,000 characters after trimming.
  - `result`: Mandatory string, min 2, max 1,000 characters after trimming.
  - `followUpRequired`: Mandatory boolean.
  - `followUpNote`: 
    - If `followUpRequired === true`: Mandatory string, min 3, max 1,000 characters.
    - If `followUpRequired === false`: Optional; cleared/nullified by server.
  - `attachmentNotes`: Optional string, max 500 characters.

* **Success Response `201 Created`**:
```json
{
  "actionTaken": {
    "id": 1,
    "ticketId": 14,
    "actionDateTime": "2026-10-29T09:30:00.000Z",
    "actionDescription": "Inspected Building 2 Cisco switch. Found port 14 flapping. Replaced patch cord.",
    "result": "Port link stabilized at 1Gbps full duplex. Packet loss reduced to 0%.",
    "followUpRequired": true,
    "followUpNote": "Check port drop statistics tomorrow morning after 9:00 AM lectures.",
    "attachmentNotes": "Photo of damaged RJ45 clip uploaded to attachments (switch_patch_bad.jpg).",
    "performedBy": {
      "id": 7,
      "name": "Wichai IT",
      "email": "wichai.it@kmutt.ac.th",
      "role": "IT_STAFF"
    },
    "createdAt": "2026-10-29T09:35:12.000Z",
    "updatedAt": "2026-10-29T09:35:12.000Z"
  }
}
```

* **Error Responses**:
  - `400 Bad Request` (`VALIDATION_FAILED`): Schema violations or missing mandatory conditional note.
  - `401 Unauthorized` (`UNAUTHENTICATED`): User not authenticated.
  - `403 Forbidden` (`FORBIDDEN`): User has role `REQUESTER`.
  - `404 Not Found` (`NOT_FOUND`): Ticket does not exist.

---

### 2.2. List Actions Taken for Ticket
`GET /api/v1/tickets/:id/actions-taken`

Retrieves all Action Taken entries associated with a ticket, sorted chronologically ascending by `actionDateTime`.

* **Authorization**:
  - `IT_STAFF`, `ADMINISTRATOR`: Permitted on all tickets.
  - `REQUESTER`: Permitted **only** if `ticket.requesterId === req.user.id`.
* **Path Parameters**:
  - `id` (integer, required): Target Ticket ID.
* **Success Response `200 OK`**:
```json
{
  "actionsTaken": [
    {
      "id": 1,
      "ticketId": 14,
      "actionDateTime": "2026-10-29T09:30:00.000Z",
      "actionDescription": "Inspected Building 2 Cisco switch. Found port 14 flapping. Replaced patch cord.",
      "result": "Port link stabilized at 1Gbps full duplex. Packet loss reduced to 0%.",
      "followUpRequired": true,
      "followUpNote": "Check port drop statistics tomorrow morning after 9:00 AM lectures.",
      "attachmentNotes": "Photo of damaged RJ45 clip uploaded to attachments (switch_patch_bad.jpg).",
      "performedBy": {
        "id": 7,
        "name": "Wichai IT",
        "email": "wichai.it@kmutt.ac.th",
        "role": "IT_STAFF"
      },
      "createdAt": "2026-10-29T09:35:12.000Z",
      "updatedAt": "2026-10-29T09:35:12.000Z"
    },
    {
      "id": 2,
      "ticketId": 14,
      "actionDateTime": "2026-10-29T10:15:00.000Z",
      "actionDescription": "Conducted follow-up telemetry check on switch port 14 via SNMP console.",
      "result": "Zero CRC errors or packet drops over past 45 minutes.",
      "followUpRequired": false,
      "followUpNote": null,
      "attachmentNotes": null,
      "performedBy": {
        "id": 8,
        "name": "Ekachai IT",
        "email": "ekachai.it@kmutt.ac.th",
        "role": "IT_STAFF"
      },
      "createdAt": "2026-10-29T10:18:00.000Z",
      "updatedAt": "2026-10-29T10:18:00.000Z"
    }
  ]
}
```

* **Error Responses**:
  - `401 Unauthorized` (`UNAUTHENTICATED`): User not authenticated.
  - `403 Forbidden` (`FORBIDDEN`): Requester querying another user's ticket.
  - `404 Not Found` (`NOT_FOUND`): Ticket does not exist.

---

### 2.3. Update Action Taken
`PUT /api/v1/tickets/:id/actions-taken/:actionId`

Updates an existing Action Taken record. Note that the original `performedById` is immutable and cannot be transferred.

* **Authorization**: `IT_STAFF`, `ADMINISTRATOR`.
* **Path Parameters**:
  - `id` (integer, required): Target Ticket ID.
  - `actionId` (integer, required): Target Action Taken ID.
* **Request Body**:
```json
{
  "actionDateTime": "2026-10-29T09:30:00.000Z",
  "actionDescription": "Inspected Building 2 Cisco switch. Replaced patch cord and cleaned SFP optic.",
  "result": "Port link stabilized at 1Gbps full duplex. Packet loss reduced to 0%.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "Updated photo uploaded to attachments.",
  "versionTimestamp": "2026-10-29T09:35:12.000Z"
}
```

* **Validation Rules**: Same as POST; `versionTimestamp` (ISO date string) is optional for optimistic concurrency validation.
* **Success Response `200 OK`**: Returns updated `actionTaken` DTO with refreshed `updatedAt`.
* **Error Responses**:
  - `400 Bad Request` (`VALIDATION_FAILED`): Schema violations.
  - `401 Unauthorized` (`UNAUTHENTICATED`): Not authenticated.
  - `403 Forbidden` (`FORBIDDEN`): User has role `REQUESTER`.
  - `404 Not Found` (`NOT_FOUND`): Action Taken or Ticket does not exist.
  - `409 Conflict` (`STALE_RECORD_CONFLICT`): `versionTimestamp` does not match server `updatedAt`.

---

## 3. Dashboard Endpoints

### 3.1. Requester Dashboard
`GET /api/v1/dashboards/requester`

Retrieves summary metrics and recently updated tickets strictly scoped to the authenticated requester (`req.user.id`).

* **Authorization**: Authenticated users (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR` viewing requester view).
* **Success Response `200 OK`**:
```json
{
  "metrics": {
    "openTicketsCount": 3,
    "waitingForRequesterCount": 1,
    "recentlyResolvedCount": 5
  },
  "recentlyUpdatedTickets": [
    {
      "id": 12,
      "ticketNumber": "TKT-2026-00012",
      "summary": "Projector not displaying HDMI signal",
      "currentStatus": "WAITING_FOR_REQUESTER",
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "updatedAt": "2026-10-29T09:00:00.000Z"
    },
    {
      "id": 8,
      "ticketNumber": "TKT-2026-00008",
      "summary": "Cannot access campus VPN from dormitory",
      "currentStatus": "IN_PROGRESS",
      "requestedPriority": "MEDIUM",
      "itPriority": "MEDIUM",
      "updatedAt": "2026-10-28T16:20:00.000Z"
    }
  ]
}
```

* **Error Responses**:
  - `401 Unauthorized` (`UNAUTHENTICATED`): Session expired or missing.

---

### 3.2. IT Staff Dashboard
`GET /api/v1/dashboards/staff`

Retrieves operational metrics and recent active tickets across the entire service desk.

* **Authorization**: `IT_STAFF`, `ADMINISTRATOR`. (Requesters return `403 Forbidden`).
* **Success Response `200 OK`**:
```json
{
  "metrics": {
    "unassignedTicketsCount": 4,
    "myOwnedTicketsCount": 6,
    "totalActiveTicketsCount": 18,
    "statusCounts": {
      "NEW": 2,
      "OPEN": 4,
      "IN_PROGRESS": 8,
      "WAITING_FOR_REQUESTER": 4,
      "RESOLVED": 5,
      "CLOSED": 22,
      "REOPENED": 0,
      "CANCELLED": 3
    },
    "priorityCounts": {
      "URGENT": 3,
      "HIGH": 7,
      "MEDIUM": 6,
      "LOW": 2
    }
  },
  "recentlyUpdatedTickets": [
    {
      "id": 14,
      "ticketNumber": "TKT-2026-00014",
      "summary": "Building 2 Switch Port Down",
      "currentStatus": "IN_PROGRESS",
      "itPriority": "URGENT",
      "owner": {
        "id": 7,
        "name": "Wichai IT"
      },
      "updatedAt": "2026-10-29T10:18:00.000Z"
    },
    {
      "id": 18,
      "ticketNumber": "TKT-2026-00018",
      "summary": "Lab 2 Wi-Fi Offline",
      "currentStatus": "OPEN",
      "itPriority": "HIGH",
      "owner": null,
      "updatedAt": "2026-10-29T09:50:00.000Z"
    }
  ]
}
```

* **Error Responses**:
  - `401 Unauthorized` (`UNAUTHENTICATED`): Session missing.
  - `403 Forbidden` (`FORBIDDEN`): User is a Requester.

---

### 3.3. Administrator Dashboard
`GET /api/v1/dashboards/admin`

Retrieves IT Staff operational metrics plus system-wide administrative account tallies.

* **Authorization**: `ADMINISTRATOR`. (IT Staff and Requesters return `403 Forbidden`).
* **Success Response `200 OK`**:
```json
{
  "staffMetrics": {
    "unassignedTicketsCount": 4,
    "myOwnedTicketsCount": 2,
    "totalActiveTicketsCount": 18,
    "statusCounts": {
      "NEW": 2,
      "OPEN": 4,
      "IN_PROGRESS": 8,
      "WAITING_FOR_REQUESTER": 4,
      "RESOLVED": 5,
      "CLOSED": 22,
      "REOPENED": 0,
      "CANCELLED": 3
    },
    "priorityCounts": {
      "URGENT": 3,
      "HIGH": 7,
      "MEDIUM": 6,
      "LOW": 2
    }
  },
  "adminMetrics": {
    "usersByRole": {
      "REQUESTER": 45,
      "IT_STAFF": 8,
      "ADMINISTRATOR": 2
    },
    "activeUsersCount": 52,
    "inactiveUsersCount": 3,
    "totalTicketsCount": 58
  },
  "recentlyUpdatedTickets": [
    {
      "id": 14,
      "ticketNumber": "TKT-2026-00014",
      "summary": "Building 2 Switch Port Down",
      "currentStatus": "IN_PROGRESS",
      "itPriority": "URGENT",
      "owner": {
        "id": 7,
        "name": "Wichai IT"
      },
      "updatedAt": "2026-10-29T10:18:00.000Z"
    }
  ]
}
```

* **Error Responses**:
  - `401 Unauthorized` (`UNAUTHENTICATED`): Session missing.
  - `403 Forbidden` (`FORBIDDEN`): Non-administrator access attempt.

---

## 4. Ticket Status Workflow Endpoint

### 4.1. Transition Ticket Status
`PATCH /api/v1/staff/tickets/:id/status`

Transitions a ticket to a new permitted status according to the 8-state transition matrix. Enforces the **Resolution Gate (BR-07)** and optimistic concurrency checking.

* **Authorization**: `IT_STAFF`, `ADMINISTRATOR`.
* **Path Parameters**:
  - `id` (integer, required): Target Ticket ID.
* **Request Body**:
```json
{
  "status": "RESOLVED",
  "cancellationReason": null,
  "versionTimestamp": "2026-10-29T09:00:00.000Z"
}
```

* **Validation Rules**:
  - `status`: Mandatory valid `TicketStatus` enum string (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
  - Transition validity: Must match permitted next states from `ticket.currentStatus`.
  - **Resolution Gate Rule (BR-07)**: If `status === "RESOLVED"` or `"CLOSED"`, the ticket must contain at least 1 recorded `ActionTaken` in the database. If count is 0, the API returns `400 Bad Request` with code `RESOLUTION_REQUIRES_ACTION_TAKEN`.
  - **Cancellation Rule**: If `status === "CANCELLED"`, `cancellationReason` is mandatory (string, min 5, max 1,000 characters).
  - **Optimistic Concurrency**: If `versionTimestamp` is supplied and does not match `ticket.updatedAt`, returns `409 Conflict`.

* **Success Response `200 OK`**:
```json
{
  "ticket": {
    "id": 14,
    "ticketNumber": "TKT-2026-00014",
    "currentStatus": "RESOLVED",
    "updatedAt": "2026-10-29T10:45:00.000Z"
  },
  "message": "Ticket status updated to RESOLVED."
}
```

* **Error Responses**:
  - `400 Bad Request` (`RESOLUTION_REQUIRES_ACTION_TAKEN`):
    ```json
    {
      "error": {
        "code": "RESOLUTION_REQUIRES_ACTION_TAKEN",
        "message": "Cannot transition ticket to RESOLVED or CLOSED without at least one recorded Action Taken.",
        "timestamp": "2026-10-29T10:45:00.000Z"
      }
    }
    ```
  - `400 Bad Request` (`INVALID_STATUS_TRANSITION`):
    ```json
    {
      "error": {
        "code": "INVALID_STATUS_TRANSITION",
        "message": "Cannot transition ticket from NEW directly to RESOLVED.",
        "timestamp": "2026-10-29T10:45:00.000Z"
      }
    }
    ```
  - `401 Unauthorized` (`UNAUTHENTICATED`): Session missing.
  - `403 Forbidden` (`FORBIDDEN`): User has role `REQUESTER`.
  - `404 Not Found` (`NOT_FOUND`): Ticket does not exist.
  - `409 Conflict` (`STALE_RECORD_CONFLICT`): Ticket was modified concurrently by another user.

