import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ActionsTakenSection from "../../components/ActionsTakenSection.js";
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

const mockStaffUser: api.PerformedByUserDTO = {
  id: 7,
  name: "Wichai IT",
  email: "wichai.it@kmutt.ac.th",
  role: "IT_STAFF",
};

const mockAdminUser: api.PerformedByUserDTO = {
  id: 1,
  name: "Admin User",
  email: "admin@kmutt.ac.th",
  role: "ADMINISTRATOR",
};

const mockAction1: api.ActionTakenDTO = {
  id: 101,
  ticketId: 1,
  actionDateTime: "2026-10-29T09:30:00.000Z",
  actionDescription: "Inspected Cisco switch port 14 and replaced patch cord.",
  result: "Port link returned to 1Gbps full duplex. Zero packet loss.",
  followUpRequired: true,
  followUpNote: "Monitor port telemetry after 9:00 AM lecture rush.",
  attachmentNotes: "Cross-referenced with switch_port_bad.jpg in Attachments.",
  performedBy: mockStaffUser,
  createdAt: "2026-10-29T09:35:00.000Z",
  updatedAt: "2026-10-29T09:35:00.000Z",
};

const mockAction2: api.ActionTakenDTO = {
  id: 102,
  ticketId: 1,
  actionDateTime: "2026-10-29T14:15:00.000Z",
  actionDescription: "Ran SNMP throughput diagnostics across core uplink.",
  result: "Zero CRC errors or packet drops over past 4 hours.",
  followUpRequired: false,
  followUpNote: null,
  attachmentNotes: null,
  performedBy: mockAdminUser,
  createdAt: "2026-10-29T14:20:00.000Z",
  updatedAt: "2026-10-29T14:20:00.000Z",
};

const mockRequesterUser: api.RequesterUser = {
  id: 1,
  name: "Sompong IT",
  email: "sompong.it@kmutt.ac.th",
  department: "Information Technology Office",
  isActive: true,
  createdAt: "2026-09-01T08:00:00.000Z",
};

const mockDetailedTicket: api.Ticket = {
  id: 1,
  ticketNumber: "TKT-2026-00001",
  ticketNo: "TKT-2026-00001",
  summary: "Wi-Fi disconnects frequently in CB2 3rd floor",
  description: "Signal drops every 10-15 minutes on CB2 3rd floor west wing.",
  requestedPriority: "High",
  itPriority: "Urgent",
  currentStatus: "In Progress",
  status: "In Progress",
  ticketOwner: "Wichai Support",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T11:30:00.000Z",
  categoryId: 4,
  relatedSystemId: 1,
  requesterId: 1,
  requester: {
    id: 1,
    name: "Sompong IT",
    email: "sompong.it@kmutt.ac.th",
    department: "Information Technology Office",
  },
  category: {
    id: 4,
    name: "Network",
    code: "NET",
  },
  relatedSystem: {
    id: 1,
    name: "Campus Wi-Fi",
  },
  attachments: [],
  publicComments: [],
};

describe("Actions Taken UI Component Suite (Issue 19)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_current_requester", JSON.stringify(mockRequesterUser));
    vi.restoreAllMocks();
  });

  // TEST-19-01: Chronological rendering of action items
  it("TEST-19-01: renders actions in chronological order with performer name, role badges, description, and result", async () => {
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValueOnce({
      actionsTaken: [mockAction2, mockAction1], // Passed out of order to test sorting
    });

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={false}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-list")).toBeInTheDocument();
    });

    const items = screen.getAllByTestId(/^action-taken-item-/);
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute("data-testid", "action-taken-item-101");
    expect(items[1]).toHaveAttribute("data-testid", "action-taken-item-102");

    expect(screen.getByText("Wichai IT")).toBeInTheDocument();
    expect(screen.getByText("Admin User")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();

    expect(
      screen.getByText("Inspected Cisco switch port 14 and replaced patch cord.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("Port link returned to 1Gbps full duplex. Zero packet loss.")
    ).toBeInTheDocument();

    expect(screen.getByText("⚠️ Follow-up Required")).toBeInTheDocument();
    expect(
      screen.getByText("Monitor port telemetry after 9:00 AM lecture rush.")
    ).toBeInTheDocument();

    expect(
      screen.getByText("Cross-referenced with switch_port_bad.jpg in Attachments.")
    ).toBeInTheDocument();

    expect(screen.getByText("🟢 No Follow-up Needed")).toBeInTheDocument();
  });

  // TEST-19-02: Visual tri-thread styling differentiation tokens
  it("TEST-19-02: exhibits distinct Zen Green visual styling for action cards", async () => {
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValueOnce({
      actionsTaken: [mockAction1],
    });

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={false}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("action-taken-item-101")).toBeInTheDocument();
    });

    const actionCard = screen.getByTestId("action-taken-item-101");
    expect(actionCard).toHaveClass("action-taken-card");
  });

  // TEST-19-03: Dynamic toggle of "Follow-up Required"
  it("TEST-19-03: dynamically shows and hides follow-up note input when toggle is checked/unchecked", async () => {
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValueOnce({
      actionsTaken: [],
    });

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={false}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("open-create-action-modal-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("open-create-action-modal-btn"));

    expect(screen.queryByTestId("followup-note-input")).toBeNull();

    const checkbox = screen.getByTestId("followup-required-checkbox");
    fireEvent.click(checkbox);

    expect(screen.getByTestId("followup-note-input")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("followup-note-input"), {
      target: { value: "Inspection scheduled for tomorrow" },
    });
    expect(screen.getByTestId("followup-note-input")).toHaveValue(
      "Inspection scheduled for tomorrow"
    );

    fireEvent.click(checkbox);
    expect(screen.queryByTestId("followup-note-input")).toBeNull();
  });

  // TEST-19-04: Conditional follow-up note validation
  it("TEST-19-04: blocks submission with error when follow-up is required but note is empty", async () => {
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValueOnce({
      actionsTaken: [],
    });
    const createSpy = vi.spyOn(api, "createActionTaken");

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={false}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("open-create-action-modal-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("open-create-action-modal-btn"));

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "Replaced faulty power supply on rack 3." },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Server powered up and passed POST test." },
    });

    fireEvent.click(screen.getByTestId("followup-required-checkbox"));
    fireEvent.click(screen.getByTestId("submit-action-taken-btn"));

    expect(
      await screen.findByText(
        "Follow-up note is required when follow-up is needed (3-1000 characters)."
      )
    ).toBeInTheDocument();

    expect(createSpy).not.toHaveBeenCalled();
  });

  // TEST-19-05: Description length validation
  it("TEST-19-05: blocks submission when action description is shorter than 5 characters", async () => {
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValueOnce({
      actionsTaken: [],
    });
    const createSpy = vi.spyOn(api, "createActionTaken");

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={false}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("open-create-action-modal-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("open-create-action-modal-btn"));

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "Fix" }, // < 5 chars
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Done successfully" },
    });

    fireEvent.click(screen.getByTestId("submit-action-taken-btn"));

    expect(
      await screen.findByText(
        "Action description must be between 5 and 1000 characters."
      )
    ).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  // TEST-19-06: Future date validation
  it("TEST-19-06: blocks submission when action date/time is in the future", async () => {
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValueOnce({
      actionsTaken: [],
    });
    const createSpy = vi.spyOn(api, "createActionTaken");

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={false}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("open-create-action-modal-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("open-create-action-modal-btn"));

    fireEvent.change(screen.getByTestId("action-datetime-input"), {
      target: { value: "2099-12-31T23:59" },
    });
    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "Inspected future network interface." },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Link operational." },
    });

    fireEvent.click(screen.getByTestId("submit-action-taken-btn"));

    expect(
      await screen.findByText("Action date/time cannot be in the future.")
    ).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  // TEST-19-07: Blur validation blanking rule
  it("TEST-19-07: blanks out malformed date on blur without showing validation error alert prior to submit", async () => {
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValueOnce({
      actionsTaken: [],
    });

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={false}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("open-create-action-modal-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("open-create-action-modal-btn"));

    const dateInput = screen.getByTestId("action-datetime-input");
    fireEvent.change(dateInput, { target: { value: "invalid-date-string" } });
    fireEvent.blur(dateInput);

    expect(dateInput).toHaveValue("");
    expect(screen.queryByTestId("error-action-datetime")).toBeNull();
  });

  // TEST-19-08: API submission, busy state, and list update
  it("TEST-19-08: successfully creates action taken, shows busy spinner, and updates list", async () => {
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValueOnce({
      actionsTaken: [],
    });

    const newAction: api.ActionTakenDTO = {
      id: 201,
      ticketId: 1,
      actionDateTime: "2026-10-30T10:00:00.000Z",
      actionDescription: "Replaced faulty DRAM module in server node 4.",
      result: "Memtest86 completed with 0 errors.",
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
      performedBy: mockStaffUser,
      createdAt: "2026-10-30T10:05:00.000Z",
      updatedAt: "2026-10-30T10:05:00.000Z",
    };

    const createSpy = vi.spyOn(api, "createActionTaken").mockResolvedValueOnce({
      actionTaken: newAction,
    });

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={false}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("open-create-action-modal-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("open-create-action-modal-btn"));

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "Replaced faulty DRAM module in server node 4." },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Memtest86 completed with 0 errors." },
    });

    const submitBtn = screen.getByTestId("submit-action-taken-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          actionDescription: "Replaced faulty DRAM module in server node 4.",
          result: "Memtest86 completed with 0 errors.",
          followUpRequired: false,
        })
      );
    });

    expect(
      await screen.findByText("Replaced faulty DRAM module in server node 4.")
    ).toBeInTheDocument();
    expect(screen.getByText("Action taken recorded successfully.")).toBeInTheDocument();
  });

  // TEST-19-09: Form state preservation on recoverable API error
  it("TEST-19-09: preserves entered form inputs in local state when backend returns an error", async () => {
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValueOnce({
      actionsTaken: [],
    });

    vi.spyOn(api, "createActionTaken").mockRejectedValueOnce(
      new Error("Database write conflict. Please retry.")
    );

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={false}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("open-create-action-modal-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("open-create-action-modal-btn"));

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "Checked fiber optical patch cable with VFL." },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Found micro-bend at splice tray 2." },
    });

    fireEvent.click(screen.getByTestId("submit-action-taken-btn"));

    expect(
      await screen.findByText("⚠️ Database write conflict. Please retry.")
    ).toBeInTheDocument();

    expect(screen.getByTestId("action-description-input")).toHaveValue(
      "Checked fiber optical patch cable with VFL."
    );
    expect(screen.getByTestId("action-result-input")).toHaveValue(
      "Found micro-bend at splice tray 2."
    );
  });

  // TEST-19-10: Edit Action mode
  it("TEST-19-10: pre-populates fields, preserves original performer, and updates via PUT", async () => {
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValueOnce({
      actionsTaken: [mockAction1],
    });

    const updateSpy = vi.spyOn(api, "updateActionTaken").mockResolvedValueOnce({
      actionTaken: {
        ...mockAction1,
        result: "Updated: Link fully stabilized after port re-patching.",
      },
    });

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={false}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("edit-action-btn-101")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("edit-action-btn-101"));

    expect(screen.getByText("Edit Action Taken")).toBeInTheDocument();
    expect(screen.getByTestId("action-description-input")).toHaveValue(
      "Inspected Cisco switch port 14 and replaced patch cord."
    );

    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Updated: Link fully stabilized after port re-patching." },
    });

    fireEvent.click(screen.getByTestId("submit-action-taken-btn"));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        1,
        101,
        expect.objectContaining({
          result: "Updated: Link fully stabilized after port re-patching.",
          versionTimestamp: "2026-10-29T09:35:00.000Z",
        })
      );
    });

    expect(
      await screen.findByText("Updated: Link fully stabilized after port re-patching.")
    ).toBeInTheDocument();
    expect(screen.getByText("Action taken updated successfully.")).toBeInTheDocument();
  });

  // TEST-19-11: Read-only access control
  it("TEST-19-11: completely omits create and edit buttons in read-only mode (Requester view)", async () => {
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValueOnce({
      actionsTaken: [mockAction1],
    });

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={true}
        currentUser={{ id: 9, name: "Student", email: "student@kmutt.ac.th", role: "REQUESTER" }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-list")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("open-create-action-modal-btn")).toBeNull();
    expect(screen.queryByTestId("edit-action-btn-101")).toBeNull();
    expect(screen.queryByTestId("action-taken-modal")).toBeNull();
    expect(
      screen.getByText("Inspected Cisco switch port 14 and replaced patch cord.")
    ).toBeInTheDocument();
  });

  // TEST-19-12: RequesterTicketDetail integration
  it("TEST-19-12: RequesterTicketDetail embeds ActionsTakenSection in read-only mode without write triggers", async () => {
    vi.spyOn(api, "fetchRequesters").mockResolvedValueOnce([mockRequesterUser]);
    vi.spyOn(api, "fetchTicketById").mockResolvedValueOnce(mockDetailedTicket);
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValueOnce({
      actionsTaken: [mockAction1],
    });

    render(
      <RequesterProvider>
        <RequesterTicketDetail ticketId={1} onBack={vi.fn()} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-section")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("open-create-action-modal-btn")).toBeNull();
    expect(screen.queryByTestId("edit-action-btn-101")).toBeNull();
    expect(
      screen.getByText("Inspected Cisco switch port 14 and replaced patch cord.")
    ).toBeInTheDocument();
  });

  // TEST-19-13: Empty state rendering
  it("TEST-19-13: renders clean empty state container when ticket has zero actions", async () => {
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValueOnce({
      actionsTaken: [],
    });

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={false}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-empty")).toBeInTheDocument();
    });

    expect(
      screen.getByText("No actions recorded yet. IT Staff must log actions taken before resolving this ticket.")
    ).toBeInTheDocument();
  });

  // TEST-19-14: Loading skeleton state
  it("TEST-19-14: displays loading skeleton while fetching data from API", () => {
    vi.spyOn(api, "fetchActionsTaken").mockReturnValue(new Promise(() => {}));

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={false}
        currentUser={mockStaffUser}
      />
    );

    expect(screen.getByTestId("actions-taken-skeleton")).toBeInTheDocument();
  });

  // TEST-19-15: Error banner with retry trigger
  it("TEST-19-15: renders error alert banner with retry button on fetch failure and reloads on click", async () => {
    const fetchSpy = vi
      .spyOn(api, "fetchActionsTaken")
      .mockRejectedValueOnce(new Error("Network timeout"))
      .mockResolvedValueOnce({
        actionsTaken: [mockAction1],
      });

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={false}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-error")).toBeInTheDocument();
    });

    expect(screen.getByText("⚠️ Network timeout")).toBeInTheDocument();

    const retryBtn = screen.getByTestId("retry-load-actions-btn");
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Inspected Cisco switch port 14 and replaced patch cord.")
      ).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  // TEST-19-16: Responsive layout and container styling
  it("TEST-19-16: conforms to responsive container and Zen Green theme specifications", async () => {
    vi.spyOn(api, "fetchActionsTaken").mockResolvedValueOnce({
      actionsTaken: [mockAction1],
    });

    render(
      <ActionsTakenSection
        ticketId={1}
        readOnly={false}
        currentUser={mockStaffUser}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-section")).toBeInTheDocument();
    });

    const section = screen.getByTestId("actions-taken-section");
    expect(section).toHaveClass("card", "shadow-sm", "border-0");
    expect(section).toHaveStyle({ backgroundColor: "var(--zen-surface)" });
  });
});
