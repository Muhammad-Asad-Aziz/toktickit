const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
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
  createdAt: string;
  updatedAt: string;
  requester: {
    id: number;
    name: string;
    email: string;
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
}

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

