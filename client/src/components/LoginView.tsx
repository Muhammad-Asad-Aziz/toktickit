import React, { useState } from "react";
import { useAuth } from "../context/AuthContext.js";

interface LoginViewProps {
  onSuccess?: () => void;
}

export default function LoginView({ onSuccess }: LoginViewProps) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Blur Validation Rule (AGENTS.md §4):
  // Fields with invalid formats clear/blank out on blur without premature red error alerts.
  const handleEmailBlur = () => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      // Clear invalid format on blur
      setEmail("");
    } else {
      setEmail(trimmed);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await login({ email: trimmedEmail, password });
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Invalid email or password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center py-5">
      <div
        className="card shadow-sm border-0 w-100"
        style={{
          maxWidth: 440,
          borderRadius: 8,
          backgroundColor: "#FFFFFF",
          border: "1px solid #D1D5DB",
        }}
      >
        <div className="card-body p-4 p-sm-5">
          {/* Brand Header */}
          <div className="text-center mb-4">
            <div className="d-inline-flex align-items-center justify-content-center mb-2">
              <span style={{ fontSize: "2rem" }} role="img" aria-label="TokTickIT Logo">
                🌱
              </span>
            </div>
            <h1
              className="h4 fw-bold mb-1"
              style={{ color: "#1C2826", fontSize: "1.5rem" }}
            >
              Sign in to TokTickIT Desk
            </h1>
            <p className="text-muted small mb-0">
              Enter your KMUTT university credentials to continue
            </p>
          </div>

          {/* Generic Safe Error Alert */}
          {errorMessage && (
            <div
              className="alert alert-danger py-2 px-3 mb-4 rounded-2"
              role="alert"
              data-testid="login-error-alert"
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

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label
                htmlFor="email"
                className="form-label fw-semibold small mb-1"
                style={{ color: "#1C2826" }}
              >
                Email Address <span className="text-danger ms-1">*</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                className="form-control"
                placeholder="name@kmutt.ac.th"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleEmailBlur}
                autoFocus
                disabled={isSubmitting}
                style={{
                  height: 40,
                  borderRadius: 6,
                  borderColor: "#D1D5DB",
                }}
                data-testid="login-email-input"
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="password"
                className="form-label fw-semibold small mb-1"
                style={{ color: "#1C2826" }}
              >
                Password <span className="text-danger ms-1">*</span>
              </label>
              <input
                type="password"
                id="password"
                name="password"
                className="form-control"
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                style={{
                  height: 40,
                  borderRadius: 6,
                  borderColor: "#D1D5DB",
                }}
                data-testid="login-password-input"
              />
            </div>

            <button
              type="submit"
              className="btn w-100 text-white fw-semibold d-flex align-items-center justify-content-center"
              disabled={isSubmitting}
              style={{
                backgroundColor: "#006B3C",
                height: 40,
                borderRadius: 6,
              }}
              data-testid="login-submit-button"
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
