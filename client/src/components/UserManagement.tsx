import React, { useState, useEffect, useMemo } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  AdminUserSummaryDTO,
  CreateUserPayload,
  UpdateUserPayload,
  fetchAdminUsers,
  createAdminUser,
  updateAdminUser,
  resetUserPassword,
} from "../api.js";

// Role badges styling matching Zen Green contract
const ROLE_BADGES: Record<
  string,
  { bg: string; color: string; border: string; label: string }
> = {
  REQUESTER: {
    bg: "#EAF6EF",
    color: "#006B3C",
    border: "1px solid #C4E5D2",
    label: "Requester",
  },
  IT_STAFF: {
    bg: "#E0F2FE",
    color: "#0369A1",
    border: "1px solid #BAE6FD",
    label: "IT Staff",
  },
  ADMINISTRATOR: {
    bg: "#F3E8FF",
    color: "#6B21A8",
    border: "1px solid #E9D5FF",
    label: "Administrator",
  },
};

// Account activation badges styling
const STATUS_BADGES = {
  active: {
    bg: "#DCFCE7",
    color: "#15803D",
    border: "1px solid #BBF7D0",
    label: "Active",
  },
  inactive: {
    bg: "#FEE2E2",
    color: "#991B1B",
    border: "1px solid #FECACA",
    label: "Inactive",
  },
};

export default function UserManagement() {
  const { user: currentUser } = useAuth();

  // Directory State
  const [users, setUsers] = useState<AdminUserSummaryDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserSummaryDTO | null>(null);
  const [resetPwdUser, setResetPwdUser] = useState<AdminUserSummaryDTO | null>(null);

  // Form State: Create User
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">("REQUESTER");
  const [createIsActive, setCreateIsActive] = useState(true);
  const [createPassword, setCreatePassword] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Form State: Edit User
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<"REQUESTER" | "IT_STAFF" | "ADMINISTRATOR">("REQUESTER");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editError, setEditError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  // Form State: Reset Password
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  // Load users
  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchAdminUsers({
        search: searchQuery.trim() || undefined,
        role: roleFilter !== "ALL" ? roleFilter : undefined,
      });
      setUsers(data.users);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load users directory");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [roleFilter]);

  // Handle Search Input Change
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadUsers();
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setRoleFilter("ALL");
  };

  // Count active administrators in current directory
  const activeAdminCount = useMemo(() => {
    return users.filter((u) => u.role === "ADMINISTRATOR" && u.isActive).length;
  }, [users]);

  // Open Create Modal
  const openCreateModal = () => {
    setCreateName("");
    setCreateEmail("");
    setCreateRole("REQUESTER");
    setCreateIsActive(true);
    setCreatePassword("");
    setCreateError(null);
    setIsCreateModalOpen(true);
  };

  // Open Edit Modal
  const openEditModal = (target: AdminUserSummaryDTO) => {
    setEditingUser(target);
    setEditName(target.name);
    setEditEmail(target.email);
    setEditRole(target.role);
    setEditIsActive(target.isActive);
    setEditError(null);
  };

  // Open Reset Password Modal
  const openResetPwdModal = (target: AdminUserSummaryDTO) => {
    setResetPwdUser(target);
    setResetPasswordVal("");
    setResetError(null);
    setResetSuccess(null);
  };

  // Password complexity helper
  const getPasswordValidation = (password: string) => ({
    hasLength: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
    hasSymbol: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  });

  // Submit Create User
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (!createName.trim() || createName.trim().length < 2) {
      setCreateError("Full name must be at least 2 characters.");
      return;
    }
    if (!createEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createEmail.trim())) {
      setCreateError("Please provide a valid email address.");
      return;
    }

    const val = getPasswordValidation(createPassword);
    if (!val.hasLength || !val.hasUpper || !val.hasLower || !val.hasDigit || !val.hasSymbol) {
      setCreateError("Password does not meet the complexity requirements.");
      return;
    }

    setIsCreating(true);
    try {
      await createAdminUser({
        name: createName.trim(),
        email: createEmail.trim(),
        role: createRole,
        isActive: createIsActive,
        initialPassword: createPassword,
      });
      setIsCreateModalOpen(false);
      await loadUsers();
    } catch (err: any) {
      setCreateError(err.message || "Failed to create user account.");
    } finally {
      setIsCreating(false);
    }
  };

  // Submit Edit User
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError(null);

    if (!editName.trim() || editName.trim().length < 2) {
      setEditError("Full name must be at least 2 characters.");
      return;
    }
    if (!editEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editEmail.trim())) {
      setEditError("Please provide a valid email address.");
      return;
    }

    setIsUpdating(true);
    try {
      await updateAdminUser(editingUser.id, {
        name: editName.trim(),
        email: editEmail.trim(),
        role: editRole,
        isActive: editIsActive,
      });
      setEditingUser(null);
      await loadUsers();
    } catch (err: any) {
      setEditError(err.message || "Failed to update user account.");
    } finally {
      setIsUpdating(false);
    }
  };

  // Submit Reset Password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPwdUser) return;
    setResetError(null);
    setResetSuccess(null);

    const val = getPasswordValidation(resetPasswordVal);
    if (!val.hasLength || !val.hasUpper || !val.hasLower || !val.hasDigit || !val.hasSymbol) {
      setResetError("New password does not meet the complexity requirements.");
      return;
    }

    setIsResetting(true);
    try {
      const res = await resetUserPassword(resetPwdUser.id, resetPasswordVal);
      setResetSuccess(res.message);
      setResetPasswordVal("");
      setTimeout(() => {
        setResetPwdUser(null);
      }, 1800);
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password.");
    } finally {
      setIsResetting(false);
    }
  };

  // Blur Validation Rule: Clears invalid email on blur
  const handleEmailBlur = (
    val: string,
    setter: React.Dispatch<React.SetStateAction<string>>
  ) => {
    const trimmed = val.trim();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setter("");
    } else {
      setter(trimmed);
    }
  };

  const createPassVal = getPasswordValidation(createPassword);
  const resetPassVal = getPasswordValidation(resetPasswordVal);

  return (
    <div className="container-fluid px-0" style={{ maxWidth: 1320 }}>
      {/* Header & Primary CTA */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-3 mb-4">
        <div>
          <h1
            className="fw-bold mb-1"
            style={{ fontSize: "1.75rem", color: "#1C2826" }}
          >
            Administrator User Management
          </h1>
          <p className="text-muted mb-0" style={{ fontSize: "0.95rem" }}>
            Manage university user accounts, roles, activation statuses, and initial credentials
          </p>
        </div>

        <button
          type="button"
          className="btn text-white fw-semibold px-3 py-2 d-inline-flex align-items-center gap-2 shadow-sm"
          style={{
            backgroundColor: "#006B3C",
            borderRadius: 6,
            minHeight: 40,
          }}
          onClick={openCreateModal}
          data-testid="btn-create-user"
        >
          <span>➕</span>
          <span>Create New User</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div
        className="card shadow-sm border-0 mb-4"
        style={{ borderRadius: 8, backgroundColor: "#FFFFFF" }}
      >
        <div className="card-body p-3">
          <form
            onSubmit={handleSearchSubmit}
            className="row g-2 align-items-center"
            data-testid="filter-toolbar-form"
          >
            <div className="col-12 col-md-6 col-lg-5">
              <div className="input-group">
                <span className="input-group-text bg-white border-end-0 text-muted">
                  🔍
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  data-testid="input-search-users"
                  style={{ height: 40 }}
                />
              </div>
            </div>

            <div className="col-8 col-md-4 col-lg-3">
              <select
                className="form-select"
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                data-testid="select-role-filter"
                style={{ height: 40 }}
              >
                <option value="ALL">All Roles</option>
                <option value="REQUESTER">Requester</option>
                <option value="IT_STAFF">IT Staff</option>
                <option value="ADMINISTRATOR">Administrator</option>
              </select>
            </div>

            <div className="col-4 col-md-2 col-lg-2 d-flex gap-2">
              <button
                type="submit"
                className="btn btn-outline-success w-100 fw-medium"
                style={{ height: 40, color: "#006B3C", borderColor: "#006B3C" }}
              >
                Search
              </button>
            </div>

            {(searchQuery || roleFilter !== "ALL") && (
              <div className="col-12 col-lg-2 text-lg-end mt-2 mt-lg-0">
                <button
                  type="button"
                  className="btn btn-link text-muted p-0 text-decoration-none"
                  onClick={handleResetFilters}
                  data-testid="btn-reset-filters"
                  style={{ fontSize: "0.9rem" }}
                >
                  ✕ Reset Filters
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Global Error Alert */}
      {errorMessage && (
        <div
          className="alert alert-danger d-flex align-items-center mb-4 shadow-sm"
          role="alert"
          style={{
            backgroundColor: "#FDF2F2",
            borderColor: "#B3261E",
            color: "#B3261E",
          }}
          data-testid="global-error-alert"
        >
          <span className="me-2">⚠️</span>
          <div>{errorMessage}</div>
        </div>
      )}

      {/* Directory Content */}
      <div
        className="card shadow-sm border-0"
        style={{ borderRadius: 8, backgroundColor: "#FFFFFF" }}
      >
        <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
          <span className="fw-semibold text-muted" style={{ fontSize: "0.95rem" }}>
            Showing {users.length} registered user{users.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="card-body p-0">
          {isLoading ? (
            /* Loading State */
            <div className="p-4 text-center text-muted" data-testid="loading-indicator">
              <div
                className="spinner-border text-success mb-2"
                role="status"
                style={{ width: "2rem", height: "2rem" }}
              >
                <span className="visually-hidden">Loading users...</span>
              </div>
              <p className="mb-0">Loading user directory...</p>
            </div>
          ) : users.length === 0 ? (
            /* Empty State */
            <div className="p-5 text-center" data-testid="empty-users-state">
              <span className="fs-1 d-block mb-2 text-muted">👥</span>
              <h3 className="h5 fw-bold text-dark mb-1">No user accounts found</h3>
              <p className="text-muted mb-3" style={{ fontSize: "0.95rem" }}>
                No accounts match your current search query or role filter.
              </p>
              {(searchQuery || roleFilter !== "ALL") && (
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleResetFilters}
                >
                  Clear Filters
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View (>= 768px) */}
              <div className="table-responsive d-none d-md-block">
                <table
                  className="table table-hover align-middle mb-0"
                  data-testid="users-table"
                >
                  <thead style={{ backgroundColor: "#F9FAFB" }}>
                    <tr>
                      <th className="py-3 px-4 text-secondary text-uppercase fw-semibold" style={{ fontSize: "0.8rem" }}>
                        Full Name
                      </th>
                      <th className="py-3 px-4 text-secondary text-uppercase fw-semibold" style={{ fontSize: "0.8rem" }}>
                        Email Address
                      </th>
                      <th className="py-3 px-4 text-secondary text-uppercase fw-semibold" style={{ fontSize: "0.8rem" }}>
                        Role
                      </th>
                      <th className="py-3 px-4 text-secondary text-uppercase fw-semibold" style={{ fontSize: "0.8rem" }}>
                        Status
                      </th>
                      <th className="py-3 px-4 text-secondary text-uppercase fw-semibold" style={{ fontSize: "0.8rem" }}>
                        Created Date
                      </th>
                      <th className="py-3 px-4 text-secondary text-uppercase fw-semibold text-end" style={{ fontSize: "0.8rem" }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((targetUser) => {
                      const isCurrent = currentUser?.id === targetUser.id;
                      const roleMeta = ROLE_BADGES[targetUser.role] || ROLE_BADGES.REQUESTER;
                      const statusMeta = targetUser.isActive
                        ? STATUS_BADGES.active
                        : STATUS_BADGES.inactive;

                      return (
                        <tr
                          key={targetUser.id}
                          data-testid={`user-row-${targetUser.id}`}
                          className={isCurrent ? "table-light" : ""}
                        >
                          <td className="py-3 px-4 fw-medium text-dark">
                            <span>{targetUser.name}</span>
                            {isCurrent && (
                              <span
                                className="badge bg-secondary ms-2 fw-normal"
                                style={{ fontSize: "0.75rem" }}
                                data-testid="badge-you"
                              >
                                You
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-muted">
                            <code>{targetUser.email}</code>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className="badge px-2 py-1 fw-medium"
                              style={{
                                backgroundColor: roleMeta.bg,
                                color: roleMeta.color,
                                border: roleMeta.border,
                              }}
                              data-testid={`role-badge-${targetUser.id}`}
                            >
                              {roleMeta.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className="badge px-2 py-1 fw-medium"
                              style={{
                                backgroundColor: statusMeta.bg,
                                color: statusMeta.color,
                                border: statusMeta.border,
                              }}
                              data-testid={`status-badge-${targetUser.id}`}
                            >
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-muted" style={{ fontSize: "0.9rem" }}>
                            {new Date(targetUser.createdAt).toISOString().slice(0, 10)}
                          </td>
                          <td className="py-3 px-4 text-end">
                            <div className="btn-group btn-group-sm">
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => openEditModal(targetUser)}
                                data-testid={`btn-edit-user-${targetUser.id}`}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="btn btn-outline-secondary"
                                onClick={() => openResetPwdModal(targetUser)}
                                data-testid={`btn-reset-pwd-${targetUser.id}`}
                              >
                                Reset Pwd
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Collapse (< 768px) */}
              <div className="d-md-none p-3 d-flex flex-column gap-3" data-testid="mobile-users-list">
                {users.map((targetUser) => {
                  const isCurrent = currentUser?.id === targetUser.id;
                  const roleMeta = ROLE_BADGES[targetUser.role] || ROLE_BADGES.REQUESTER;
                  const statusMeta = targetUser.isActive
                    ? STATUS_BADGES.active
                    : STATUS_BADGES.inactive;

                  return (
                    <div
                      key={targetUser.id}
                      className="card border shadow-sm p-3"
                      style={{
                        borderRadius: 6,
                        backgroundColor: "#FFFFFF",
                        borderLeft: `4px solid ${roleMeta.color}`,
                      }}
                      data-testid={`user-card-${targetUser.id}`}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div>
                          <h4 className="fw-bold fs-6 mb-0 text-dark">
                            {targetUser.name}
                            {isCurrent && (
                              <span className="badge bg-secondary ms-2 fw-normal" style={{ fontSize: "0.7rem" }}>
                                You
                              </span>
                            )}
                          </h4>
                          <span className="text-muted small">
                            <code>{targetUser.email}</code>
                          </span>
                        </div>
                        <span
                          className="badge px-2 py-1"
                          style={{
                            backgroundColor: roleMeta.bg,
                            color: roleMeta.color,
                            border: roleMeta.border,
                            fontSize: "0.75rem",
                          }}
                        >
                          {roleMeta.label}
                        </span>
                      </div>

                      <div className="d-flex justify-content-between align-items-center mt-2 pt-2 border-top">
                        <span
                          className="badge px-2 py-1"
                          style={{
                            backgroundColor: statusMeta.bg,
                            color: statusMeta.color,
                            border: statusMeta.border,
                          }}
                        >
                          {statusMeta.label}
                        </span>

                        <div className="d-flex gap-2">
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => openEditModal(targetUser)}
                            style={{ minHeight: 40 }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-secondary btn-sm"
                            onClick={() => openResetPwdModal(targetUser)}
                            style={{ minHeight: 40 }}
                          >
                            Reset Pwd
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Modal 1: Create User Modal                                        */}
      {/* ----------------------------------------------------------------- */}
      {isCreateModalOpen && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: 8 }}>
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark fs-5">
                  Create New User Account
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setIsCreateModalOpen(false)}
                  aria-label="Close"
                  disabled={isCreating}
                />
              </div>

              <form onSubmit={handleCreateSubmit} data-testid="form-create-user">
                <div className="modal-body p-4">
                  {createError && (
                    <div
                      className="alert alert-danger py-2 mb-3"
                      style={{ backgroundColor: "#FDF2F2", color: "#B3261E" }}
                      data-testid="create-error-alert"
                    >
                      {createError}
                    </div>
                  )}

                  {/* Full Name */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: "0.9rem" }}>
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Siriporn Engineer"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      onBlur={(e) => setCreateName(e.target.value.trim())}
                      required
                      data-testid="input-create-name"
                      style={{ height: 40 }}
                    />
                  </div>

                  {/* Email Address */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: "0.9rem" }}>
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="user@kmutt.ac.th"
                      value={createEmail}
                      onChange={(e) => setCreateEmail(e.target.value)}
                      onBlur={(e) => handleEmailBlur(e.target.value, setCreateEmail)}
                      required
                      data-testid="input-create-email"
                      style={{ height: 40 }}
                    />
                  </div>

                  {/* Role */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: "0.9rem" }}>
                      System Role <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={createRole}
                      onChange={(e) =>
                        setCreateRole(e.target.value as "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR")
                      }
                      data-testid="select-create-role"
                      style={{ height: 40 }}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  {/* Account Status Toggle */}
                  <div className="mb-3 form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="createIsActiveToggle"
                      checked={createIsActive}
                      onChange={(e) => setCreateIsActive(e.target.checked)}
                      data-testid="toggle-create-active"
                    />
                    <label className="form-check-label fw-medium" htmlFor="createIsActiveToggle">
                      Active Account (Enabled)
                    </label>
                  </div>

                  {/* Initial Password */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: "0.9rem" }}>
                      Initial Password <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter temporary password"
                      value={createPassword}
                      onChange={(e) => setCreatePassword(e.target.value)}
                      required
                      data-testid="input-create-password"
                      style={{ height: 40 }}
                    />
                    <div className="small text-muted mt-2">
                      <div className={createPassVal.hasLength ? "text-success" : "text-muted"}>
                        {createPassVal.hasLength ? "✓" : "○"} At least 8 characters
                      </div>
                      <div className={createPassVal.hasUpper ? "text-success" : "text-muted"}>
                        {createPassVal.hasUpper ? "✓" : "○"} At least 1 uppercase letter (A-Z)
                      </div>
                      <div className={createPassVal.hasLower ? "text-success" : "text-muted"}>
                        {createPassVal.hasLower ? "✓" : "○"} At least 1 lowercase letter (a-z)
                      </div>
                      <div className={createPassVal.hasDigit ? "text-success" : "text-muted"}>
                        {createPassVal.hasDigit ? "✓" : "○"} At least 1 numeric digit (0-9)
                      </div>
                      <div className={createPassVal.hasSymbol ? "text-success" : "text-muted"}>
                        {createPassVal.hasSymbol ? "✓" : "○"} At least 1 special symbol (!@#$%^&*...)
                      </div>
                    </div>
                  </div>

                  {/* Notice Alert */}
                  <div
                    className="alert alert-info py-2 px-3 mb-0"
                    style={{ fontSize: "0.85rem", backgroundColor: "#EAF6EF", color: "#006B3C", borderColor: "#C4E5D2" }}
                  >
                    ℹ️ <strong>Notice:</strong> The user will be required to change this initial password on their first login (FR-02).
                  </div>
                </div>

                <div className="modal-footer border-top px-4 py-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setIsCreateModalOpen(false)}
                    disabled={isCreating}
                    data-testid="btn-cancel-create"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn text-white fw-semibold"
                    style={{ backgroundColor: "#006B3C" }}
                    disabled={isCreating}
                    data-testid="btn-submit-create"
                  >
                    {isCreating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Creating User...
                      </>
                    ) : (
                      "Create User"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Modal 2: Edit User Modal                                          */}
      {/* ----------------------------------------------------------------- */}
      {editingUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: 8 }}>
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark fs-5">
                  Edit User Account: {editingUser.name}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setEditingUser(null)}
                  aria-label="Close"
                  disabled={isUpdating}
                />
              </div>

              <form onSubmit={handleEditSubmit} data-testid="form-edit-user">
                <div className="modal-body p-4">
                  {editError && (
                    <div
                      className="alert alert-danger py-2 mb-3"
                      style={{ backgroundColor: "#FDF2F2", color: "#B3261E" }}
                      data-testid="edit-error-alert"
                    >
                      {editError}
                    </div>
                  )}

                  {/* Safety Guard 1: Self Editing (BR-11) */}
                  {currentUser?.id === editingUser.id && (
                    <div
                      className="alert alert-warning py-2 mb-3"
                      style={{ backgroundColor: "#FFFBEB", borderColor: "#F59E0B", color: "#92400E", fontSize: "0.85rem" }}
                      data-testid="self-edit-warning"
                    >
                      ⚠️ <strong>Account Protection:</strong> You cannot deactivate or demote your own active administrator account (BR-11).
                    </div>
                  )}

                  {/* Safety Guard 2: Last Active Admin (BR-12) */}
                  {currentUser?.id !== editingUser.id &&
                    editingUser.role === "ADMINISTRATOR" &&
                    activeAdminCount <= 1 && (
                      <div
                        className="alert alert-warning py-2 mb-3"
                        style={{ backgroundColor: "#FFFBEB", borderColor: "#F59E0B", color: "#92400E", fontSize: "0.85rem" }}
                        data-testid="last-admin-warning"
                      >
                        ⚠️ <strong>System Safety:</strong> Cannot deactivate or demote the system's last active Administrator (BR-12).
                      </div>
                    )}

                  {/* Full Name */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: "0.9rem" }}>
                      Full Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={(e) => setEditName(e.target.value.trim())}
                      required
                      data-testid="input-edit-name"
                      style={{ height: 40 }}
                    />
                  </div>

                  {/* Email Address */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: "0.9rem" }}>
                      Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      onBlur={(e) => handleEmailBlur(e.target.value, setEditEmail)}
                      required
                      data-testid="input-edit-email"
                      style={{ height: 40 }}
                    />
                  </div>

                  {/* Role Selector */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: "0.9rem" }}>
                      System Role <span className="text-danger">*</span>
                    </label>
                    <select
                      className="form-select"
                      value={editRole}
                      onChange={(e) =>
                        setEditRole(e.target.value as "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR")
                      }
                      disabled={
                        currentUser?.id === editingUser.id ||
                        (editingUser.role === "ADMINISTRATOR" && activeAdminCount <= 1)
                      }
                      data-testid="select-edit-role"
                      style={{ height: 40 }}
                    >
                      <option value="REQUESTER">Requester</option>
                      <option value="IT_STAFF">IT Staff</option>
                      <option value="ADMINISTRATOR">Administrator</option>
                    </select>
                  </div>

                  {/* Active Toggle */}
                  <div className="mb-3 form-check form-switch">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="editIsActiveToggle"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      disabled={
                        currentUser?.id === editingUser.id ||
                        (editingUser.role === "ADMINISTRATOR" && activeAdminCount <= 1)
                      }
                      data-testid="toggle-edit-active"
                    />
                    <label className="form-check-label fw-medium" htmlFor="editIsActiveToggle">
                      Active Account (Enabled)
                    </label>
                  </div>
                </div>

                <div className="modal-footer border-top px-4 py-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setEditingUser(null)}
                    disabled={isUpdating}
                    data-testid="btn-cancel-edit"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn text-white fw-semibold"
                    style={{ backgroundColor: "#006B3C" }}
                    disabled={isUpdating}
                    data-testid="btn-submit-edit"
                  >
                    {isUpdating ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Saving Changes...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Modal 3: Reset Initial Password Modal                             */}
      {/* ----------------------------------------------------------------- */}
      {resetPwdUser && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content shadow-lg border-0" style={{ borderRadius: 8 }}>
              <div className="modal-header border-bottom py-3">
                <h5 className="modal-title fw-bold text-dark fs-5">
                  Reset Initial Password: {resetPwdUser.name}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setResetPwdUser(null)}
                  aria-label="Close"
                  disabled={isResetting}
                />
              </div>

              <form onSubmit={handleResetPasswordSubmit} data-testid="form-reset-password">
                <div className="modal-body p-4">
                  {resetError && (
                    <div
                      className="alert alert-danger py-2 mb-3"
                      style={{ backgroundColor: "#FDF2F2", color: "#B3261E" }}
                      data-testid="reset-error-alert"
                    >
                      {resetError}
                    </div>
                  )}

                  {resetSuccess && (
                    <div
                      className="alert alert-success py-2 mb-3"
                      style={{ backgroundColor: "#EDF7ED", color: "#2E7D32" }}
                      data-testid="reset-success-alert"
                    >
                      {resetSuccess}
                    </div>
                  )}

                  <p className="text-muted small mb-3">
                    Target User: <strong>{resetPwdUser.name}</strong> (<code>{resetPwdUser.email}</code>)
                  </p>

                  <div className="mb-3">
                    <label className="form-label fw-semibold" style={{ fontSize: "0.9rem" }}>
                      New Initial Password <span className="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      placeholder="Enter new temporary password"
                      value={resetPasswordVal}
                      onChange={(e) => setResetPasswordVal(e.target.value)}
                      required
                      data-testid="input-reset-password"
                      style={{ height: 40 }}
                    />

                    <div className="small text-muted mt-2">
                      <div className={resetPassVal.hasLength ? "text-success" : "text-muted"}>
                        {resetPassVal.hasLength ? "✓" : "○"} At least 8 characters
                      </div>
                      <div className={resetPassVal.hasUpper ? "text-success" : "text-muted"}>
                        {resetPassVal.hasUpper ? "✓" : "○"} At least 1 uppercase letter (A-Z)
                      </div>
                      <div className={resetPassVal.hasLower ? "text-success" : "text-muted"}>
                        {resetPassVal.hasLower ? "✓" : "○"} At least 1 lowercase letter (a-z)
                      </div>
                      <div className={resetPassVal.hasDigit ? "text-success" : "text-muted"}>
                        {resetPassVal.hasDigit ? "✓" : "○"} At least 1 numeric digit (0-9)
                      </div>
                      <div className={resetPassVal.hasSymbol ? "text-success" : "text-muted"}>
                        {resetPassVal.hasSymbol ? "✓" : "○"} At least 1 special symbol (!@#$%^&*...)
                      </div>
                    </div>
                  </div>

                  <div
                    className="alert alert-info py-2 px-3 mb-0"
                    style={{ fontSize: "0.85rem", backgroundColor: "#EAF6EF", color: "#006B3C", borderColor: "#C4E5D2" }}
                  >
                    ℹ️ <strong>Notice:</strong> The user's <code>mustChangePassword</code> status will be reset to <code>true</code>. They must update this password upon their next login.
                  </div>
                </div>

                <div className="modal-footer border-top px-4 py-3">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setResetPwdUser(null)}
                    disabled={isResetting}
                    data-testid="btn-cancel-reset"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn text-white fw-semibold"
                    style={{ backgroundColor: "#006B3C" }}
                    disabled={isResetting}
                    data-testid="btn-submit-reset"
                  >
                    {isResetting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" />
                        Resetting Password...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
