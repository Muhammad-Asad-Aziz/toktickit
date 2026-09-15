export type Role = "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  mustChangePassword: boolean;
  isActive: boolean;
  department?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthResponse {
  user: User;
  token?: string;
  message?: string;
}
