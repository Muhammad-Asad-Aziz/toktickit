import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

const mockRequesters: api.RequesterUser[] = [
  {
    id: 1,
    name: "Sompong IT",
    email: "sompong.it@kmutt.ac.th",
    department: "Information Technology Office",
    isActive: true,
    createdAt: "2026-09-01T08:00:00.000Z",
  },
  {
    id: 2,
    name: "Anong Staff",
    email: "anong.sta@kmutt.ac.th",
    department: "Academic Affairs Office",
    isActive: true,
    createdAt: "2026-09-01T08:00:00.000Z",
  },
  {
    id: 3,
    name: "Kittisak Student",
    email: "kittisak.stu@kmutt.ac.th",
    department: "Computer Engineering Dept",
    isActive: true,
    createdAt: "2026-09-01T08:00:00.000Z",
  },
  {
    id: 4,
    name: "Wichai Faculty",
    email: "wichai.fac@kmutt.ac.th",
    department: "Department of Mathematics",
    isActive: true,
    createdAt: "2026-09-01T08:00:00.000Z",
  },
];

describe("Feature 2: Development Requester Selector & Context Component Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // UI-01: Development disclaimer banner rendering
  it("UI-01: Renders the simulated identity disclaimer banner text accurately", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByText(/Select a Development Requester to test requester-specific ticket behavior/i)
      ).toBeInTheDocument();
    });
  });

  // UI-02: Dropdown renders active options
  it("UI-02: Dropdown renders all active users returned from mocked API", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Sompong IT (sompong.it@kmutt.ac.th)")).toBeInTheDocument();
      expect(screen.getByText("Anong Staff (anong.sta@kmutt.ac.th)")).toBeInTheDocument();
      expect(screen.getByText("Kittisak Student (kittisak.stu@kmutt.ac.th)")).toBeInTheDocument();
      expect(screen.getByText("Wichai Faculty (wichai.fac@kmutt.ac.th)")).toBeInTheDocument();
    });
  });

  // UI-03: Button disabled state
  it("UI-03: 'Continue' button is initially disabled when placeholder is selected", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);

    render(<App />);

    await waitFor(() => {
      const continueBtn = screen.getByRole("button", { name: /continue/i });
      expect(continueBtn).toBeDisabled();
    });
  });

  // UI-04: Context persistence in localStorage
  it("UI-04: Selecting user and clicking Continue persists in localStorage and closes modal", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Choose Requester/i)).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Choose Requester/i);
    fireEvent.change(select, { target: { value: "1" } });

    const continueBtn = screen.getByRole("button", { name: /continue/i });
    expect(continueBtn).toBeEnabled();
    fireEvent.click(continueBtn);

    await waitFor(() => {
      const stored = localStorage.getItem("toktickit_current_requester");
      expect(stored).toContain('"id":1');
      expect(stored).toContain("Sompong IT");
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  // UI-05: AppHeader display
  it("UI-05: AppHeader displays the active requester name when context is populated", async () => {
    localStorage.setItem("toktickit_current_requester", JSON.stringify(mockRequesters[0]));
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);

    render(<App />);

    await waitFor(() => {
      const badge = screen.getByTestId("active-user-badge");
      expect(badge).toHaveTextContent("Sompong IT");
    });
  });

  // UI-06: Modal cancellation leaves active user unchanged
  it("UI-06: Clicking Change Requester followed by Cancel leaves active user unchanged", async () => {
    localStorage.setItem("toktickit_current_requester", JSON.stringify(mockRequesters[0]));
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /change requester/i })).toBeInTheDocument();
    });

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /change requester/i }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    });

    // Cancel modal
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.getByTestId("active-user-badge")).toHaveTextContent("Sompong IT");
      const stored = localStorage.getItem("toktickit_current_requester");
      expect(stored).toContain('"id":1');
    });
  });

  // UI-07: Identity switch updates context and localStorage
  it("UI-07: Identity switch updates active user and localStorage to new selection", async () => {
    localStorage.setItem("toktickit_current_requester", JSON.stringify(mockRequesters[0]));
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /change requester/i })).toBeInTheDocument();
    });

    // Open modal to change
    fireEvent.click(screen.getByRole("button", { name: /change requester/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Choose Requester/i)).toBeInTheDocument();
    });

    // Select user 2 (Anong Staff)
    const select = screen.getByLabelText(/Choose Requester/i);
    fireEvent.change(select, { target: { value: "2" } });

    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByTestId("active-user-badge")).toHaveTextContent("Anong Staff");
      const stored = localStorage.getItem("toktickit_current_requester");
      expect(stored).toContain('"id":2');
      expect(stored).toContain("Anong Staff");
    });
  });

  // UI-08: Bootstrap cache invalidation evicts unknown cached user
  it("UI-08: Bootstrap cache invalidation clears unknown cached user and reopens modal", async () => {
    // Cache nonexistent user
    localStorage.setItem(
      "toktickit_current_requester",
      JSON.stringify({ id: 999, name: "Ghost User", email: "ghost@kmutt.ac.th", isActive: true })
    );
    vi.spyOn(api, "fetchRequesters").mockResolvedValue(mockRequesters);

    render(<App />);

    await waitFor(() => {
      expect(localStorage.getItem("toktickit_current_requester")).toBeNull();
      expect(screen.getByLabelText(/Choose Requester/i)).toBeInTheDocument();
    });
  });

  // UI-09: Error boundary retry re-invokes API fetch
  it("UI-09: Error boundary displays error alert and Retry button that re-invokes API fetch", async () => {
    const fetchSpy = vi
      .spyOn(api, "fetchRequesters")
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce(mockRequesters);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText("Failed to fetch development requesters")).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /retry connection/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(screen.getByText("Sompong IT (sompong.it@kmutt.ac.th)")).toBeInTheDocument();
    });
  });
});
