import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent, act, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";
import MyTickets from "../../src/components/MyTickets.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";

const mockActiveRequester: api.RequesterUser = {
  id: 1,
  name: "Sompong IT",
  email: "sompong.it@kmutt.ac.th",
  department: "Information Technology Office",
  isActive: true,
  createdAt: "2026-09-01T08:00:00.000Z",
};

const mockSecondRequester: api.RequesterUser = {
  id: 2,
  name: "Anong Staff",
  email: "anong.sta@kmutt.ac.th",
  department: "Academic Affairs Office",
  isActive: true,
  createdAt: "2026-09-01T08:00:00.000Z",
};

const mockCategories: api.Category[] = [
  { id: 1, name: "Account and Access", code: "ACC", isActive: true },
  { id: 2, name: "Hardware", code: "HW", isActive: true },
  { id: 3, name: "Software", code: "SW", isActive: true },
  { id: 4, name: "Network", code: "NET", isActive: true },
];

const mockTickets: api.TicketSummaryItem[] = [
  {
    id: 101,
    ticketNumber: "TKT-2026-00001",
    ticketNo: "TKT-2026-00001",
    summary: "Cannot connect to campus Wi-Fi in building SCL",
    description: "Wi-Fi authentication keeps failing on 3rd floor.",
    requestedPriority: "High",
    itPriority: "Medium",
    currentStatus: "New",
    status: "New",
    createdAt: "2026-09-01T10:00:00Z",
    updatedAt: "2026-09-01T10:00:00Z",
    categoryId: 4,
    relatedSystemId: 1,
    requesterId: 1,
    attachmentCount: 2,
    requester: { id: 1, name: "Sompong IT", email: "sompong.it@kmutt.ac.th" },
    category: { id: 4, name: "Network" },
    relatedSystem: { id: 1, name: "Campus Wi-Fi" },
  },
  {
    id: 102,
    ticketNumber: "TKT-2026-00002",
    ticketNo: "TKT-2026-00002",
    summary: "Department shared printer offline",
    description: "Paper jam error code 502.",
    requestedPriority: "Low",
    itPriority: null,
    currentStatus: "Assigned",
    status: "Assigned",
    createdAt: "2026-09-02T10:00:00Z",
    updatedAt: "2026-09-02T10:00:00Z",
    categoryId: 2,
    relatedSystemId: 6,
    requesterId: 1,
    attachmentCount: 0,
    requester: { id: 1, name: "Sompong IT", email: "sompong.it@kmutt.ac.th" },
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 6, name: "Printer" },
  },
];

const mockSuccessResponse: api.TicketListResponse = {
  items: mockTickets,
  totalCount: 2,
  totalPages: 1,
  currentPage: 1,
  page: 1,
  pageSize: 10,
};

function renderWithRequester(ui: React.ReactNode, requester = mockActiveRequester) {
  localStorage.setItem("toktickit_current_requester", JSON.stringify(requester));
  return render(<RequesterProvider>{ui}</RequesterProvider>);
}

describe("Feature 8 / Feature 4: My Tickets Component Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_current_requester", JSON.stringify(mockActiveRequester));
    vi.restoreAllMocks();

    vi.spyOn(api, "fetchRequesters").mockResolvedValue([mockActiveRequester, mockSecondRequester]);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "fetchTickets").mockResolvedValue(mockSuccessResponse);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // UI-MYT-01: Desktop Table Rendering & Badges
  it("UI-MYT-01: Renders desktop table with all columns and formatted status/priority badges", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTickets").mockResolvedValue(mockSuccessResponse);
    renderWithRequester(<MyTickets />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole("table")).toBeInTheDocument();
    });

    const table = screen.getByRole("table");

    // Column headers
    expect(within(table).getByRole("columnheader", { name: /Ticket No/i })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /Created Date/i })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /Summary/i })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /Category/i })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /Requested Priority/i })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /IT Priority/i })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: /Status/i })).toBeInTheDocument();

    // Ticket numbers
    expect(within(table).getByText("TKT-2026-00001")).toBeInTheDocument();
    expect(within(table).getByText("TKT-2026-00002")).toBeInTheDocument();

    // Summaries and categories
    expect(within(table).getByText(/Cannot connect to campus Wi-Fi/i)).toBeInTheDocument();
    expect(within(table).getByText("Network")).toBeInTheDocument();
    expect(within(table).getByText("Hardware")).toBeInTheDocument();

    // Priority badges
    expect(within(table).getByText("High")).toHaveClass("badge-priority");
    expect(within(table).getByText("Low")).toHaveClass("badge-priority");

    // Status badges
    expect(within(table).getByText("New")).toHaveClass("badge-status");
    expect(within(table).getByText("Assigned")).toHaveClass("badge-status");

    // Attachment count badge
    expect(within(table).getByText("📎 2")).toBeInTheDocument();
  });

  // UI-MYT-02: Client-Side Search Debouncing
  it("UI-MYT-02: Debounces search input and triggers API fetch after 350ms delay", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTickets").mockResolvedValue(mockSuccessResponse);
    renderWithRequester(<MyTickets />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByTestId("filter-search-input");
    fireEvent.change(searchInput, { target: { value: "printer" } });

    // Immediately after typing, fetchTickets should not yet be called with search="printer"
    const callsWithPrinter = fetchSpy.mock.calls.filter((c) => c[1]?.search === "printer");
    expect(callsWithPrinter.length).toBe(0);

    // Wait for the 350ms debounce timeout
    await waitFor(
      () => {
        const debouncedCalls = fetchSpy.mock.calls.filter((c) => c[1]?.search === "printer");
        expect(debouncedCalls.length).toBe(1);
      },
      { timeout: 1000 }
    );
  });

  // UI-MYT-03: Instant Search on Enter Key
  it("UI-MYT-03: Triggers search query immediately on Enter key press without waiting for debounce", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTickets").mockResolvedValue(mockSuccessResponse);
    renderWithRequester(<MyTickets />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    const searchInput = screen.getByTestId("filter-search-input");
    fireEvent.change(searchInput, { target: { value: "laptop" } });
    fireEvent.keyDown(searchInput, { key: "Enter", code: "Enter" });

    // Should immediately fire fetchTickets with search="laptop"
    await waitFor(() => {
      const enterCalls = fetchSpy.mock.calls.filter((c) => c[1]?.search === "laptop");
      expect(enterCalls.length).toBe(1);
    });
  });

  // UI-MYT-04: Filter Bar Selection Updates
  it("UI-MYT-04: Updates filters for category, requestedPriority, itPriority, and status", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTickets").mockResolvedValue(mockSuccessResponse);
    renderWithRequester(<MyTickets />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    // Change category to 2 (Hardware)
    const categorySelect = screen.getByTestId("filter-category-select");
    fireEvent.change(categorySelect, { target: { value: "2" } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenLastCalledWith(1, expect.objectContaining({ category: "2" }), expect.anything());
    });

    // Change requested priority to High
    const reqPrioritySelect = screen.getByTestId("filter-requested-priority-select");
    fireEvent.change(reqPrioritySelect, { target: { value: "High" } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenLastCalledWith(
        1,
        expect.objectContaining({ category: "2", requestedPriority: "High" }),
        expect.anything()
      );
    });

    // Change IT priority to UNASSIGNED
    const itPrioritySelect = screen.getByTestId("filter-it-priority-select");
    fireEvent.change(itPrioritySelect, { target: { value: "UNASSIGNED" } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenLastCalledWith(
        1,
        expect.objectContaining({ itPriority: "UNASSIGNED" }),
        expect.anything()
      );
    });
  });

  // UI-MYT-05: Clear Filters Reset Action
  it("UI-MYT-05: Resets search input, dropdowns, and pagination when Clear Filters is clicked", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTickets").mockResolvedValue(mockSuccessResponse);
    renderWithRequester(<MyTickets />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    // Apply category filter
    const categorySelect = screen.getByTestId("filter-category-select");
    fireEvent.change(categorySelect, { target: { value: "4" } });

    await waitFor(() => {
      expect(screen.getByTestId("clear-filters-btn")).toBeInTheDocument();
    });

    // Click Clear Filters
    fireEvent.click(screen.getByTestId("clear-filters-btn"));

    await waitFor(() => {
      expect((categorySelect as HTMLSelectElement).value).toBe("");
      expect(fetchSpy).toHaveBeenLastCalledWith(
        1,
        expect.objectContaining({ category: undefined, search: undefined, page: 1 }),
        expect.anything()
      );
    });
  });

  // UI-MYT-06: Column Header Sort Toggling
  it("UI-MYT-06: Toggles sort column and ascending/descending order on header clicks", async () => {
    const fetchSpy = vi.spyOn(api, "fetchTickets").mockResolvedValue(mockSuccessResponse);
    renderWithRequester(<MyTickets />);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1);
    });

    // Click "Created Date" header to toggle order
    const createdDateHeader = await screen.findByRole("columnheader", { name: /Created Date/i });
    fireEvent.click(createdDateHeader);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenLastCalledWith(
        1,
        expect.objectContaining({ sortBy: "createdAt", sortOrder: "asc" }),
        expect.anything()
      );
    });

    // Click again to toggle to desc
    fireEvent.click(createdDateHeader);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenLastCalledWith(
        1,
        expect.objectContaining({ sortBy: "createdAt", sortOrder: "desc" }),
        expect.anything()
      );
    });
  });

  // UI-MYT-07: Pagination Navigation & Page Size
  it("UI-MYT-07: Navigates next/previous pages and modifies page size selector", async () => {
    const multiPageResponse: api.TicketListResponse = {
      items: mockTickets,
      totalCount: 25,
      totalPages: 3,
      currentPage: 1,
      page: 1,
      pageSize: 10,
    };

    const fetchSpy = vi.spyOn(api, "fetchTickets").mockResolvedValue(multiPageResponse);
    renderWithRequester(<MyTickets />);

    await waitFor(() => {
      expect(screen.getByTestId("pagination-controls")).toBeInTheDocument();
      expect(screen.getByText(/Showing 1 to 10 of 25 tickets/i)).toBeInTheDocument();
    });

    // Click Next page button
    const nextBtn = screen.getByTestId("next-page-btn");
    expect(nextBtn).not.toBeDisabled();
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenLastCalledWith(
        1,
        expect.objectContaining({ page: 2, pageSize: 10 }),
        expect.anything()
      );
    });

    // Change page size to 25
    const pageSizeSelect = screen.getByTestId("page-size-select");
    fireEvent.change(pageSizeSelect, { target: { value: "25" } });

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenLastCalledWith(
        1,
        expect.objectContaining({ page: 1, pageSize: 25 }),
        expect.anything()
      );
    });
  });

  // UI-MYT-08: Zero-Ticket Empty State Rendering
  it("UI-MYT-08: Renders empty state with Create First Ticket CTA when user has zero tickets", async () => {
    const emptyResponse: api.TicketListResponse = {
      items: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: 1,
      page: 1,
      pageSize: 10,
    };

    vi.spyOn(api, "fetchTickets").mockResolvedValue(emptyResponse);
    renderWithRequester(<MyTickets />);

    await waitFor(() => {
      expect(screen.getByTestId("empty-state")).toBeInTheDocument();
      expect(screen.getByText(/No tickets submitted yet/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Create Your First Ticket/i })).toBeInTheDocument();
    });
  });

  // UI-MYT-09: Filtered No-Results State Rendering
  it("UI-MYT-09: Renders no-results state with Clear Filters button when search matches 0 tickets", async () => {
    const noResultsResponse: api.TicketListResponse = {
      items: [],
      totalCount: 0,
      totalPages: 0,
      currentPage: 1,
      page: 1,
      pageSize: 10,
    };

    const fetchSpy = vi.spyOn(api, "fetchTickets").mockResolvedValue(noResultsResponse);
    renderWithRequester(<MyTickets />);

    // Type non-matching search term
    const searchInput = screen.getByTestId("filter-search-input");
    fireEvent.change(searchInput, { target: { value: "nonexistent" } });
    fireEvent.keyDown(searchInput, { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByTestId("no-results-state")).toBeInTheDocument();
      expect(screen.getByText(/No matching tickets found/i)).toBeInTheDocument();
    });
  });

  // UI-MYT-10: Instant Requester Context Switching
  it("UI-MYT-10: Clears stale tickets immediately and re-fetches when active requester changes", async () => {
    const mockRequester2Tickets: api.TicketSummaryItem[] = [
      {
        id: 201,
        ticketNumber: "TKT-2026-00004",
        ticketNo: "TKT-2026-00004",
        summary: "Requester 2 ticket Wi-Fi issue",
        description: "Belongs to Requester 2 only.",
        requestedPriority: "High",
        itPriority: "High",
        currentStatus: "New",
        status: "New",
        createdAt: "2026-09-04T10:00:00Z",
        updatedAt: "2026-09-04T10:00:00Z",
        categoryId: 4,
        relatedSystemId: 1,
        requesterId: 2,
        attachmentCount: 0,
        requester: { id: 2, name: "Anong Staff", email: "anong.sta@kmutt.ac.th" },
        category: { id: 4, name: "Network" },
        relatedSystem: { id: 1, name: "Campus Wi-Fi" },
      },
    ];

    const fetchSpy = vi.spyOn(api, "fetchTickets").mockImplementation(async (reqId) => {
      if (reqId === 1) return mockSuccessResponse;
      return {
        items: mockRequester2Tickets,
        totalCount: 1,
        totalPages: 1,
        currentPage: 1,
        page: 1,
        pageSize: 10,
      };
    });

    render(<App initialView="my-tickets" />);

    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-00001")[0]).toBeInTheDocument();
    });

    // Switch requester from Sompong (1) to Anong (2)
    fireEvent.click(screen.getByRole("button", { name: /Change Requester/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Choose Requester/i)).toBeInTheDocument();
    });

    const select = screen.getByLabelText(/Choose Requester/i);
    fireEvent.change(select, { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Assert that fetchTickets was called with requester 2 and requester 2's tickets appear
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenLastCalledWith(2, expect.anything(), expect.anything());
      expect(screen.getAllByText("TKT-2026-00004")[0]).toBeInTheDocument();
      expect(screen.queryByText("TKT-2026-00001")).not.toBeInTheDocument();
    });
  });

  // UI-MYT-11: Mobile Card Presentation
  it("UI-MYT-11: Renders responsive mobile stacked cards with ticket summary and priority metadata", async () => {
    renderWithRequester(<MyTickets />);

    await waitFor(() => {
      expect(screen.getByTestId("ticket-card-101")).toBeInTheDocument();
      expect(screen.getByTestId("ticket-card-102")).toBeInTheDocument();
    });

    const card = screen.getByTestId("ticket-card-101");
    expect(card).toHaveClass("my-tickets-mobile-card");
    expect(card).toHaveTextContent("TKT-2026-00001");
    expect(card).toHaveTextContent("Cannot connect to campus Wi-Fi");
    expect(card).toHaveTextContent("Network");
    expect(card).toHaveTextContent("High");
  });

  // UI-MYT-12: API Error Boundary & Network Retry
  it("UI-MYT-12: Displays connection error banner and recovers on Retry Connection click", async () => {
    const fetchSpy = vi
      .spyOn(api, "fetchTickets")
      .mockRejectedValueOnce(new Error("Unable to connect to server"))
      .mockResolvedValueOnce(mockSuccessResponse);

    renderWithRequester(<MyTickets />);

    await waitFor(() => {
      expect(screen.getByText(/Unable to connect to server/i)).toBeInTheDocument();
      expect(screen.getByTestId("error-retry-btn")).toBeInTheDocument();
    });

    // Click Retry Connection
    fireEvent.click(screen.getByTestId("error-retry-btn"));

    await waitFor(() => {
      expect(screen.queryByText(/Unable to connect to server/i)).not.toBeInTheDocument();
      expect(screen.getAllByText("TKT-2026-00001")[0]).toBeInTheDocument();
    });
  });
});
