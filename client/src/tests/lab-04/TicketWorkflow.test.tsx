import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import StaffTicketDetail from "../../components/StaffTicketDetail.js";
import * as api from "../../api.js";

// Mock AuthContext
vi.mock("../../context/AuthContext.js", () => ({
  useAuth: () => ({
    user: {
      id: 7,
      name: "Wichai IT",
      email: "wichai.it@kmutt.ac.th",
      role: "IT_STAFF",
      isActive: true,
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const baseMockTicket: api.StaffTicketDetailDTO = {
  id: 1,
  ticketNumber: "TKT-2026-00001",
  requesterId: 1,
  categoryId: 4,
  relatedSystemId: 2,
  summary: "Wi-Fi disconnects frequently in CB2 3rd floor",
  description: "Signal drops every 10-15 minutes on CB2 3rd floor west wing.",
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  ownerId: 7,
  owner: { id: 7, name: "Wichai IT", email: "wichai.it@kmutt.ac.th" },
  requesterResolvedAt: null,
  createdAt: "2026-09-03T10:14:00.000Z",
  updatedAt: "2026-09-03T11:00:00.000Z",
  requester: {
    id: 1,
    name: "Sompong IT",
    email: "sompong.it@kmutt.ac.th",
    department: "Information Technology Office",
  },
  category: { id: 4, name: "Network" },
  relatedSystem: { id: 2, name: "Campus Wi-Fi" },
  attachments: [],
  publicComments: [],
  internalNotes: [],
};

const mockAssignees: api.AssigneeOption[] = [
  { id: 7, name: "Wichai IT", email: "wichai.it@kmutt.ac.th", role: "IT_STAFF" },
  { id: 8, name: "Nareerat IT", email: "nareerat.it@kmutt.ac.th", role: "IT_STAFF" },
];

describe("Issue 20: Ticket Workflow Controls & Resolution Gate UI Suite", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchAssignees").mockResolvedValue(mockAssignees);
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValue({ actionsTaken: [] });
  });

  // ---------------------------------------------------------------------------
  // UI-WRK-01: Resolution Gate Guidance Alert & Disabled Transition Button
  // ---------------------------------------------------------------------------
  it("UI-WRK-01: displays warning alert and disables transition button when RESOLVED selected on 0-action ticket", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...baseMockTicket,
      currentStatus: "IN_PROGRESS",
    });

    render(<StaffTicketDetail ticketId={1} onBack={mockOnBack} />);

    expect(await screen.findByTestId("staff-ticket-detail-view")).toBeInTheDocument();

    const select = screen.getByTestId("status-transition-select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "RESOLVED" } });

    // Informative guidance alert rendered
    const warning = await screen.findByTestId("resolution-blocked-warning");
    expect(warning).toBeInTheDocument();
    expect(warning).toHaveTextContent(/Resolution Blocked/i);
    expect(warning).toHaveTextContent(/You must log at least one Action Taken before this ticket can be resolved/i);

    // Transition button is disabled
    const submitBtn = screen.getByTestId("transition-status-btn");
    expect(submitBtn).toBeDisabled();
  });

  // ---------------------------------------------------------------------------
  // UI-WRK-02: Dynamic Dropdown Options Filtering
  // ---------------------------------------------------------------------------
  it("UI-WRK-02: renders only permitted next status options matching transition matrix", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...baseMockTicket,
      currentStatus: "NEW",
    });

    render(<StaffTicketDetail ticketId={1} onBack={mockOnBack} />);

    expect(await screen.findByTestId("staff-ticket-detail-view")).toBeInTheDocument();

    const select = screen.getByTestId("status-transition-select") as HTMLSelectElement;
    const optionValues = Array.from(select.options).map((opt) => opt.value);

    // For NEW: allowed are OPEN, IN_PROGRESS, CANCELLED
    expect(optionValues).toEqual(["OPEN", "IN_PROGRESS", "CANCELLED"]);
    expect(optionValues).not.toContain("RESOLVED");
    expect(optionValues).not.toContain("CLOSED");
    expect(optionValues).not.toContain("REOPENED");
  });

  // ---------------------------------------------------------------------------
  // UI-WRK-03: Terminal Status Notice for CLOSED and CANCELLED Tickets
  // ---------------------------------------------------------------------------
  it("UI-WRK-03: renders terminal status notice and conceals transition select for CLOSED ticket", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...baseMockTicket,
      currentStatus: "CLOSED",
    });

    render(<StaffTicketDetail ticketId={1} onBack={mockOnBack} />);

    expect(await screen.findByTestId("staff-ticket-detail-view")).toBeInTheDocument();

    const terminalNotice = screen.getByTestId("terminal-status-notice");
    expect(terminalNotice).toBeInTheDocument();
    expect(terminalNotice).toHaveTextContent(/Terminal status reached \(CLOSED\)\. No further transitions permitted\./i);

    // Select and submit button must be omitted from DOM
    expect(screen.queryByTestId("status-transition-select")).not.toBeInTheDocument();
    expect(screen.queryByTestId("transition-status-btn")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // UI-WRK-04: Non-Destructive 409 Conflict Banner Preserving Draft Inputs
  // ---------------------------------------------------------------------------
  it("UI-WRK-04: displays 409 conflict banner and reloads metadata without clearing draft comments/notes", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...baseMockTicket,
      currentStatus: "OPEN",
    });

    render(<StaffTicketDetail ticketId={1} onBack={mockOnBack} />);

    expect(await screen.findByTestId("staff-ticket-detail-view")).toBeInTheDocument();

    // User types draft comment and draft internal note
    const commentInput = screen.getByTestId("public-comment-input") as HTMLTextAreaElement;
    fireEvent.change(commentInput, { target: { value: "Important customer reply draft" } });
    expect(commentInput.value).toBe("Important customer reply draft");

    const noteInput = screen.getByTestId("internal-note-input") as HTMLTextAreaElement;
    fireEvent.change(noteInput, { target: { value: "Confidential investigation notes draft" } });
    expect(noteInput.value).toBe("Confidential investigation notes draft");

    // Mock transition failure with 409 STALE_RECORD_CONFLICT
    const conflictError: any = new Error("The ticket was modified by another user. Please reload the ticket to view the latest state.");
    conflictError.status = 409;
    conflictError.code = "STALE_RECORD_CONFLICT";
    vi.spyOn(api, "transitionTicketStatus").mockRejectedValue(conflictError);

    // Attempt transition
    const submitBtn = screen.getByTestId("transition-status-btn");
    fireEvent.click(submitBtn);

    // Verify 409 conflict banner is displayed
    const conflictBanner = await screen.findByTestId("concurrency-conflict-banner");
    expect(conflictBanner).toBeInTheDocument();
    expect(conflictBanner).toHaveTextContent(/Update Conflict/i);

    // Verify draft inputs were not erased
    expect(commentInput.value).toBe("Important customer reply draft");
    expect(noteInput.value).toBe("Confidential investigation notes draft");

    // Click Reload Ticket Data button
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...baseMockTicket,
      currentStatus: "IN_PROGRESS",
      updatedAt: "2026-11-01T10:00:00.000Z",
    });

    const reloadBtn = screen.getByTestId("reload-ticket-btn");
    fireEvent.click(reloadBtn);

    // Status updates, banner clears, drafts persist
    await waitFor(() => {
      expect(screen.queryByTestId("concurrency-conflict-banner")).not.toBeInTheDocument();
    });
    expect(commentInput.value).toBe("Important customer reply draft");
    expect(noteInput.value).toBe("Confidential investigation notes draft");
  });

  // ---------------------------------------------------------------------------
  // UI-WRK-05: Cancellation Reason Modal Dialog & Submission
  // ---------------------------------------------------------------------------
  it("UI-WRK-05: enforces cancellation reason modal and submits payload when CANCELLED selected", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...baseMockTicket,
      currentStatus: "OPEN",
    });

    const transitionSpy = vi.spyOn(api, "transitionTicketStatus").mockResolvedValue({
      ticket: {
        id: 1,
        ticketNumber: "TKT-2026-00001",
        currentStatus: "CANCELLED",
        updatedAt: "2026-11-01T11:00:00.000Z",
      },
      currentStatus: "CANCELLED",
      message: "Ticket status updated to CANCELLED.",
    });

    render(<StaffTicketDetail ticketId={1} onBack={mockOnBack} />);

    expect(await screen.findByTestId("staff-ticket-detail-view")).toBeInTheDocument();

    const select = screen.getByTestId("status-transition-select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "CANCELLED" } });

    const submitBtn = screen.getByTestId("transition-status-btn");
    fireEvent.click(submitBtn);

    // Modal opens
    const modal = await screen.findByTestId("cancellation-reason-modal");
    expect(modal).toBeInTheDocument();

    // Confirm button disabled when reason is empty or < 5 characters
    const confirmBtn = screen.getByTestId("confirm-cancellation-btn");
    expect(confirmBtn).toBeDisabled();

    const reasonTextarea = screen.getByTestId("cancellation-reason-textarea");
    fireEvent.change(reasonTextarea, { target: { value: "User duplicated request accidentally." } });
    expect(confirmBtn).not.toBeDisabled();

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(transitionSpy).toHaveBeenCalledWith(1, {
        status: "CANCELLED",
        cancellationReason: "User duplicated request accidentally.",
        versionTimestamp: "2026-09-03T11:00:00.000Z",
      });
    });

    // Modal closes on success
    await waitFor(() => {
      expect(screen.queryByTestId("cancellation-reason-modal")).not.toBeInTheDocument();
    });
  });

  // ---------------------------------------------------------------------------
  // UI-WRK-06: In-Place Status Badge and Select Update
  // ---------------------------------------------------------------------------
  it("UI-WRK-06: updates header status badge and allowed options in-place upon successful transition", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...baseMockTicket,
      currentStatus: "NEW",
    });

    vi.spyOn(api, "transitionTicketStatus").mockResolvedValue({
      ticket: {
        id: 1,
        ticketNumber: "TKT-2026-00001",
        currentStatus: "OPEN",
        updatedAt: "2026-11-01T11:30:00.000Z",
      },
      currentStatus: "OPEN",
      message: "Ticket status updated to OPEN.",
    });

    render(<StaffTicketDetail ticketId={1} onBack={mockOnBack} />);

    expect(await screen.findByTestId("staff-ticket-detail-view")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("NEW");

    const select = screen.getByTestId("status-transition-select") as HTMLSelectElement;
    fireEvent.change(select, { target: { value: "OPEN" } });

    const submitBtn = screen.getByTestId("transition-status-btn");
    fireEvent.click(submitBtn);

    // Status badge updates in-place
    await waitFor(() => {
      expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("OPEN");
    });

    // Options for OPEN now available
    const updatedOptions = Array.from(select.options).map((opt) => opt.value);
    expect(updatedOptions).toEqual(["IN_PROGRESS", "WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]);
  });

  // ---------------------------------------------------------------------------
  // UI-WRK-07: Advisory Requester Resolution Alert
  // ---------------------------------------------------------------------------
  it("UI-WRK-07: renders advisory alert informing staff that requester marked problem resolved", async () => {
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue({
      ...baseMockTicket,
      requesterResolvedAt: "2026-10-31T09:00:00.000Z",
    });

    render(<StaffTicketDetail ticketId={1} onBack={mockOnBack} />);

    expect(await screen.findByTestId("staff-ticket-detail-view")).toBeInTheDocument();

    const advisoryBanner = screen.getByTestId("requester-resolved-indicator");
    expect(advisoryBanner).toBeInTheDocument();
    expect(advisoryBanner).toHaveTextContent(/Requester indicated problem appears resolved/i);
    expect(advisoryBanner).toHaveTextContent(/Verified ready for IT staff resolution/i);
  });
});

