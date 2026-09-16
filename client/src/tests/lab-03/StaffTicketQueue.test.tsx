import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import StaffTicketQueue from "../../components/StaffTicketQueue.js";
import * as api from "../../api.js";
import { StaffTicketSummary, Category } from "../../api.js";

const mockTickets: StaffTicketSummary[] = [
  {
    id: 1,
    ticketNumber: "TKT-2026-00001",
    summary: "Wi-Fi disconnects frequently in CB2 3rd floor",
    categoryName: "Network",
    categoryId: 4,
    requestedPriority: "HIGH",
    itPriority: "URGENT",
    currentStatus: "OPEN",
    requesterName: "Sompong IT",
    requesterId: 1,
    ownerName: "Wichai IT",
    ownerId: 7,
    requesterResolved: false,
    createdAt: "2026-09-03T10:14:00.000Z",
    updatedAt: "2026-09-03T11:00:00.000Z",
  },
  {
    id: 2,
    ticketNumber: "TKT-2026-00002",
    summary: "Projector in CB2301 lamp flickering",
    categoryName: "Hardware",
    categoryId: 2,
    requestedPriority: "MEDIUM",
    itPriority: "MEDIUM",
    currentStatus: "NEW",
    requesterName: "Anong Staff",
    requesterId: 2,
    ownerName: null,
    ownerId: null,
    requesterResolved: false,
    createdAt: "2026-09-03T10:30:00.000Z",
    updatedAt: "2026-09-03T10:30:00.000Z",
  },
];

const mockCategories: Category[] = [
  { id: 1, code: "ACC", name: "Account and Access" },
  { id: 2, code: "HW", name: "Hardware" },
  { id: 3, code: "SW", name: "Software" },
  { id: 4, code: "NET", name: "Network" },
];

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", {
    writable: true,
    configurable: true,
    value: width,
  });
  window.dispatchEvent(new Event("resize"));
}

describe("StaffTicketQueue Component Suite (Issue 13)", () => {
  let mockFetchStaffTickets: any;
  let mockFetchCategories: any;
  const mockOnViewTicket = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
    setViewportWidth(1024);

    mockFetchStaffTickets = vi.spyOn(api, "fetchStaffTickets").mockResolvedValue({
      items: mockTickets,
      totalCount: 2,
      page: 1,
      pageSize: 10,
      totalPages: 1,
    });

    mockFetchCategories = vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
  });

  afterEach(() => {
    setViewportWidth(1024);
  });

  // UI-QUE-01: Table Rendering
  it("UI-QUE-01: renders staff queue table headers, rows, badges, and counter", async () => {
    render(<StaffTicketQueue onViewTicket={mockOnViewTicket} />);

    expect(await screen.findByText("IT Staff Ticket Queue")).toBeInTheDocument();
    expect(await screen.findByText("Account and Access")).toBeInTheDocument();
    expect(screen.getByText(/total tickets:/i)).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /ticket no/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /created/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /summary/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /status/i })).toBeInTheDocument();

    // Verify row items
    expect(screen.getByText("TKT-2026-00001")).toBeInTheDocument();
    expect(screen.getByText("Wi-Fi disconnects frequently in CB2 3rd floor")).toBeInTheDocument();
    expect(screen.getByText("Wichai IT")).toBeInTheDocument();
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThan(0);

    // Verify row click callback
    const row1 = screen.getByTestId("queue-row-1");
    fireEvent.click(row1);
    expect(mockOnViewTicket).toHaveBeenCalledWith(1);
  });

  // UI-QUE-02: Search Filter
  it("UI-QUE-02: updates search query and triggers filtered API request", async () => {
    render(<StaffTicketQueue onViewTicket={mockOnViewTicket} />);
    expect(await screen.findByText("IT Staff Ticket Queue")).toBeInTheDocument();
    expect(await screen.findByText("Account and Access")).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search by ticket number or summary/i);
    fireEvent.change(searchInput, { target: { value: "Wi-Fi" } });

    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ search: "Wi-Fi" }),
        expect.anything()
      );
    });
  });

  // UI-QUE-03: Dropdown Filter Bar
  it("UI-QUE-03: applies status and priority dropdown filters", async () => {
    render(<StaffTicketQueue onViewTicket={mockOnViewTicket} />);
    expect(await screen.findByText("IT Staff Ticket Queue")).toBeInTheDocument();
    expect(await screen.findByText("Account and Access")).toBeInTheDocument();

    const statusSelect = screen.getByLabelText(/filter by status/i);
    fireEvent.change(statusSelect, { target: { value: "OPEN" } });

    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ status: "OPEN" }),
        expect.anything()
      );
    });

    const prioritySelect = screen.getByLabelText(/filter by priority/i);
    fireEvent.change(prioritySelect, { target: { value: "HIGH" } });

    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ itPriority: "HIGH" }),
        expect.anything()
      );
    });
  });

  // UI-QUE-04: Reset Filters
  it("UI-QUE-04: clicking Reset Filters clears inputs and resets page to 1", async () => {
    render(<StaffTicketQueue onViewTicket={mockOnViewTicket} />);
    expect(await screen.findByText("IT Staff Ticket Queue")).toBeInTheDocument();
    expect(await screen.findByText("Account and Access")).toBeInTheDocument();

    const resetBtn = screen.getByRole("button", { name: /reset filters/i });
    fireEvent.click(resetBtn);

    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "",
          status: "",
          category: "",
          itPriority: "",
          owner: "",
          page: 1,
        }),
        expect.anything()
      );
    });
  });

  // UI-QUE-05: Pagination Interaction
  it("UI-QUE-05: changes page and page size via pagination controls", async () => {
    mockFetchStaffTickets.mockResolvedValue({
      items: mockTickets,
      totalCount: 25,
      page: 1,
      pageSize: 10,
      totalPages: 3,
    });

    render(<StaffTicketQueue onViewTicket={mockOnViewTicket} />);
    expect(await screen.findByText("IT Staff Ticket Queue")).toBeInTheDocument();
    expect(await screen.findByText("Account and Access")).toBeInTheDocument();

    const nextBtn = await screen.findByRole("button", { name: /next/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(mockFetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2 }),
        expect.anything()
      );
    });
  });

  // UI-QUE-06: Feedback States
  it("UI-QUE-06: renders no matching tickets found banner when items is empty", async () => {
    mockFetchStaffTickets.mockResolvedValueOnce({
      items: [],
      totalCount: 0,
      page: 1,
      pageSize: 10,
      totalPages: 0,
    });
    render(<StaffTicketQueue onViewTicket={mockOnViewTicket} />);

    expect(await screen.findByText(/no matching tickets found/i)).toBeInTheDocument();
  });

  // UI-QUE-07: Responsive Mobile Cards (< 768px)
  it("UI-QUE-07: renders stacked Zen Green cards on mobile viewport (< 768px)", async () => {
    setViewportWidth(400);
    render(<StaffTicketQueue onViewTicket={mockOnViewTicket} />);

    expect(await screen.findByTestId("mobile-card-container")).toBeInTheDocument();
    expect(await screen.findByText("Account and Access")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeVisible();

    // Verify touch button in mobile card
    const viewButtons = screen.getAllByRole("button", { name: /view ticket details/i });
    expect(viewButtons.length).toBeGreaterThan(0);
    fireEvent.click(viewButtons[0]);
    expect(mockOnViewTicket).toHaveBeenCalledWith(1);
  });
});
