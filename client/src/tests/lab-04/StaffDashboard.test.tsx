import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import StaffDashboard from "../../components/StaffDashboard.js";
import * as api from "../../api.js";

let mockUser = {
  id: 7,
  name: "Wichai Support",
  email: "wichai.sup@kmutt.ac.th",
  role: "IT_STAFF",
  isActive: true,
};

// Mock AuthContext
vi.mock("../../context/AuthContext.js", () => ({
  useAuth: () => ({
    user: mockUser,
    isAuthenticated: true,
    isLoading: false,
  }),
}));

const mockStaffData: api.StaffDashboardData = {
  metrics: {
    newCount: 2,
    openCount: 4,
    inProgressCount: 8,
    waitingForRequesterCount: 4,
    myAssignedCount: 6,
    myOwnedTicketsCount: 6,
    unassignedCount: 4,
    unassignedTicketsCount: 4,
    totalActiveTicketsCount: 18,
    statusCounts: {
      NEW: 2,
      OPEN: 4,
      IN_PROGRESS: 8,
      WAITING_FOR_REQUESTER: 4,
      RESOLVED: 5,
      CLOSED: 22,
      REOPENED: 0,
      CANCELLED: 3,
    },
    priorityCounts: {
      URGENT: 3,
      HIGH: 7,
      MEDIUM: 6,
      LOW: 2,
    },
  },
  recentlyUpdatedTickets: [
    {
      id: 14,
      ticketNumber: "TKT-2026-00014",
      summary: "Building 2 Switch Port Down",
      currentStatus: "IN_PROGRESS",
      itPriority: "URGENT",
      owner: { id: 7, name: "Wichai Support" },
      createdAt: "2026-10-29T08:00:00.000Z",
      updatedAt: "2026-10-29T10:18:00.000Z",
    },
    {
      id: 18,
      ticketNumber: "TKT-2026-00018",
      summary: "Lab 2 Wi-Fi Offline",
      currentStatus: "OPEN",
      itPriority: "HIGH",
      owner: null,
      createdAt: "2026-10-29T09:15:00.000Z",
      updatedAt: "2026-10-29T09:50:00.000Z",
    },
  ],
};

const mockAdminData: api.AdminDashboardData = {
  staffMetrics: mockStaffData.metrics,
  metrics: mockStaffData.metrics,
  adminMetrics: {
    totalUsers: 55,
    activeUsers: 52,
    activeUsersCount: 52,
    inactiveUsersCount: 3,
    requestersCount: 45,
    staffCount: 8,
    adminCount: 2,
    usersByRole: {
      REQUESTER: 45,
      IT_STAFF: 8,
      ADMINISTRATOR: 2,
    },
    totalTicketsCount: 58,
  },
  recentlyUpdatedTickets: mockStaffData.recentlyUpdatedTickets,
};

describe("Issue 21: Staff & Admin Dashboard Frontend UI Suite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 7,
      name: "Wichai Support",
      email: "wichai.sup@kmutt.ac.th",
      role: "IT_STAFF",
      isActive: true,
    };
  });

  it("UI-DSH-05: IT Staff view renders 4 operational KPI cards, status cluster, and priority breakdown (AC-21.2, AC-13)", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValueOnce(mockStaffData);

    render(<StaffDashboard />);

    // Initial loading state
    expect(screen.getByTestId("staff-dashboard-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard")).toBeInTheDocument();
    });

    // Check banner & role badge
    expect(screen.getByTestId("staff-dashboard-banner")).toHaveTextContent("IT Staff Dashboard");
    expect(screen.getByTestId("staff-role-badge")).toHaveTextContent("IT Staff");

    // 4 KPI Card numbers
    expect(screen.getByTestId("card-unassigned")).toHaveTextContent("4");
    expect(screen.getByTestId("card-my-assigned")).toHaveTextContent("6");
    expect(screen.getByTestId("card-total-active")).toHaveTextContent("18");
    // Critical is URGENT (3) + HIGH (7) = 10
    expect(screen.getByTestId("card-critical")).toHaveTextContent("10");

    // 8 Status badges in cluster
    expect(screen.getByTestId("status-badge-NEW")).toHaveTextContent("New:2");
    expect(screen.getByTestId("status-badge-OPEN")).toHaveTextContent("Open:4");
    expect(screen.getByTestId("status-badge-IN_PROGRESS")).toHaveTextContent("In Progress:8");
    expect(screen.getByTestId("status-badge-WAITING_FOR_REQUESTER")).toHaveTextContent("Awaiting User:4");
    expect(screen.getByTestId("status-badge-RESOLVED")).toHaveTextContent("Resolved:5");
    expect(screen.getByTestId("status-badge-CLOSED")).toHaveTextContent("Closed:22");

    // 4 Priority breakdown tiles
    expect(screen.getByTestId("priority-tile-URGENT")).toHaveTextContent("3");
    expect(screen.getByTestId("priority-tile-HIGH")).toHaveTextContent("7");

    // Recent active queue table
    expect(screen.getByTestId("recent-queue-row-14")).toBeInTheDocument();
    expect(screen.getByText("TKT-2026-00014")).toBeInTheDocument();
    expect(screen.getByText("Building 2 Switch Port Down")).toBeInTheDocument();
  });

  it("UI-DSH-06: Clicking operational drill-down links triggers onNavigateToQueue with correct filters (AC-21.4, BR-14)", async () => {
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValueOnce(mockStaffData);
    const onNavigateToQueue = vi.fn();
    const onViewTicket = vi.fn();

    render(
      <StaffDashboard
        onNavigateToQueue={onNavigateToQueue}
        onViewTicket={onViewTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard")).toBeInTheDocument();
    });

    // 1. Drill-down on Unassigned
    fireEvent.click(screen.getByTestId("drilldown-unassigned"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ owner: "unassigned" });

    // 2. Drill-down on My Assigned
    fireEvent.click(screen.getByTestId("drilldown-my-assigned"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ owner: "me" });

    // 3. Drill-down on Critical
    fireEvent.click(screen.getByTestId("drilldown-critical"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ itPriority: "URGENT,HIGH" });

    // 4. Drill-down on Status badge (NEW)
    fireEvent.click(screen.getByTestId("status-badge-NEW"));
    expect(onNavigateToQueue).toHaveBeenCalledWith({ status: "NEW" });

    // 5. Clicking triage button on ticket triggers onViewTicket
    fireEvent.click(screen.getByTestId("view-queue-ticket-btn-14"));
    expect(onViewTicket).toHaveBeenCalledWith(14);
  });

  it("UI-DSH-07: Administrator role renders system user statistics section with counts, omitted for IT_STAFF (AC-21.3, AC-14)", async () => {
    // 1. First test IT_STAFF: admin section is absent
    vi.spyOn(api, "fetchStaffDashboard").mockResolvedValueOnce(mockStaffData);
    const { unmount } = render(<StaffDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard")).toBeInTheDocument();
    });
    expect(screen.queryByTestId("admin-statistics-section")).not.toBeInTheDocument();

    unmount();

    // 2. Switch user to ADMINISTRATOR
    mockUser = {
      id: 1,
      name: "Admin User",
      email: "admin@kmutt.ac.th",
      role: "ADMINISTRATOR",
      isActive: true,
    };
    vi.spyOn(api, "fetchAdminDashboard").mockResolvedValueOnce(mockAdminData);
    const onManageUsers = vi.fn();

    render(<StaffDashboard onManageUsers={onManageUsers} />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard")).toBeInTheDocument();
    });

    // Admin section is rendered
    expect(screen.getByTestId("admin-statistics-section")).toBeInTheDocument();
    expect(screen.getByTestId("admin-total-users")).toHaveTextContent("55");
    expect(screen.getByTestId("admin-active-users")).toHaveTextContent("52");
    expect(screen.getByTestId("admin-inactive-users")).toHaveTextContent("3");
    expect(screen.getByTestId("admin-total-tickets")).toHaveTextContent("58");

    // Manage Users CTA click
    fireEvent.click(screen.getByTestId("admin-manage-users-btn"));
    expect(onManageUsers).toHaveBeenCalledTimes(1);
  });

  it("UI-DSH-08: In-place refresh button triggers data reload with active spinner (AC-21.2, AC-21.5)", async () => {
    const fetchSpy = vi
      .spyOn(api, "fetchStaffDashboard")
      .mockResolvedValue(mockStaffData);

    render(<StaffDashboard />);

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard")).toBeInTheDocument();
    });

    const refreshBtn = screen.getByTestId("refresh-staff-dashboard-btn");
    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});

