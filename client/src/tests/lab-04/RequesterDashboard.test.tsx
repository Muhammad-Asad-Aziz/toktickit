import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import RequesterDashboard from "../../components/RequesterDashboard.js";
import * as api from "../../api.js";

// Mock AuthContext
vi.mock("../../context/AuthContext.js", () => ({
  useAuth: () => ({
    user: {
      id: 42,
      name: "Mana Student",
      email: "mana.stu@kmutt.ac.th",
      role: "REQUESTER",
      isActive: true,
    },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockDashboardData: api.RequesterDashboardData = {
  metrics: {
    totalOpen: 3,
    openTicketsCount: 3,
    waitingForRequester: 1,
    waitingForRequesterCount: 1,
    inProgress: 1,
    resolved: 2,
    closed: 5,
    recentlyResolvedCount: 5,
  },
  recentlyUpdatedTickets: [
    {
      id: 101,
      ticketNumber: "TKT-2026-00012",
      summary: "Projector lamp failure in Room 304",
      currentStatus: "WAITING_FOR_REQUESTER",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      createdAt: "2026-10-28T09:00:00.000Z",
      updatedAt: "2026-10-29T10:30:00.000Z",
    },
    {
      id: 102,
      ticketNumber: "TKT-2026-00008",
      summary: "Cannot connect to campus VPN from dorm",
      currentStatus: "IN_PROGRESS",
      requestedPriority: "MEDIUM",
      itPriority: "MEDIUM",
      createdAt: "2026-10-27T14:30:00.000Z",
      updatedAt: "2026-10-28T16:20:00.000Z",
    },
  ],
};

describe("Issue 21: Requester Dashboard Frontend UI Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("UI-DSH-01: Renders personalized banner, 4 KPI metric cards, and recent tickets table (AC-21.1, AC-12)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValueOnce(mockDashboardData);

    render(<RequesterDashboard />);

    // Initial loading indicator
    expect(screen.getByTestId("requester-dashboard-loading")).toBeInTheDocument();

    // Await data load
    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard")).toBeInTheDocument();
    });

    // Welcome banner checks
    expect(screen.getByTestId("requester-welcome-banner")).toHaveTextContent("Welcome back, Mana Student!");

    // 4 KPI Card numbers
    expect(screen.getByTestId("card-my-open")).toHaveTextContent("3");
    expect(screen.getByTestId("card-in-progress")).toHaveTextContent("1");
    expect(screen.getByTestId("card-resolved")).toHaveTextContent("2");
    expect(screen.getByTestId("card-closed")).toHaveTextContent("5");

    // Recent tickets table
    expect(screen.getByTestId("recent-ticket-row-101")).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-00012")).toBeInTheDocument();
    expect(screen.getByText("Projector lamp failure in Room 304")).toBeInTheDocument();
  });

  it("UI-DSH-02: Renders Action Required banner when waitingForRequester > 0, omitted when 0 (AC-21.1)", async () => {
    // 1. With waiting tickets > 0
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValueOnce(mockDashboardData);
    const { unmount } = render(<RequesterDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("action-required-banner")).toBeInTheDocument();
    });
    expect(screen.getByTestId("action-required-banner")).toHaveTextContent("Action Required: IT Staff is awaiting your input on 1 ticket");

    unmount();

    // 2. With waiting tickets === 0
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValueOnce({
      ...mockDashboardData,
      metrics: {
        ...mockDashboardData.metrics,
        waitingForRequester: 0,
        waitingForRequesterCount: 0,
      },
    });
    render(<RequesterDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("action-required-banner")).not.toBeInTheDocument();
  });

  it("UI-DSH-03: Clicking KPI drill-down links triggers onNavigateToMyTickets callback with pre-selected status (AC-21.4, BR-14)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValueOnce(mockDashboardData);
    const onNavigateToMyTickets = vi.fn();
    const onViewTicket = vi.fn();

    render(
      <RequesterDashboard
        onNavigateToMyTickets={onNavigateToMyTickets}
        onViewTicket={onViewTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard")).toBeInTheDocument();
    });

    // 1. Drill-down on My Open
    fireEvent.click(screen.getByTestId("drilldown-my-open"));
    expect(onNavigateToMyTickets).toHaveBeenCalledWith("OPEN");

    // 2. Drill-down on In Progress
    fireEvent.click(screen.getByTestId("drilldown-in-progress"));
    expect(onNavigateToMyTickets).toHaveBeenCalledWith("IN_PROGRESS");

    // 3. Drill-down on Action Required banner
    fireEvent.click(screen.getByTestId("action-required-drilldown"));
    expect(onNavigateToMyTickets).toHaveBeenCalledWith("WAITING_FOR_REQUESTER");

    // 4. Clicking ticket row triggers onViewTicket
    fireEvent.click(screen.getByTestId("recent-ticket-row-101"));
    expect(onViewTicket).toHaveBeenCalledWith(101);
  });

  it("UI-DSH-04: Displays friendly empty state when requester has zero tickets (AC-21.1, AC-15)", async () => {
    vi.spyOn(api, "fetchRequesterDashboard").mockResolvedValueOnce({
      metrics: {
        totalOpen: 0,
        openTicketsCount: 0,
        waitingForRequester: 0,
        waitingForRequesterCount: 0,
        inProgress: 0,
        resolved: 0,
        closed: 0,
        recentlyResolvedCount: 0,
      },
      recentlyUpdatedTickets: [],
    });
    const onCreateTicket = vi.fn();

    render(<RequesterDashboard onCreateTicket={onCreateTicket} />);

    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard")).toBeInTheDocument();
    });

    expect(screen.getByTestId("card-my-open")).toHaveTextContent("0");
    expect(screen.getByTestId("empty-tickets-message")).toBeInTheDocument();
    expect(screen.getByText("No Service Requests Yet")).toBeInTheDocument();
  });

  it("UI-DSH-08: In-place refresh button reloads metrics with active refresh state (AC-21.2, AC-21.5)", async () => {
    const fetchSpy = vi
      .spyOn(api, "fetchRequesterDashboard")
      .mockResolvedValue(mockDashboardData);

    render(<RequesterDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard")).toBeInTheDocument();
    });

    const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
