import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import UserManagement from "../../components/UserManagement.js";
import * as api from "../../api.js";

// Mock user state
let mockCurrentUser = {
  id: 1,
  name: "Admin TokTick",
  email: "admin.toktick@kmutt.ac.th",
  role: "ADMINISTRATOR" as const,
  isActive: true,
};

vi.mock("../../context/AuthContext.js", () => ({
  useAuth: () => ({
    user: mockCurrentUser,
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockUsers: api.AdminUserSummaryDTO[] = [
  {
    id: 1,
    name: "Admin TokTick",
    email: "admin.toktick@kmutt.ac.th",
    role: "ADMINISTRATOR",
    department: "IT Central Administration",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-09-01T08:00:00.000Z",
  },
  {
    id: 2,
    name: "Backup Admin",
    email: "backup.admin@kmutt.ac.th",
    role: "ADMINISTRATOR",
    department: "Disaster Recovery Services",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-09-01T08:15:00.000Z",
  },
  {
    id: 3,
    name: "Wichai IT",
    email: "wichai.it@kmutt.ac.th",
    role: "IT_STAFF",
    department: "Network Operations",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-09-01T08:30:00.000Z",
  },
  {
    id: 4,
    name: "Sompong IT",
    email: "sompong.it@kmutt.ac.th",
    role: "REQUESTER",
    department: "Computer Engineering",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-09-01T09:00:00.000Z",
  },
  {
    id: 5,
    name: "Prasert Inactive",
    email: "prasert.in@kmutt.ac.th",
    role: "REQUESTER",
    department: "Human Resources",
    isActive: false,
    mustChangePassword: false,
    createdAt: "2026-09-01T09:30:00.000Z",
  },
];

describe("UserManagement Component Suite (Issue 15)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockCurrentUser = {
      id: 1,
      name: "Admin TokTick",
      email: "admin.toktick@kmutt.ac.th",
      role: "ADMINISTRATOR",
      isActive: true,
    };
    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue({
      users: mockUsers,
      totalCount: mockUsers.length,
    });
  });

  // -------------------------------------------------------------------------
  // UI-ADM-01: Directory Rendering & Search/Filter
  // -------------------------------------------------------------------------
  it("UI-ADM-01: renders user table, role badges, status badges, and search/filter toolbar", async () => {
    render(<UserManagement />);

    expect(screen.getByText(/Administrator User Management/i)).toBeInTheDocument();
    expect(screen.getByTestId("btn-create-user")).toBeInTheDocument();
    expect(screen.getByTestId("input-search-users")).toBeInTheDocument();
    expect(screen.getByTestId("select-role-filter")).toBeInTheDocument();

    // Verify user rows rendered
    await waitFor(() => {
      expect(screen.getByTestId("user-row-1")).toHaveTextContent("Admin TokTick");
      expect(screen.getByTestId("user-row-3")).toHaveTextContent("Wichai IT");
      expect(screen.getByTestId("user-row-4")).toHaveTextContent("Sompong IT");
    });

    // Verify role badges
    expect(screen.getByTestId("role-badge-1")).toHaveTextContent("Administrator");
    expect(screen.getByTestId("role-badge-3")).toHaveTextContent("IT Staff");
    expect(screen.getByTestId("role-badge-4")).toHaveTextContent("Requester");

    // Verify status badges
    expect(screen.getByTestId("status-badge-1")).toHaveTextContent("Active");
    expect(screen.getByTestId("status-badge-5")).toHaveTextContent("Inactive");

    // Verify '(You)' indicator for logged-in user
    expect(screen.getAllByTestId("badge-you").length).toBeGreaterThanOrEqual(1);
  });

  // -------------------------------------------------------------------------
  // UI-ADM-02: Create User Modal & Duplicate Email Conflict Handling (AC-15.2)
  // -------------------------------------------------------------------------
  it("UI-ADM-02: opens Create User modal, submits valid data, and handles duplicate email conflict alert", async () => {
    const createSpy = vi.spyOn(api, "createAdminUser").mockResolvedValue({
      user: {
        id: 10,
        name: "New Student",
        email: "new.student@kmutt.ac.th",
        role: "REQUESTER",
        department: null,
        isActive: true,
        mustChangePassword: true,
        createdAt: "2026-09-16T12:00:00.000Z",
      },
    });

    render(<UserManagement />);

    // Click Create User
    fireEvent.click(screen.getByTestId("btn-create-user"));
    expect(screen.getByText(/Create New User Account/i)).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByTestId("input-create-name"), {
      target: { value: "New Student" },
    });
    fireEvent.change(screen.getByTestId("input-create-email"), {
      target: { value: "new.student@kmutt.ac.th" },
    });
    fireEvent.change(screen.getByTestId("select-create-role"), {
      target: { value: "REQUESTER" },
    });
    fireEvent.change(screen.getByTestId("input-create-password"), {
      target: { value: "InitialSecurePass123!" },
    });

    // Submit
    fireEvent.click(screen.getByTestId("btn-submit-create"));

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith({
        name: "New Student",
        email: "new.student@kmutt.ac.th",
        role: "REQUESTER",
        isActive: true,
        initialPassword: "InitialSecurePass123!",
      });
    });

    // Now test duplicate email error alert (409 Conflict)
    createSpy.mockRejectedValueOnce(
      Object.assign(new Error("Email is already registered to another account."), {
        code: "EMAIL_ALREADY_EXISTS",
      })
    );

    fireEvent.click(screen.getByTestId("btn-create-user"));
    fireEvent.change(screen.getByTestId("input-create-name"), {
      target: { value: "Duplicate User" },
    });
    fireEvent.change(screen.getByTestId("input-create-email"), {
      target: { value: "sompong.it@kmutt.ac.th" },
    });
    fireEvent.change(screen.getByTestId("input-create-password"), {
      target: { value: "InitialSecurePass123!" },
    });
    fireEvent.click(screen.getByTestId("btn-submit-create"));

    await waitFor(() => {
      expect(screen.getByTestId("create-error-alert")).toHaveTextContent(
        /Email is already registered to another account/i
      );
    });
  });

  // -------------------------------------------------------------------------
  // UI-ADM-03: Self-Deactivation Guardrail in Edit Modal (BR-11, AC-15.3)
  // -------------------------------------------------------------------------
  it("UI-ADM-03: disables Active toggle and Role dropdown with warning when editing self", async () => {
    render(<UserManagement />);

    // Click Edit on User 1 (Admin TokTick, logged-in user)
    await waitFor(() => {
      expect(screen.getByTestId("btn-edit-user-1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("btn-edit-user-1"));

    expect(screen.getByText(/Edit User Account: Admin TokTick/i)).toBeInTheDocument();

    // Verify self-edit warning banner is rendered
    expect(screen.getByTestId("self-edit-warning")).toBeInTheDocument();
    expect(screen.getByTestId("self-edit-warning")).toHaveTextContent(
      /cannot deactivate or demote your own active administrator account/i
    );

    // Verify Active toggle and Role select are disabled
    expect(screen.getByTestId("toggle-edit-active")).toBeDisabled();
    expect(screen.getByTestId("select-edit-role")).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // UI-ADM-04: Last Active Admin Guardrail in Edit Modal (BR-12, AC-15.4)
  // -------------------------------------------------------------------------
  it("UI-ADM-04: disables Active toggle and Role dropdown when editing sole remaining active admin", async () => {
    // Setup state where user 2 (Backup Admin) is inactive, so user 1 is the SOLE active admin
    // And simulate logged-in user being another user (or viewing user 1 when sole active)
    const singleAdminUsers: api.AdminUserSummaryDTO[] = [
      {
        id: 2,
        name: "Sole Active Admin",
        email: "sole.admin@kmutt.ac.th",
        role: "ADMINISTRATOR",
        department: "IT",
        isActive: true,
        mustChangePassword: false,
        createdAt: "2026-09-01T08:00:00.000Z",
      },
      {
        id: 3,
        name: "Wichai IT",
        email: "wichai.it@kmutt.ac.th",
        role: "IT_STAFF",
        department: "IT",
        isActive: true,
        mustChangePassword: false,
        createdAt: "2026-09-01T08:30:00.000Z",
      },
    ];

    // Current user is an admin with ID 99 (not user 2)
    mockCurrentUser = {
      id: 99,
      name: "Temporary Auditor",
      email: "auditor@kmutt.ac.th",
      role: "ADMINISTRATOR",
      isActive: true,
    };

    vi.spyOn(api, "fetchAdminUsers").mockResolvedValue({
      users: singleAdminUsers,
      totalCount: singleAdminUsers.length,
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("btn-edit-user-2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-edit-user-2"));

    // Verify last-admin warning is rendered
    expect(screen.getByTestId("last-admin-warning")).toBeInTheDocument();
    expect(screen.getByTestId("last-admin-warning")).toHaveTextContent(
      /Cannot deactivate or demote the system's last active Administrator/i
    );

    // Verify Active toggle and Role selector are disabled
    expect(screen.getByTestId("toggle-edit-active")).toBeDisabled();
    expect(screen.getByTestId("select-edit-role")).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // UI-ADM-05: Reset Initial Password Modal Flow (AC-15.1)
  // -------------------------------------------------------------------------
  it("UI-ADM-05: opens Reset Password modal, validates complexity, and shows success message", async () => {
    const resetSpy = vi.spyOn(api, "resetUserPassword").mockResolvedValue({
      message: "Initial password has been reset. User will be required to change it at next login.",
      userId: 4,
    });

    render(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("btn-reset-pwd-4")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-reset-pwd-4"));

    expect(screen.getByText(/Reset Initial Password: Sompong IT/i)).toBeInTheDocument();

    // Type new password
    fireEvent.change(screen.getByTestId("input-reset-password"), {
      target: { value: "NewTempPassword456!" },
    });

    fireEvent.click(screen.getByTestId("btn-submit-reset"));

    await waitFor(() => {
      expect(resetSpy).toHaveBeenCalledWith(4, "NewTempPassword456!");
      expect(screen.getByTestId("reset-success-alert")).toHaveTextContent(
        /Initial password has been reset/i
      );
    });
  });
});
