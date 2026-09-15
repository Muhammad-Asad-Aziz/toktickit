import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ChangePasswordView from "../../components/ChangePasswordView.js";
import { AuthProvider } from "../../context/AuthContext.js";
import * as api from "../../api.js";

const mockForcedUser: api.User = {
  id: 6,
  name: "New Requester",
  email: "new.requester@kmutt.ac.th",
  role: "REQUESTER",
  mustChangePassword: true,
  isActive: true,
};

async function renderChangePasswordView(onSuccess = vi.fn()) {
  const view = render(
    <AuthProvider>
      <ChangePasswordView onSuccess={onSuccess} />
    </AuthProvider>
  );
  await waitFor(() => {
    expect(screen.getByTestId("current-password-input")).toBeInTheDocument();
  });
  return { ...view, onSuccess };
}

describe("Issue 12: ChangePasswordView Component Tests (UI-PWD-01)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_current_requester", JSON.stringify(mockForcedUser));
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCurrentUser").mockResolvedValue({ user: mockForcedUser });
  });

  it("UI-PWD-01.1: renders password change heading, inputs, and complexity checklist", async () => {
    await renderChangePasswordView();

    expect(
      screen.getByRole("heading", { name: /change your initial password/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId("current-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("new-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("password-checklist")).toBeInTheDocument();
  });

  it("UI-PWD-01.2: live updates complexity checklist as user types satisfying each criterion", async () => {
    await renderChangePasswordView();

    const newPassInput = screen.getByTestId("new-password-input");

    // Initially all rules unmet
    expect(screen.getByTestId("rule-length")).toHaveTextContent("○");
    expect(screen.getByTestId("rule-uppercase")).toHaveTextContent("○");
    expect(screen.getByTestId("rule-lowercase")).toHaveTextContent("○");
    expect(screen.getByTestId("rule-digit")).toHaveTextContent("○");
    expect(screen.getByTestId("rule-symbol")).toHaveTextContent("○");

    // Type lowercase only
    fireEvent.change(newPassInput, { target: { value: "abcdefgh" } });
    expect(screen.getByTestId("rule-length")).toHaveTextContent("✓");
    expect(screen.getByTestId("rule-lowercase")).toHaveTextContent("✓");
    expect(screen.getByTestId("rule-uppercase")).toHaveTextContent("○");

    // Type uppercase
    fireEvent.change(newPassInput, { target: { value: "Abcdefgh" } });
    expect(screen.getByTestId("rule-uppercase")).toHaveTextContent("✓");

    // Type digit
    fireEvent.change(newPassInput, { target: { value: "Abcdefg1" } });
    expect(screen.getByTestId("rule-digit")).toHaveTextContent("✓");

    // Type symbol
    fireEvent.change(newPassInput, { target: { value: "Abcdef1!" } });
    expect(screen.getByTestId("rule-symbol")).toHaveTextContent("✓");
  });

  it("UI-PWD-01.3: flags inline mismatch error when confirm password does not match new password", async () => {
    await renderChangePasswordView();

    const newPassInput = screen.getByTestId("new-password-input");
    const confirmInput = screen.getByTestId("confirm-password-input");

    fireEvent.change(newPassInput, { target: { value: "SecurePass123!" } });
    fireEvent.change(confirmInput, { target: { value: "MismatchedPass123!" } });
    fireEvent.blur(confirmInput);

    expect(screen.getByTestId("mismatch-feedback")).toHaveTextContent("Passwords do not match.");
    expect(screen.getByTestId("change-password-submit-button")).toBeDisabled();
  });

  it("UI-PWD-01.4: submits valid change password payload and calls onSuccess", async () => {
    vi.spyOn(api, "changePassword").mockResolvedValue({
      message: "Password changed successfully.",
      user: { ...mockForcedUser, mustChangePassword: false },
    });

    const { onSuccess } = await renderChangePasswordView();

    fireEvent.change(screen.getByTestId("current-password-input"), {
      target: { value: "InitialPass123!" },
    });
    fireEvent.change(screen.getByTestId("new-password-input"), {
      target: { value: "FreshSecurePass123!" },
    });
    fireEvent.change(screen.getByTestId("confirm-password-input"), {
      target: { value: "FreshSecurePass123!" },
    });

    const submitBtn = screen.getByTestId("change-password-submit-button");
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.changePassword).toHaveBeenCalledWith({
        currentPassword: "InitialPass123!",
        newPassword: "FreshSecurePass123!",
        confirmPassword: "FreshSecurePass123!",
      });
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
