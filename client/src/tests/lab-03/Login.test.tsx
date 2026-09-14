import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import LoginView from "../../components/LoginView.js";
import { AuthProvider } from "../../context/AuthContext.js";
import * as api from "../../api.js";

async function renderLoginView(onSuccess = vi.fn()) {
  const view = render(
    <AuthProvider>
      <LoginView onSuccess={onSuccess} />
    </AuthProvider>
  );
  await waitFor(() => {
    expect(screen.getByTestId("login-email-input")).toBeInTheDocument();
  });
  return { ...view, onSuccess };
}

describe("Issue 12: LoginView Component Tests (UI-LOG-01)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchCurrentUser").mockRejectedValue(new Error("Unauthenticated"));
  });

  it("UI-LOG-01.1: renders login heading, email, password, and sign-in button", async () => {
    await renderLoginView();

    expect(
      screen.getByRole("heading", { name: /sign in to toktickit desk/i })
    ).toBeInTheDocument();
    expect(screen.getByTestId("login-email-input")).toBeInTheDocument();
    expect(screen.getByTestId("login-password-input")).toBeInTheDocument();
    expect(screen.getByTestId("login-submit-button")).toBeInTheDocument();
  });

  it("UI-LOG-01.2: enforces Blur Validation Rule - invalid email format clears on blur without premature error banner", async () => {
    await renderLoginView();

    const emailInput = screen.getByTestId("login-email-input") as HTMLInputElement;

    // Type invalid format
    fireEvent.change(emailInput, { target: { value: "invalid-email-format" } });
    expect(emailInput.value).toBe("invalid-email-format");

    // Blur field
    fireEvent.blur(emailInput);

    // Assert cleared
    expect(emailInput.value).toBe("");

    // Assert no premature error alert
    expect(screen.queryByTestId("login-error-alert")).toBeNull();
  });

  it("UI-LOG-01.3: normalizes valid email to lowercase and trims on blur", async () => {
    await renderLoginView();

    const emailInput = screen.getByTestId("login-email-input") as HTMLInputElement;

    fireEvent.change(emailInput, { target: { value: "  SOMPONG.IT@KMUTT.AC.TH  " } });
    fireEvent.blur(emailInput);

    expect(emailInput.value).toBe("sompong.it@kmutt.ac.th");
  });

  it("UI-LOG-01.4: displays required field error only upon explicit form submission", async () => {
    await renderLoginView();

    const submitBtn = screen.getByTestId("login-submit-button");
    fireEvent.click(submitBtn);

    expect(screen.getByTestId("login-error-alert")).toHaveTextContent(
      "Please enter both email and password."
    );
  });

  it("UI-LOG-01.5: displays generic safe error banner when API returns 401 unauthenticated", async () => {
    vi.spyOn(api, "loginUser").mockRejectedValue(new Error("Invalid email or password"));

    await renderLoginView();

    fireEvent.change(screen.getByTestId("login-email-input"), {
      target: { value: "sompong.it@kmutt.ac.th" },
    });
    fireEvent.change(screen.getByTestId("login-password-input"), {
      target: { value: "WrongPassword!" },
    });

    fireEvent.click(screen.getByTestId("login-submit-button"));

    await waitFor(() => {
      expect(screen.getByTestId("login-error-alert")).toHaveTextContent(
        "Invalid email or password"
      );
    });
  });

  it("UI-LOG-01.6: shows spinner and disabled state while submitting, then triggers onSuccess", async () => {
    let resolveLogin: (val: any) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    vi.spyOn(api, "loginUser").mockReturnValue(loginPromise as any);

    const { onSuccess } = await renderLoginView();

    fireEvent.change(screen.getByTestId("login-email-input"), {
      target: { value: "sompong.it@kmutt.ac.th" },
    });
    fireEvent.change(screen.getByTestId("login-password-input"), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByTestId("login-submit-button"));

    // Verify busy state
    const submitBtn = screen.getByTestId("login-submit-button");
    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/signing in\.\.\./i)).toBeInTheDocument();

    // Resolve login
    resolveLogin!({
      user: {
        id: 1,
        name: "Sompong IT",
        email: "sompong.it@kmutt.ac.th",
        role: "REQUESTER",
        mustChangePassword: false,
        isActive: true,
      },
      token: "mock-jwt-token",
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });
});
