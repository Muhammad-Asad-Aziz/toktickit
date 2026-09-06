import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import RequesterTicketDetail from "../../src/components/RequesterTicketDetail.js";
import App from "../../src/App.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";

const mockActiveRequester: api.RequesterUser = {
  id: 1,
  name: "Sompong IT",
  email: "sompong.it@kmutt.ac.th",
  department: "Information Technology Office",
  isActive: true,
  createdAt: "2026-09-01T08:00:00.000Z",
};

const mockDetailedTicket: api.Ticket = {
  id: 101,
  ticketNumber: "TKT-20260901-0001",
  ticketNo: "TKT-20260901-0001",
  summary: "Cannot connect to campus Wi-Fi in building SCL",
  description: "Wi-Fi authentication keeps failing on 3rd floor since morning.\nUser credentials work elsewhere.",
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
  attachments: [
    {
      id: 501,
      ticketId: 101,
      originalFilename: "wifi_error.png",
      mimeType: "image/png",
      fileSize: 1048576, // 1 MB
      isRemoved: false,
      isDeleted: false,
      createdAt: "2026-09-01T10:05:00.000Z",
    },
  ],
};

function renderWithRequester(ui: React.ReactNode, requester = mockActiveRequester) {
  localStorage.setItem("toktickit_current_requester", JSON.stringify(requester));
  return render(<RequesterProvider>{ui}</RequesterProvider>);
}

describe("Feature 9: Requester Ticket Detail Component (STS UI-TD-01 to UI-TD-07)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_current_requester", JSON.stringify(mockActiveRequester));
    vi.restoreAllMocks();
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([mockActiveRequester]);
  });

  it("UI-TD-01: renders ticket header, summary, and description in strictly read-only format", async () => {
    vi.spyOn(api, "fetchTicketById").mockResolvedValue(mockDetailedTicket);

    renderWithRequester(<RequesterTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-number")).toHaveTextContent("TKT-20260901-0001");
    });

    expect(screen.getByTestId("ticket-summary")).toHaveTextContent(mockDetailedTicket.summary);
    expect(screen.getByTestId("ticket-description")).toHaveTextContent(
      "Wi-Fi authentication keeps failing on 3rd floor since morning."
    );

    // Invariant: Header fields on the Ticket Detail screen are strictly read-only.
    // Confirm zero text inputs or textareas exist for ticket editing.
    const inputs = screen.queryAllByRole("textbox");
    expect(inputs.length).toBe(0);

    // Confirm no ticket status transition buttons (e.g. resolve, close) exist
    expect(screen.queryByRole("button", { name: /resolve/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /close ticket/i })).toBeNull();
  });

  it("UI-TD-02: displays full requester information, category, system, priority badges, and owner", async () => {
    vi.spyOn(api, "fetchTicketById").mockResolvedValue(mockDetailedTicket);

    renderWithRequester(<RequesterTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-requester-name")).toHaveTextContent("Sompong IT");
    });

    expect(screen.getByTestId("ticket-category")).toHaveTextContent("Network");
    expect(screen.getByTestId("ticket-system")).toHaveTextContent("Campus Wi-Fi");
    expect(screen.getByTestId("ticket-requested-priority")).toHaveTextContent("High");
    expect(screen.getByTestId("ticket-it-priority")).toHaveTextContent("Urgent");
    expect(screen.getByTestId("ticket-status-badge")).toHaveTextContent("In Progress");
    expect(screen.getByTestId("ticket-owner")).toHaveTextContent("Wichai Support");
  });

  it("UI-TD-03: navigates back to My Tickets list when clicking 'Back to My Tickets'", async () => {
    const user = userEvent.setup();
    const handleBack = vi.fn();
    vi.spyOn(api, "fetchTicketById").mockResolvedValue(mockDetailedTicket);

    renderWithRequester(<RequesterTicketDetail ticketId={101} onBack={handleBack} />);

    await waitFor(() => {
      expect(screen.getByTestId("back-to-tickets-btn")).toBeInTheDocument();
    });

    await user.click(screen.getByTestId("back-to-tickets-btn"));
    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it("UI-TD-04: displays friendly 403 Forbidden alert when API rejects cross-requester inspection", async () => {
    const forbiddenError = new Error("You do not have permission to access this ticket") as Error & {
      status?: number;
      code?: string;
    };
    forbiddenError.status = 403;
    forbiddenError.code = "FORBIDDEN_CROSS_REQUESTER";

    vi.spyOn(api, "fetchTicketById").mockRejectedValue(forbiddenError);

    renderWithRequester(<RequesterTicketDetail ticketId={999} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("forbidden-error-card")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: /Access Forbidden/i })).toBeInTheDocument();
    expect(screen.queryByTestId("ticket-detail-card")).toBeNull();
  });

  it("UI-TD-05: displays friendly 404 Not Found alert when ticket does not exist", async () => {
    const notFoundError = new Error("Ticket not found") as Error & {
      status?: number;
      code?: string;
    };
    notFoundError.status = 404;
    notFoundError.code = "TICKET_NOT_FOUND";

    vi.spyOn(api, "fetchTicketById").mockRejectedValue(notFoundError);

    renderWithRequester(<RequesterTicketDetail ticketId={888} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("not-found-error-card")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: /Ticket Not Found/i })).toBeInTheDocument();
    expect(screen.queryByTestId("ticket-detail-card")).toBeNull();
  });

  it("UI-TD-06: shows loading skeleton shimmer during ticket fetch", async () => {
    let resolvePromise: (value: api.Ticket) => void = () => {};
    const pendingPromise = new Promise<api.Ticket>((resolve) => {
      resolvePromise = resolve;
    });

    vi.spyOn(api, "fetchTicketById").mockReturnValue(pendingPromise);

    renderWithRequester(<RequesterTicketDetail ticketId={101} onBack={vi.fn()} />);

    // Skeleton shimmer elements are present while loading
    const skeletons = document.querySelectorAll(".zen-skeleton");
    expect(skeletons.length).toBeGreaterThan(0);

    // Resolve promise
    resolvePromise(mockDetailedTicket);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-card")).toBeInTheDocument();
    });
  });

  it("UI-TD-07: displays retry banner upon network failure and refetches upon retry click", async () => {
    const user = userEvent.setup();
    const fetchSpy = vi
      .spyOn(api, "fetchTicketById")
      .mockRejectedValueOnce(new Error("Network timeout"))
      .mockResolvedValueOnce(mockDetailedTicket);

    renderWithRequester(<RequesterTicketDetail ticketId={101} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByTestId("network-error-card")).toBeInTheDocument();
    });

    expect(screen.getByText(/Failed to Load Ticket/i)).toBeInTheDocument();

    // Click retry
    await user.click(screen.getByTestId("retry-load-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-card")).toBeInTheDocument();
    });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("UI-TD-E2E: App switches between MyTickets and RequesterTicketDetail seamlessly", async () => {
    const user = userEvent.setup();
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([mockActiveRequester]);
    vi.spyOn(api, "fetchCategories").mockResolvedValue([
      { id: 4, name: "Network", code: "NET", isActive: true },
    ]);
    vi.spyOn(api, "fetchTickets").mockResolvedValue({
      items: [
        {
          id: 101,
          ticketNumber: "TKT-20260901-0001",
          ticketNo: "TKT-20260901-0001",
          summary: "Cannot connect to campus Wi-Fi in building SCL",
          description: "Wi-Fi authentication keeps failing",
          requestedPriority: "High",
          itPriority: "Urgent",
          currentStatus: "In Progress",
          status: "In Progress",
          createdAt: "2026-09-01T10:00:00.000Z",
          updatedAt: "2026-09-01T11:30:00.000Z",
          categoryId: 4,
          relatedSystemId: 1,
          requesterId: 1,
          attachmentCount: 1,
          requester: { id: 1, name: "Sompong IT", email: "sompong.it@kmutt.ac.th" },
          category: { id: 4, name: "Network" },
          relatedSystem: { id: 1, name: "Campus Wi-Fi" },
        },
      ],
      totalCount: 1,
      totalPages: 1,
      currentPage: 1,
      page: 1,
      pageSize: 10,
    });
    vi.spyOn(api, "fetchTicketById").mockResolvedValue(mockDetailedTicket);

    renderWithRequester(<App initialView="my-tickets" />);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-link-101")).toBeInTheDocument();
    });

    // Click on ticket number link
    await user.click(screen.getByTestId("ticket-link-101"));

    // Navigates to detail view
    await waitFor(() => {
      expect(screen.getByTestId("ticket-detail-view")).toBeInTheDocument();
      expect(screen.getByTestId("ticket-number")).toHaveTextContent("TKT-20260901-0001");
    });

    // Click Back to My Tickets
    await user.click(screen.getByTestId("back-to-tickets-btn"));

    // Navigates back to My Tickets
    await waitFor(() => {
      expect(screen.getByTestId("my-tickets-container")).toBeInTheDocument();
    });
  });
});
