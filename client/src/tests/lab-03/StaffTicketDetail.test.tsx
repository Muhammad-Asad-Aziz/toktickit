import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import StaffTicketDetail from "../../components/StaffTicketDetail.js";
import RequesterTicketDetail from "../../components/RequesterTicketDetail.js";
import * as api from "../../api.js";
import { RequesterProvider } from "../../context/RequesterContext.js";

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

const mockStaffTicket: api.StaffTicketDetailDTO = {
  id: 1,
  ticketNumber: "TKT-2026-00001",
  requesterId: 1,
  categoryId: 4,
  relatedSystemId: 2,
  summary: "Wi-Fi disconnects frequently in CB2 3rd floor",
  description: "Signal drops every 10-15 minutes on CB2 3rd floor west wing.",
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "OPEN",
  ownerId: null,
  owner: null,
  requesterResolvedAt: null,
  createdAt: "2026-09-03T10:14:00.000Z",
  updatedAt: "2026-09-03T11:00:00.000Z",
  requester: {
    id: 1,
    name: "Sompong IT",
    email: "sompong.it@kmutt.ac.th",
    department: "Information Technology Office",
  },
  category: {
    id: 4,
    name: "Network",
  },
  relatedSystem: {
    id: 2,
    name: "Campus Wi-Fi",
  },
  attachments: [
    {
      id: 101,
      ticketId: 1,
      originalFilename: "wifi_signal_log.txt",
      mimeType: "text/plain",
      fileSize: 2048,
      createdAt: "2026-09-03T10:15:00.000Z",
    },
  ],
  publicComments: [
    {
      id: 201,
      ticketId: 1,
      authorId: 1,
      content: "Initial public comment from requester.",
      createdAt: "2026-09-03T10:20:00.000Z",
      author: {
        id: 1,
        name: "Sompong IT",
        role: "REQUESTER",
      },
    },
  ],
  internalNotes: [
    {
      id: 301,
      ticketId: 1,
      authorId: 7,
      content: "AP-CB2-3W reboot scheduled for 22:00 tonight.",
      createdAt: "2026-09-03T10:30:00.000Z",
      author: {
        id: 7,
        name: "Wichai IT",
        role: "IT_STAFF",
      },
    },
  ],
};

const mockAssignees: api.AssigneeOption[] = [
  { id: 7, name: "Wichai IT", email: "wichai.it@kmutt.ac.th", role: "IT_STAFF" },
  { id: 8, name: "Nareerat IT", email: "nareerat.it@kmutt.ac.th", role: "IT_STAFF" },
];

describe("StaffTicketDetail Component Suite (Issue 14)", () => {
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchStaffTicketDetail").mockResolvedValue(mockStaffTicket);
    vi.spyOn(api, "fetchAssignees").mockResolvedValue(mockAssignees);
  });

  // UI-DET-01: Metadata and Operational Controls Rendering
  it("UI-DET-01: renders ticket metadata, claim shortcut, IT priority, status transition, and attachments", async () => {
    render(<StaffTicketDetail ticketId={1} onBack={mockOnBack} />);

    expect(await screen.findByTestId("staff-ticket-detail-view")).toBeInTheDocument();
    expect(screen.getByTestId("ticket-number")).toHaveTextContent("TKT-2026-00001");
    expect(screen.getByTestId("ticket-summary")).toHaveTextContent("Wi-Fi disconnects frequently in CB2 3rd floor");
    expect(screen.getByTestId("ticket-requester-name")).toHaveTextContent("Sompong IT");
    expect(screen.getByTestId("ticket-category")).toHaveTextContent("Network");
    expect(screen.getByTestId("ticket-system")).toHaveTextContent("Campus Wi-Fi");

    // Operational Controls
    expect(screen.getByTestId("claim-ticket-btn")).toBeInTheDocument();
    expect(screen.getByTestId("assignee-select")).toBeInTheDocument();
    expect(screen.getByTestId("save-assignment-btn")).toBeInTheDocument();
    expect(screen.getByTestId("it-priority-select")).toBeInTheDocument();
    expect(screen.getByTestId("save-priority-btn")).toBeInTheDocument();
    expect(screen.getByTestId("status-transition-select")).toBeInTheDocument();
    expect(screen.getByTestId("transition-status-btn")).toBeInTheDocument();

    // Attachments
    expect(screen.getByText("wifi_signal_log.txt")).toBeInTheDocument();
  });

  // UI-DET-02: High-Contrast Amber Internal Notes Visual Guardrail
  it("UI-DET-02: renders high-contrast amber container, lock icon, and confidentiality warning on Internal Notes", async () => {
    render(<StaffTicketDetail ticketId={1} onBack={mockOnBack} />);

    expect(await screen.findByTestId("internal-notes-section")).toBeInTheDocument();
    const banner = screen.getByTestId("internal-note-confidential-banner");
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveTextContent(/CONFIDENTIAL — INTERNAL IT NOTE/i);
    expect(banner).toHaveTextContent(/Never visible to Requester/i);

    // Verify existing note item
    expect(screen.getByTestId("internal-note-item-301")).toBeInTheDocument();
    expect(screen.getByText("AP-CB2-3W reboot scheduled for 22:00 tonight.")).toBeInTheDocument();
  });

  // UI-DET-03: Submit Public Comment and Internal Note
  it("UI-DET-03: allows posting public comment and confidential internal note with character counter", async () => {
    const postCommentSpy = vi.spyOn(api, "postPublicComment").mockResolvedValue({
      comment: {
        id: 202,
        ticketId: 1,
        authorId: 7,
        content: "New public response from staff",
        createdAt: "2026-09-03T11:00:00.000Z",
        author: { id: 7, name: "Wichai IT", role: "IT_STAFF" },
      },
    });

    const postNoteSpy = vi.spyOn(api, "postInternalNote").mockResolvedValue({
      note: {
        id: 302,
        ticketId: 1,
        authorId: 7,
        content: "New confidential diagnostic note",
        createdAt: "2026-09-03T11:05:00.000Z",
        author: { id: 7, name: "Wichai IT", role: "IT_STAFF" },
      },
    });

    render(<StaffTicketDetail ticketId={1} onBack={mockOnBack} />);
    await screen.findByTestId("staff-ticket-detail-view");

    // 1. Submit Public Comment
    const commentInput = screen.getByTestId("public-comment-input");
    fireEvent.change(commentInput, { target: { value: "New public response from staff" } });
    expect(screen.getByTestId("public-comment-char-counter")).toHaveTextContent("30/2000 characters");

    const submitCommentBtn = screen.getByTestId("submit-public-comment-btn");
    fireEvent.click(submitCommentBtn);

    await waitFor(() => {
      expect(postCommentSpy).toHaveBeenCalledWith(1, "New public response from staff");
      expect(screen.getByText("New public response from staff")).toBeInTheDocument();
    });

    // 2. Submit Internal Note
    const noteInput = screen.getByTestId("internal-note-input");
    fireEvent.change(noteInput, { target: { value: "New confidential diagnostic note" } });
    expect(screen.getByTestId("internal-note-char-counter")).toHaveTextContent("32/2000 characters");

    const submitNoteBtn = screen.getByTestId("submit-internal-note-btn");
    fireEvent.click(submitNoteBtn);

    await waitFor(() => {
      expect(postNoteSpy).toHaveBeenCalledWith(1, "New confidential diagnostic note");
      expect(screen.getByText("New confidential diagnostic note")).toBeInTheDocument();
    });
  });

  // UI-DET-04: Requester View - Problem Appears Resolved & Absence of Internal Notes
  it("UI-DET-04: Requester view displays 'Problem Appears Resolved', confirms resolution, and strictly excludes internal notes", async () => {
    const mockRequesterTicket: api.Ticket = {
      ...mockStaffTicket,
      internalNotes: undefined, // Stripped for requester
    };

    vi.spyOn(api, "fetchTicketById").mockResolvedValue(mockRequesterTicket);
    const resolveSpy = vi.spyOn(api, "indicateProblemResolved").mockResolvedValue({
      message: "Problem resolution recorded.",
      requesterResolvedAt: "2026-09-03T12:00:00.000Z",
    });

    localStorage.setItem(
      "toktickit_current_requester",
      JSON.stringify({ id: 1, name: "Sompong IT", email: "sompong.it@kmutt.ac.th" })
    );

    render(
      <RequesterProvider>
        <RequesterTicketDetail ticketId={1} onBack={mockOnBack} />
      </RequesterProvider>
    );

    expect(await screen.findByTestId("ticket-detail-view")).toBeInTheDocument();

    // 1. Verify Internal Notes & Operational Controls are ABSENT
    expect(screen.queryByTestId("internal-notes-section")).not.toBeInTheDocument();
    expect(screen.queryByTestId("internal-note-confidential-banner")).not.toBeInTheDocument();
    expect(screen.queryByTestId("assignee-select")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-transition-select")).not.toBeInTheDocument();

    // 2. Click 'Problem Appears Resolved' and confirm in modal
    const indicateBtn = screen.getByTestId("indicate-resolved-btn");
    expect(indicateBtn).toBeInTheDocument();
    fireEvent.click(indicateBtn);

    const confirmModal = screen.getByTestId("resolve-confirm-modal");
    expect(confirmModal).toBeInTheDocument();

    const confirmBtn = screen.getByTestId("confirm-resolve-btn");
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(resolveSpy).toHaveBeenCalledWith(1);
      expect(screen.getByTestId("requester-resolved-banner")).toBeInTheDocument();
      expect(screen.getByText(/You indicated this problem appears resolved/i)).toBeInTheDocument();
    });
  });
});
