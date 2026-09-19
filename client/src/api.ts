import { User, LoginCredentials, ChangePasswordPayload, AuthResponse } from "./types/auth.js";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export * from "./types/auth.js";

export interface Category {
  id: number;
  code?: string;
  name: string;
  description?: string;
  isActive?: boolean;
}

export interface RequesterUser {
  id: number;
  name: string;
  email: string;
  department?: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface RelatedSystem {
  id: number;
  name: string;
  isActive: boolean;
}

export interface SystemStatus {
  online: boolean;
  categories: Category[];
}

export async function checkSystem(): Promise<SystemStatus> {
  const healthRes = await fetch(`${API_URL}/api/health`);
  if (!healthRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const categoriesRes = await fetch(`${API_URL}/api/categories`);
  if (!categoriesRes.ok) {
    throw new Error("Unable to connect to TokTickIT API");
  }

  const categories: Category[] = await categoriesRes.json();
  return { online: true, categories };
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/api/categories`);
  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }
  return res.json();
}

export async function fetchRequesters(): Promise<RequesterUser[]> {
  const res = await fetch(`${API_URL}/api/requesters`);
  if (!res.ok) {
    throw new Error("Failed to fetch development requesters");
  }
  return res.json();
}

export async function fetchRelatedSystems(): Promise<RelatedSystem[]> {
  const res = await fetch(`${API_URL}/api/related-systems`);
  if (!res.ok) {
    throw new Error("Failed to fetch related systems");
  }
  return res.json();
}

export interface Attachment {
  id: number;
  ticketId?: number;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  sizeBytes?: number;
  isRemoved?: boolean;
  isDeleted?: boolean;
  removalReason?: string | null;
  removedAt?: string | null;
  removedByRequesterId?: number | null;
  createdAt: string;
  uploadedAt?: string;
}

export interface PublicCommentDTO {
  id: number;
  ticketId: number;
  authorId: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    email?: string;
    role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  };
}

export interface InternalNoteDTO {
  id: number;
  ticketId: number;
  authorId: number;
  content: string;
  createdAt: string;
  author: {
    id: number;
    name: string;
    email?: string;
    role: "IT_STAFF" | "ADMINISTRATOR";
  };
}

export interface AssigneeOption {
  id: number;
  name: string;
  email: string;
  role: "IT_STAFF" | "ADMINISTRATOR";
}

export interface Ticket {
  id: number;
  ticketNumber: string;
  ticketNo?: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: string;
  itPriority?: string | null;
  currentStatus: string;
  status?: string;
  ticketOwner?: string | null;
  ownerId?: number | null;
  owner?: {
    id: number;
    name: string;
    email?: string;
    role?: string;
  } | null;
  requesterResolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  requester: {
    id: number;
    name: string;
    displayName?: string;
    email: string;
    department?: string | null;
  };
  category: {
    id: number;
    name: string;
    code?: string | null;
  };
  relatedSystem: {
    id: number;
    name: string;
  };
  attachments: Attachment[];
  publicComments?: PublicCommentDTO[];
  internalNotes?: InternalNoteDTO[];
}

export type StaffTicketDetailDTO = Ticket;

export interface CreateTicketData {
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  requestedPriority: string;
  summary: string;
  description: string;
}

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    fieldErrors?: ApiFieldError[];
    timestamp?: string;
  };
}

export async function createTicket(
  data: CreateTicketData | FormData
): Promise<Ticket> {
  const isFormData = typeof FormData !== "undefined" && data instanceof FormData;
  const headers: Record<string, string> = isFormData
    ? {}
    : { "Content-Type": "application/json" };

  const res = await fetch(`${API_URL}/api/tickets`, {
    method: "POST",
    headers,
    body: isFormData ? data : JSON.stringify(data),
  });

  if (!res.ok) {
    let errorData: ApiErrorResponse | undefined;
    try {
      errorData = await res.json();
    } catch {
      // JSON parse failed
    }

    const message = errorData?.error?.message || "Failed to create ticket";
    const error = new Error(message) as Error & {
      code?: string;
      fieldErrors?: ApiFieldError[];
    };
    error.code = errorData?.error?.code;
    error.fieldErrors = errorData?.error?.fieldErrors;
    throw error;
  }

  return res.json();
}

export interface TicketSummaryItem {
  id: number;
  ticketNumber: string;
  ticketNo?: string;
  requesterId: number;
  categoryId: number;
  relatedSystemId: number;
  summary: string;
  description: string;
  requestedPriority: string;
  itPriority: string | null;
  currentStatus: string;
  status?: string;
  createdAt: string;
  updatedAt: string;
  attachmentCount: number;
  requester: {
    id: number;
    name: string;
    email: string;
  };
  category: {
    id: number;
    code?: string | null;
    name: string;
  };
  relatedSystem: {
    id: number;
    name: string;
  };
}

export interface TicketListResponse {
  items: TicketSummaryItem[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  page?: number;
  pageSize: number;
}

export interface GetTicketsParams {
  search?: string;
  category?: string | number;
  requestedPriority?: string;
  itPriority?: string;
  status?: string;
  sortBy?: "ticketNumber" | "createdAt" | "summary" | "requestedPriority" | "itPriority" | "currentStatus";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function fetchTickets(
  requesterId: number,
  params: GetTicketsParams = {},
  signal?: AbortSignal
): Promise<TicketListResponse> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.category !== undefined && params.category !== "") query.set("category", String(params.category));
  if (params.requestedPriority) query.set("requestedPriority", params.requestedPriority);
  if (params.itPriority) query.set("itPriority", params.itPriority);
  if (params.status) query.set("status", params.status);
  if (params.sortBy) query.set("sortBy", params.sortBy);
  if (params.sortOrder) query.set("sortOrder", params.sortOrder);
  if (params.page !== undefined) query.set("page", String(params.page));
  if (params.pageSize !== undefined) query.set("pageSize", String(params.pageSize));

  const queryString = query.toString();
  const url = `${API_URL}/api/tickets${queryString ? `?${queryString}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      "x-requester-id": String(requesterId),
    },
    signal,
  });

  if (!res.ok) {
    let errorData: ApiErrorResponse | undefined;
    try {
      errorData = await res.json();
    } catch {
      // ignore
    }
    const message = errorData?.error?.message || "Failed to fetch tickets";
    const error = new Error(message) as Error & { code?: string };
    error.code = errorData?.error?.code;
    throw error;
  }

  return res.json();
}

export async function fetchTicketById(
  id: number,
  requesterId?: number
): Promise<Ticket> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (requesterId) {
    headers["x-requester-id"] = String(requesterId);
  }

  const res = await fetch(`${API_URL}/api/tickets/${id}`, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    let errorData: ApiErrorResponse | undefined;
    try {
      errorData = await res.json();
    } catch {
      // ignore
    }
    const message = errorData?.error?.message || "Failed to fetch ticket";
    const error = new Error(message) as Error & { code?: string; status?: number };
    error.code = errorData?.error?.code;
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  return data.ticket ?? data;
}

export async function uploadAttachment(
  ticketId: number,
  file: File,
  requesterId: number
): Promise<Attachment> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/api/tickets/${ticketId}/attachments`, {
    method: "POST",
    headers: {
      "x-requester-id": String(requesterId),
    },
    body: formData,
  });

  if (!res.ok) {
    let errorData: ApiErrorResponse | undefined;
    try {
      errorData = await res.json();
    } catch {
      // ignore
    }
    const message = errorData?.error?.message || "Failed to upload attachment";
    const error = new Error(message) as Error & { code?: string; status?: number };
    error.code = errorData?.error?.code;
    error.status = res.status;
    throw error;
  }

  return res.json();
}

export async function downloadAttachment(
  attachmentId: number,
  originalFilename: string,
  requesterId: number
): Promise<void> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}/download`, {
    method: "GET",
    headers: {
      "x-requester-id": String(requesterId),
    },
  });

  if (!res.ok) {
    let errorData: ApiErrorResponse | undefined;
    try {
      errorData = await res.json();
    } catch {
      // ignore
    }
    const message = errorData?.error?.message || "Failed to download attachment";
    const error = new Error(message) as Error & { code?: string; status?: number };
    error.code = errorData?.error?.code;
    error.status = res.status;
    throw error;
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = downloadUrl;
  anchor.download = originalFilename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.URL.revokeObjectURL(downloadUrl);
}

export async function softRemoveAttachment(
  attachmentId: number,
  removalReason: string,
  requesterId: number
): Promise<Attachment | { success: boolean; attachment: Attachment }> {
  const res = await fetch(`${API_URL}/api/attachments/${attachmentId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "x-requester-id": String(requesterId),
    },
    body: JSON.stringify({ removalReason }),
  });

  if (!res.ok) {
    let errorData: ApiErrorResponse | undefined;
    try {
      errorData = await res.json();
    } catch {
      // ignore
    }
    const message = errorData?.error?.message || "Failed to remove attachment";
    const error = new Error(message) as Error & { code?: string; status?: number };
    error.code = errorData?.error?.code;
    error.status = res.status;
    throw error;
  }

  // Handle 204 No Content or empty response body safely
  let responseData: any = null;
  if (res.status !== 204) {
    const text = await res.text();
    if (text && text.trim().length > 0) {
      try {
        responseData = JSON.parse(text);
      } catch {
        responseData = null;
      }
    }
  }

  const rawAttachment: Partial<Attachment> =
    responseData?.attachment || responseData || {};

  const normalizedAttachment: Attachment = {
    id: rawAttachment.id ?? attachmentId,
    ticketId: rawAttachment.ticketId,
    originalFilename: rawAttachment.originalFilename ?? "attachment",
    mimeType: rawAttachment.mimeType ?? "application/octet-stream",
    fileSize: rawAttachment.fileSize ?? rawAttachment.sizeBytes ?? 0,
    sizeBytes: rawAttachment.sizeBytes ?? rawAttachment.fileSize ?? 0,
    isRemoved: true,
    isDeleted: true,
    removalReason: rawAttachment.removalReason ?? removalReason,
    removedAt: rawAttachment.removedAt ?? new Date().toISOString(),
    removedByRequesterId: rawAttachment.removedByRequesterId ?? requesterId,
    createdAt: rawAttachment.createdAt ?? new Date().toISOString(),
  };

  return Object.assign(normalizedAttachment, {
    success: true,
    attachment: normalizedAttachment,
  });
}

// ---------------------------------------------------------------------------
// Authentication API Functions (Lab 3 Feature 12)
// ---------------------------------------------------------------------------

export async function loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(credentials),
  });

  const data = await res.json();
  if (!res.ok) {
    const message = data.error?.message || "Invalid email or password";
    throw new Error(message);
  }

  return data;
}

export async function logoutUser(): Promise<{ message: string }> {
  const res = await fetch(`${API_URL}/api/v1/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to log out");
  }

  return data;
}

export async function fetchCurrentUser(): Promise<{ user: User }> {
  const res = await fetch(`${API_URL}/api/v1/auth/me`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Unauthenticated");
  }

  return data;
}

export async function changePassword(payload: ChangePasswordPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/v1/auth/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  if (!res.ok) {
    const errorMsg =
      data.error?.fieldErrors?.[0]?.message ||
      data.error?.message ||
      "Failed to update password";
    throw new Error(errorMsg);
  }

  return data;
}

export interface StaffTicketSummary {
  id: number;
  ticketNumber: string;
  summary: string;
  categoryName: string;
  categoryId: number;
  requestedPriority: string;
  itPriority: string;
  currentStatus: string;
  requesterName: string;
  requesterId: number;
  ownerName: string | null;
  ownerId: number | null;
  requesterResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StaffTicketQueryParams {
  search?: string;
  status?: string;
  category?: string | number;
  itPriority?: string;
  owner?: string | number;
  sortBy?: "createdAt" | "ticketNumber" | "summary" | "itPriority" | "currentStatus";
  sortOrder?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export interface StaffTicketQueueResponse {
  items: StaffTicketSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export async function fetchStaffTickets(
  params: StaffTicketQueryParams = {},
  signal?: AbortSignal
): Promise<StaffTicketQueueResponse> {
  const query = new URLSearchParams();

  if (params.search !== undefined && params.search.trim() !== "") {
    query.set("search", params.search.trim());
  }
  if (params.status !== undefined && params.status !== "") {
    query.set("status", params.status);
  }
  if (params.category !== undefined && params.category !== "") {
    query.set("category", String(params.category));
  }
  if (params.itPriority !== undefined && params.itPriority !== "") {
    query.set("itPriority", params.itPriority);
  }
  if (params.owner !== undefined && params.owner !== "") {
    query.set("owner", String(params.owner));
  }
  if (params.sortBy) {
    query.set("sortBy", params.sortBy);
  }
  if (params.sortOrder) {
    query.set("sortOrder", params.sortOrder);
  }
  if (params.page !== undefined) {
    query.set("page", String(params.page));
  }
  if (params.pageSize !== undefined) {
    query.set("pageSize", String(params.pageSize));
  }

  const queryString = query.toString();
  const url = `${API_URL}/api/v1/staff/tickets${queryString ? `?${queryString}` : ""}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
    signal,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to fetch staff tickets");
  }

  return data;
}

export async function fetchStaffTicketDetail(id: number): Promise<StaffTicketDetailDTO> {
  const res = await fetch(`${API_URL}/api/v1/tickets/${id}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  if (!res.ok) {
    let errorData: ApiErrorResponse | undefined;
    try {
      errorData = await res.json();
    } catch {
      // ignore
    }
    const message = errorData?.error?.message || "Failed to fetch ticket details";
    const error = new Error(message) as Error & { code?: string; status?: number };
    error.code = errorData?.error?.code;
    error.status = res.status;
    throw error;
  }

  const data = await res.json();
  return data.ticket ?? data;
}

export async function fetchAssignees(): Promise<AssigneeOption[]> {
  const res = await fetch(`${API_URL}/api/v1/staff/tickets/assignees`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to fetch assignees");
  }

  return Array.isArray(data) ? data : (data.assignees || []);
}

export async function assignTicketOwner(
  ticketId: number,
  ownerId: number | null
): Promise<{ message: string; owner: AssigneeOption | null }> {
  const res = await fetch(`${API_URL}/api/v1/staff/tickets/${ticketId}/assignment`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ ownerId }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to update ticket assignment");
  }

  return data;
}

export async function updateTicketPriority(
  ticketId: number,
  itPriority: string
): Promise<{ message: string; itPriority: string }> {
  const res = await fetch(`${API_URL}/api/v1/staff/tickets/${ticketId}/priority`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ itPriority }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to update IT priority");
  }

  return data;
}

export async function transitionTicketStatus(
  ticketId: number,
  status: string
): Promise<{ message: string; currentStatus: string }> {
  const res = await fetch(`${API_URL}/api/v1/staff/tickets/${ticketId}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ status }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to transition ticket status");
  }

  return data;
}

export async function indicateProblemResolved(
  ticketId: number
): Promise<{ message: string; requesterResolvedAt: string }> {
  const res = await fetch(`${API_URL}/api/v1/tickets/${ticketId}/resolve-request`, {
    method: "POST",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to record resolution request");
  }

  return data;
}

export async function postPublicComment(
  ticketId: number,
  content: string
): Promise<{ comment: PublicCommentDTO }> {
  const res = await fetch(`${API_URL}/api/v1/tickets/${ticketId}/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ content }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to post public comment");
  }

  return data;
}

export async function postInternalNote(
  ticketId: number,
  content: string
): Promise<{ note: InternalNoteDTO }> {
  const res = await fetch(`${API_URL}/api/v1/tickets/${ticketId}/notes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ content }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error?.message || "Failed to post internal note");
  }

  return data;
}

// ---------------------------------------------------------------------------
// Administrator User Management APIs (Lab 3 Issue 15)
// ---------------------------------------------------------------------------
export interface AdminUserSummaryDTO {
  id: number;
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  department?: string | null;
  isActive: boolean;
  mustChangePassword: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive?: boolean;
  initialPassword: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  isActive?: boolean;
}

export async function fetchAdminUsers(params?: {
  search?: string;
  role?: string;
}): Promise<{ users: AdminUserSummaryDTO[]; totalCount: number }> {
  const query = new URLSearchParams();
  if (params?.search) query.set("search", params.search);
  if (params?.role && params.role !== "ALL") query.set("role", params.role);

  const qs = query.toString() ? `?${query.toString()}` : "";
  const res = await fetch(`${API_URL}/api/v1/admin/users${qs}`, {
    method: "GET",
    headers: {
      Accept: "application/json",
    },
    credentials: "include",
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error: any = new Error(data.error?.message || "Failed to fetch users");
    error.code = data.error?.code;
    throw error;
  }

  return data;
}

export async function createAdminUser(
  payload: CreateUserPayload
): Promise<{ user: AdminUserSummaryDTO }> {
  const res = await fetch(`${API_URL}/api/v1/admin/users`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error: any = new Error(data.error?.message || "Failed to create user");
    error.code = data.error?.code;
    error.field = data.error?.field;
    throw error;
  }

  return data;
}

export async function updateAdminUser(
  id: number,
  payload: UpdateUserPayload
): Promise<{ user: AdminUserSummaryDTO }> {
  const res = await fetch(`${API_URL}/api/v1/admin/users/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify(payload),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error: any = new Error(data.error?.message || "Failed to update user");
    error.code = data.error?.code;
    error.field = data.error?.field;
    throw error;
  }

  return data;
}

export async function resetUserPassword(
  id: number,
  initialPassword: string
): Promise<{ message: string; userId: number }> {
  const res = await fetch(`${API_URL}/api/v1/admin/users/${id}/reset-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ initialPassword }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const error: any = new Error(data.error?.message || "Failed to reset password");
    error.code = data.error?.code;
    error.field = data.error?.field;
    throw error;
  }

  return data;
}

