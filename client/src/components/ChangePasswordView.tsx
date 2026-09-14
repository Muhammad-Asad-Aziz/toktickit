import React, { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext.js";

interface ChangePasswordViewProps {
  onSuccess?: () => void;
}

export default function ChangePasswordView({ onSuccess }: ChangePasswordViewProps) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmTouched, setConfirmTouched] = useState(false);

  // Live evaluation of the 5 password complexity criteria
  const rules = useMemo(() => {
    return [
      { id: "length", label: "At least 8 characters long", met: newPassword.length >= 8 },
      { id: "uppercase", label: "Contains an uppercase letter (A-Z)", met: /[A-Z]/.test(newPassword) },
      { id: "lowercase", label: "Contains a lowercase letter (a-z)", met: /[a-z]/.test(newPassword) },
      { id: "digit", label: "Contains a numeric digit (0-9)", met: /[0-9]/.test(newPassword) },
      {
        id: "symbol",
        label: "Contains a special symbol (!@#$%^&*...)",
        met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword),
      },
    ];
  }, [newPassword]);

  const allRulesMet = useMemo(() => rules.every((r) => r.met), [rules]);
  const isMismatch = confirmTouched && confirmPassword.length > 0 && newPassword !== confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setConfirmTouched(true);

    if (!currentPassword) {
      setErrorMessage("Please enter your current password.");
      return;
    }

    if (!allRulesMet) {
      setErrorMessage("Please ensure your new password satisfies all complexity requirements.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center py-5">
      <div
        className="card shadow-sm border-0 w-100"
        style={{
          maxWidth: 480,
          borderRadius: 8,
          backgroundColor: "#FFFFFF",
          border: "1px solid #D1D5DB",
        }}
      >
        <div className="card-body p-4 p-sm-5">
          {/* Header */}
          <div className="text-center mb-4">
            <div className="d-inline-flex align-items-center justify-content-center mb-2">
              <span style={{ fontSize: "2rem" }} role="img" aria-label="Security Shield">
                🛡️
              </span>
            </div>
            <h1
              className="h4 fw-bold mb-1"
              style={{ color: "#1C2826", fontSize: "1.5rem" }}
            >
              Change Your Initial Password
            </h1>
            <p className="text-muted small mb-0">
              For your security, you must update your password before accessing the IT Service Desk.
            </p>
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div
              className="alert alert-danger py-2 px-3 mb-4 rounded-2"
              role="alert"
              data-testid="change-password-error"
              style={{
                backgroundColor: "#FDF2F2",
                borderColor: "#FECACA",
                color: "#B3261E",
                fontSize: "14px",
              }}
            >
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Current Password */}
            <div className="mb-3">
              <label
                htmlFor="currentPassword"
                className="form-label fw-semibold small mb-1"
                style={{ color: "#1C2826" }}
              >
                Current Password <span className="text-danger ms-1">*</span>
              </label>
              <input
                type="password"
                id="currentPassword"
                name="currentPassword"
                className="form-control"
                placeholder="Enter current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={isSubmitting}
                style={{ height: 40, borderRadius: 6, borderColor: "#D1D5DB" }}
                data-testid="current-password-input"
              />
            </div>

            {/* New Password */}
            <div className="mb-3">
              <label
                htmlFor="newPassword"
                className="form-label fw-semibold small mb-1"
                style={{ color: "#1C2826" }}
              >
                New Password <span className="text-danger ms-1">*</span>
              </label>
              <input
                type="password"
                id="newPassword"
                name="newPassword"
                className="form-control"
                placeholder="Enter strong new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isSubmitting}
                style={{ height: 40, borderRadius: 6, borderColor: "#D1D5DB" }}
                data-testid="new-password-input"
              />
            </div>

            {/* Interactive Complexity Checklist */}
            <div
              className="p-3 mb-3 rounded-2"
              style={{ backgroundColor: "#F9FAFB", border: "1px solid #E5E7EB" }}
              data-testid="password-checklist"
            >
              <span className="fw-semibold small d-block mb-2 text-secondary">
                Password Requirements:
              </span>
              <ul className="list-unstyled mb-0 small">
                {rules.map((rule) => (
                  <li
                    key={rule.id}
                    className={`d-flex align-items-center mb-1 ${rule.met ? "text-success fw-semibold" : "text-muted"}`}
                    data-testid={`rule-${rule.id}`}
                  >
                    <span className="me-2" style={{ width: 16 }}>
                      {rule.met ? "✓" : "○"}
                    </span>
                    <span>{rule.label}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Confirm New Password */}
            <div className="mb-4">
              <label
                htmlFor="confirmPassword"
                className="form-label fw-semibold small mb-1"
                style={{ color: "#1C2826" }}
              >
                Confirm New Password <span className="text-danger ms-1">*</span>
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                className={`form-control ${isMismatch ? "is-invalid" : ""}`}
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setConfirmTouched(true);
                }}
                onBlur={() => setConfirmTouched(true)}
                disabled={isSubmitting}
                style={{ height: 40, borderRadius: 6, borderColor: isMismatch ? "#B3261E" : "#D1D5DB" }}
                data-testid="confirm-password-input"
              />
              {isMismatch && (
                <div className="invalid-feedback d-block small mt-1" style={{ color: "#B3261E" }} data-testid="mismatch-feedback">
                  Passwords do not match.
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn w-100 text-white fw-semibold d-flex align-items-center justify-content-center"
              disabled={isSubmitting || !allRulesMet || !confirmPassword || isMismatch}
              style={{
                backgroundColor: "#006B3C",
                height: 40,
                borderRadius: 6,
                opacity: !allRulesMet || isMismatch || !confirmPassword ? 0.6 : 1,
              }}
              data-testid="change-password-submit-button"
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  <span>Updating Password...</span>
                </>
              ) : (
                "Update Password & Enter Application"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
