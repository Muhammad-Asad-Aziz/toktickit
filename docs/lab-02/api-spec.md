# TokTickIT Sprint 2 (Lab 2) — REST API Specification

**Document Status**: Official REST API Contract Baseline  
**Base URL**: `http://localhost:3000/api/v1` (with `/api` backwards-compatible aliases for baseline endpoints)  
**Authentication Mechanism (Lab 2)**: Simulated Requester Context via `x-requester-id` HTTP header  
**Data Format**: JSON for standard endpoints; `multipart/form-data` for file uploads; binary octet-stream for downloads  

---

## 1. Global API Conventions

### 1.1. Headers
* `Content-Type: application/json` (for all JSON request bodies).
* `x-requester-id: <integer>` (identifies the simulated authenticated Requester in Lab 2).

### 1.2. Standard Error Response Envelope
All non-2xx responses follow a consistent error structure:

```json
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Invalid input provided.",
    "fieldErrors": [
      {
        "field": "summary",
        "message": "Summary is required and must not exceed 120 characters."
      }
    ],
    "timestamp": "2026-09-03T12:00:00.000Z"
  }
}
```

### 1.3. Standard HTTP Status Codes
* `200 OK`: Successful retrieval or mutation.
* `201 Created`: Resource successfully created (Ticket or Attachment).
* `400 Bad Request`: Payload validation failed, invalid query parameter, or file limit exceeded.
* `403 Forbidden`: Cross-requester ownership violation (attempting to access another user's ticket/file).
* `404 Not Found`: Requested resource does not exist (or has been soft-deleted).
* `410 Gone`: Resource previously existed but is soft-deleted and cannot be downloaded.
* `500 Internal Server Error`: Safe unexpected server error (without leaking stack traces).

---

## 2. Endpoints Catalog

### 2.1. Requesters (Simulated Login Context)

#### `GET /api/v1/requesters`
* **Summary**: Retrieve list of active Development Requesters for the selector screen.
* **Access**: Public.
* **Query Parameters**: None.
* **Response `200 OK`**:
```json
[
  {
    "id": 1,
    "displayName": "Sompong IT",
    "email": "sompong.it@kmutt.ac.th",
    "department": "Computer Engineering",
    "isActive": true
  },
  {
    "id": 2,
    "displayName": "Anong Staff",
    "email": "anong.st@kmutt.ac.th",
    "department": "Registrar Office",
    "isActive": true
  }
]
```
* **Invariant**: Inactive users (`isActive = false`) are strictly omitted.

---

### 2.2. Reference Data

#### `GET /api/v1/categories` (and `GET /api/categories`)
* **Summary**: Retrieve list of all IT request categories.
* **Access**: Public.
* **Response `200 OK`**:
```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

#### `GET /api/v1/related-systems`
* **Summary**: Retrieve list of active affected IT systems.
* **Access**: Public.
* **Response `200 OK`**:
```json
[
  { "id": 1, "name": "Campus Wi-Fi", "isActive": true },
  { "id": 2, "name": "Email", "isActive": true },
  { "id": 3, "name": "LEB2 App", "isActive": true },
  { "id": 4, "name": "VPN", "isActive": true },
  { "id": 5, "name": "Grade Submission App", "isActive": true },
  { "id": 6, "name": "Printer", "isActive": true },
  { "id": 7, "name": "Corporate Laptop", "isActive": true }
]
```

---

### 2.3. Tickets

#### `POST /api/v1/tickets`
* **Summary**: Create a new support ticket.
* **Headers**: `x-requester-id: <number>` (or passed in body as `requesterId`).
* **Request Body**:
```json
{
  "summary": "Cannot connect to campus Wi-Fi in building SCL",
  "description": "Device repeatedly fails authentication when trying to connect to KMUTT-Secure Wi-Fi on the 3rd floor.",
  "categoryId": 4,
  "relatedSystemId": 1,
  "requestedPriority": "HIGH"
}
```
* **Validation Rules**:
  * `summary`: Required string, trim whitespace, 1–120 characters.
  * `description`: Required string, 10–2000 characters.
  * `categoryId`: Required integer, must reference existing Category.
  * `relatedSystemId`: Required integer, must reference existing RelatedSystem.
  * `requestedPriority`: Required enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
* **Response `201 Created`**:
```json
{
  "id": 101,
  "ticketNo": "TKT-2026-00001",
  "summary": "Cannot connect to campus Wi-Fi in building SCL",
  "description": "Device repeatedly fails authentication when trying to connect to KMUTT-Secure Wi-Fi on the 3rd floor.",
  "status": "NEW",
  "requestedPriority": "HIGH",
  "category": { "id": 4, "name": "Network" },
  "relatedSystem": { "id": 1, "name": "Campus Wi-Fi" },
  "requester": { "id": 1, "displayName": "Sompong IT" },
  "createdAt": "2026-09-03T12:30:00.000Z",
  "attachments": []
}
```
* **Error `400 Bad Request`**: Validation failure with `fieldErrors`.

---

#### `GET /api/v1/tickets`
* **Summary**: List tickets owned by the active Requester with search, filters, sorting, and pagination.
* **Headers**: `x-requester-id: <number>` (mandatory).
* **Query Parameters**:
  * `search`: (optional) string, matches `ticketNo` or `summary` (case-insensitive).
  * `categoryId`: (optional) integer.
  * `status`: (optional) string (e.g. `NEW`).
  * `sortBy`: (optional) string (`createdAt`, `ticketNo`, `summary`), default `createdAt`.
  * `sortOrder`: (optional) string (`asc`, `desc`), default `desc`.
  * `page`: (optional) integer $\ge 1$, default `1`.
  * `pageSize`: (optional) integer (`10`, `25`, `50`), default `10`.
* **Server-Side Security**: Strictly enforces `WHERE requesterId = currentRequesterId`.
* **Response `200 OK`**:
```json
{
  "items": [
    {
      "id": 101,
      "ticketNo": "TKT-2026-00001",
      "summary": "Cannot connect to campus Wi-Fi in building SCL",
      "status": "NEW",
      "requestedPriority": "HIGH",
      "category": { "id": 4, "name": "Network" },
      "relatedSystem": { "id": 1, "name": "Campus Wi-Fi" },
      "createdAt": "2026-09-03T12:30:00.000Z",
      "attachmentCount": 2
    }
  ],
  "totalCount": 1,
  "page": 1,
  "pageSize": 10,
  "totalPages": 1
}
```

---

#### `GET /api/v1/tickets/:id`
* **Summary**: Retrieve detailed read-only information for an owned ticket.
* **Headers**: `x-requester-id: <number>` (mandatory).
* **URL Parameters**: `id` (integer).
* **Server-Side Security**: Verifies `ticket.requesterId == currentRequesterId`. If mismatched, returns `403 Forbidden` or `404 Not Found`.
* **Response `200 OK`**:
```json
{
  "id": 101,
  "ticketNo": "TKT-2026-00001",
  "summary": "Cannot connect to campus Wi-Fi in building SCL",
  "description": "Device repeatedly fails authentication when trying to connect to KMUTT-Secure Wi-Fi on the 3rd floor.",
  "status": "NEW",
  "requestedPriority": "HIGH",
  "category": { "id": 4, "name": "Network" },
  "relatedSystem": { "id": 1, "name": "Campus Wi-Fi" },
  "requester": { "id": 1, "displayName": "Sompong IT", "email": "sompong.it@kmutt.ac.th" },
  "createdAt": "2026-09-03T12:30:00.000Z",
  "updatedAt": "2026-09-03T12:30:00.000Z",
  "attachments": [
    {
      "id": 501,
      "originalFilename": "wifi_error_screenshot.png",
      "sizeBytes": 245760,
      "mimeType": "image/png",
      "uploadedAt": "2026-09-03T12:30:00.000Z",
      "isDeleted": false
    },
    {
      "id": 502,
      "originalFilename": "wrong_doc.pdf",
      "sizeBytes": 1048576,
      "mimeType": "application/pdf",
      "uploadedAt": "2026-09-03T12:31:00.000Z",
      "isDeleted": true,
      "deletedAt": "2026-09-03T12:35:00.000Z",
      "removalReason": "Uploaded incorrect diagnostic report"
    }
  ]
}
```

---

### 2.4. Attachments

#### `POST /api/v1/tickets/:id/attachments`
* **Summary**: Upload and attach a permitted file to an owned ticket.
* **Headers**: `x-requester-id: <number>`, `Content-Type: multipart/form-data`.
* **Form Field**: `file` (binary).
* **Validation Rules**:
  * Ticket ownership: `ticket.requesterId == currentRequesterId`.
  * File size: $\le 5\text{ MB}$ ($5,242,880$ bytes).
  * Allowed MIME/types: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`.
  * Active file count: Maximum 5 active attachments per ticket.
* **Response `201 Created`**:
```json
{
  "id": 503,
  "ticketId": 101,
  "originalFilename": "signal_strength.jpg",
  "sizeBytes": 420000,
  "mimeType": "image/jpeg",
  "uploadedAt": "2026-09-03T12:40:00.000Z",
  "isDeleted": false
}
```
* **Error `400 Bad Request`**: File exceeds 5MB, unsupported type, or active limit reached.

---

#### `GET /api/v1/attachments/:id/download`
* **Summary**: Stream the active attachment binary for download.
* **Headers**: `x-requester-id: <number>`.
* **Security & Invariants**:
  * Verifies `attachment.ticket.requesterId == currentRequesterId`.
  * Verifies `attachment.deletedAt IS NULL`. If soft-deleted, returns `404 Not Found` or `410 Gone`.
* **Response `200 OK`**:
  * `Content-Type: <mimeType>`
  * `Content-Disposition: attachment; filename="signal_strength.jpg"`
  * Body: Binary stream.

---

#### `DELETE /api/v1/attachments/:id`
* **Summary**: Soft-remove an attachment with an audited removal reason.
* **Headers**: `x-requester-id: <number>`, `Content-Type: application/json`.
* **Request Body**:
```json
{
  "removalReason": "Contains personal student information by mistake"
}
```
* **Validation & Actions**:
  * `removalReason`: Required non-empty string, 3–250 characters.
  * Verifies `attachment.ticket.requesterId == currentRequesterId`.
  * Sets `deletedAt = NOW()`, `deletedById = currentRequesterId`, stores `removalReason`.
  * Deletes physical file from storage.
* **Response `200 OK`**:
```json
{
  "id": 501,
  "isDeleted": true,
  "deletedAt": "2026-09-03T12:45:00.000Z",
  "removalReason": "Contains personal student information by mistake"
}
```
