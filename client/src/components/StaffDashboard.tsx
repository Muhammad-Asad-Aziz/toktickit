import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  fetchStaffDashboard,
  fetchAdminDashboard,
  StaffDashboardData,
  AdminDashboardData,
  DashboardTicketSummary,
} from "../api.js";

export interface StaffDashboardProps {
  onNavigateToQueue?: (filters?: {
    status?: string;
    owner?: string;
    itPriority?: string;
  }) => void;
  onCreateTicket?: () => void;
  onViewTicket?: (ticketId: number) => void;
  onManageUsers?: () => void;
}

const STATUS_BADGE_CONFIG: Record<
  string,
  { label: string; icon: string; bg: string; color: string; border: string }
> = {
  NEW: { label: "New", icon: "🟢", bg: "#EAF6EF", color: "#006B3C", border: "1px solid #C4E5D2" },
  OPEN: { label: "Open", icon: "🔵", bg: "#E0F2FE", color: "#0369A1", border: "1px solid #BAE6FD" },
  IN_PROGRESS: { label: "In Progress", icon: "🟡", bg: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" },
  WAITING_FOR_REQUESTER: { label: "Awaiting User", icon: "🟣", bg: "#F3E8FF", color: "#6B21A8", border: "1px solid #E9D5FF" },
  RESOLVED: { label: "Resolved", icon: "🟢", bg: "#DCFCE7", color: "#15803D", border: "1px solid #BBF7D0" },
  CLOSED: { label: "Closed", icon: "⚫", bg: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB" },
  REOPENED: { label: "Reopened", icon: "🟠", bg: "#FFEDD5", color: "#C2410C", border: "1px solid #FED7AA" },
  CANCELLED: { label: "Cancelled", icon: "🔴", bg: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA" },
};

const PRIORITY_CONFIG: Record<
  string,
  { label: string; icon: string; bg: string; color: string; border: string }
> = {
  URGENT: { label: "Urgent", icon: "⚠️", bg: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA" },
  HIGH: { label: "High", icon: "⚠️", bg: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" },
  MEDIUM: { label: "Medium", icon: "🔹", bg: "#DBEAFE", color: "#1E40AF", border: "1px solid #BFDBFE" },
  LOW: { label: "Low", icon: "⚪", bg: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB" },
};

function formatRelativeTime(dateString: string): string {
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString();
  } catch {
    return dateString;
  }
}

export default function StaffDashboard({
  onNavigateToQueue,
  onCreateTicket,
  onViewTicket,
  onManageUsers,
}: StaffDashboardProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === "ADMINISTRATOR";

  const [staffData, setStaffData] = useState<StaffDashboardData | null>(null);
  const [adminData, setAdminData] = useState<AdminDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async (refreshOnly = false) => {
    if (refreshOnly) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setErrorMessage(null);

    try {
      if (isAdmin) {
        const res = await fetchAdminDashboard();
        setAdminData(res);
        setStaffData({
          metrics: res.staffMetrics || res.metrics,
          recentlyUpdatedTickets: res.recentlyUpdatedTickets,
        });
      } else {
        const res = await fetchStaffDashboard();
        setStaffData(res);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load staff dashboard. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading && !staffData) {
    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center p-5"
        data-testid="staff-dashboard-loading"
      >
        <div
          className="spinner-border"
          role="status"
          style={{ width: "2.5rem", height: "2.5rem", color: "var(--zen-primary-green)" }}
        >
          <span className="visually-hidden">Loading queue metrics...</span>
        </div>
        <p className="mt-3 text-muted">Aggregating IT service desk metrics...</p>
      </div>
    );
  }

  if (errorMessage && !staffData) {
    return (
      <div className="alert alert-danger my-4 p-4 rounded-3" data-testid="staff-dashboard-error">
        <h4 className="alert-heading fw-bold">Unable to Load Dashboard</h4>
        <p>{errorMessage}</p>
        <button className="btn btn-zen-primary btn-sm mt-2" onClick={() => loadData()}>
          Retry
        </button>
      </div>
    );
  }

  const metrics = staffData?.metrics || {
    newCount: 0,
    openCount: 0,
    inProgressCount: 0,
    waitingForRequesterCount: 0,
    myAssignedCount: 0,
    myOwnedTicketsCount: 0,
    unassignedCount: 0,
    unassignedTicketsCount: 0,
    totalActiveTicketsCount: 0,
    statusCounts: {
      NEW: 0,
      OPEN: 0,
      IN_PROGRESS: 0,
      WAITING_FOR_REQUESTER: 0,
      RESOLVED: 0,
      CLOSED: 0,
      REOPENED: 0,
      CANCELLED: 0,
    },
    priorityCounts: {
      URGENT: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0,
    },
  };

  const criticalCount =
    (metrics.priorityCounts?.URGENT || 0) + (metrics.priorityCounts?.HIGH || 0);

  const recentTickets = staffData?.recentlyUpdatedTickets || [];

  return (
    <div className="staff-dashboard-container" data-testid="staff-dashboard">
      {/* 1. Operational Welcome Header */}
      <div
        className="card border-0 shadow-sm p-4 mb-4"
        style={{
          borderRadius: "var(--zen-border-radius-lg, 10px)",
          backgroundColor: "#FFFFFF",
          borderLeft: "6px solid var(--zen-primary-green, #006B3C)",
        }}
        data-testid="staff-dashboard-banner"
      >
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <div className="d-flex align-items-center gap-2 mb-1">
              <h1 className="h3 fw-bold mb-0" style={{ color: "var(--zen-text-primary, #1C2826)" }}>
                {isAdmin ? "Administrator Dashboard" : "IT Staff Dashboard"}
              </h1>
              <span
                className="badge rounded-pill px-2 py-1"
                style={{
                  backgroundColor: isAdmin ? "#F3E8FF" : "#E0F2FE",
                  color: isAdmin ? "#6B21A8" : "#0369A1",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                }}
                data-testid="staff-role-badge"
              >
                {isAdmin ? "Administrator" : "IT Staff"}
              </span>
            </div>
            <p className="text-muted mb-0 small">
              Real-time queue monitoring, workload assignment, and incident resolution tracking.
            </p>
          </div>

          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm dashboard-refresh-btn d-inline-flex align-items-center gap-1"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              data-testid="refresh-staff-dashboard-btn"
              data-tooltip="Refresh queue metrics"
            >
              {isRefreshing ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                  <span>Refreshing…</span>
                </>
              ) : (
                <>
                  <span aria-hidden="true">↻</span>
                  <span>Refresh</span>
                </>
              )}
            </button>

            {onCreateTicket && (
              <button
                type="button"
                className="btn btn-zen-outline btn-sm px-3"
                onClick={onCreateTicket}
                data-testid="quick-staff-create-ticket-btn"
              >
                + Create Ticket
              </button>
            )}

            {onNavigateToQueue && (
              <button
                type="button"
                className="btn btn-zen-primary btn-sm px-3"
                onClick={() => onNavigateToQueue()}
                data-testid="quick-staff-queue-btn"
              >
                View Staff Queue
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Primary KPI Cards Grid (4 Cards) */}
      <div className="row g-3 mb-4">
        {/* Card 1: Unassigned Tickets */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="dashboard-kpi-card h-100 d-flex flex-column justify-content-between"
            style={{ borderTop: "4px solid #D97706" }}
            data-testid="card-unassigned"
          >
            <div>
              <div className="dashboard-kpi-label mb-1">Unassigned Tickets</div>
              <div className="dashboard-kpi-number" style={{ color: "#D97706" }}>
                {metrics.unassignedCount}
              </div>
              <div className="text-muted small mt-1">Pending assignment to technician</div>
            </div>
            {onNavigateToQueue && (
              <div className="mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="dashboard-drilldown-link"
                  onClick={() => onNavigateToQueue({ owner: "unassigned" })}
                  data-testid="drilldown-unassigned"
                >
                  View Unassigned Queue →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: My Assigned Workload */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="dashboard-kpi-card h-100 d-flex flex-column justify-content-between"
            style={{ borderTop: "4px solid var(--zen-primary-green, #006B3C)" }}
            data-testid="card-my-assigned"
          >
            <div>
              <div className="dashboard-kpi-label mb-1">My Assigned Workload</div>
              <div className="dashboard-kpi-number">
                {metrics.myAssignedCount}
              </div>
              <div className="text-muted small mt-1">Active tickets owned by you</div>
            </div>
            {onNavigateToQueue && (
              <div className="mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="dashboard-drilldown-link"
                  onClick={() => onNavigateToQueue({ owner: "me" })}
                  data-testid="drilldown-my-assigned"
                >
                  View My Assigned →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Total Active Queue */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="dashboard-kpi-card h-100 d-flex flex-column justify-content-between"
            style={{ borderTop: "4px solid #0369A1" }}
            data-testid="card-total-active"
          >
            <div>
              <div className="dashboard-kpi-label mb-1">Total Active Queue</div>
              <div className="dashboard-kpi-number" style={{ color: "#0369A1" }}>
                {metrics.totalActiveTicketsCount}
              </div>
              <div className="text-muted small mt-1">Non-closed desk workload</div>
            </div>
            {onNavigateToQueue && (
              <div className="mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="dashboard-drilldown-link"
                  onClick={() => onNavigateToQueue({ status: "active" })}
                  data-testid="drilldown-active-queue"
                >
                  View Active Queue →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Critical Workload */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="dashboard-kpi-card h-100 d-flex flex-column justify-content-between"
            style={{ borderTop: "4px solid #B3261E" }}
            data-testid="card-critical"
          >
            <div>
              <div className="dashboard-kpi-label mb-1">Critical Workload</div>
              <div className="dashboard-kpi-number" style={{ color: "#B3261E" }}>
                {criticalCount}
              </div>
              <div className="text-muted small mt-1">Active Urgent & High priority incidents</div>
            </div>
            {onNavigateToQueue && (
              <div className="mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="dashboard-drilldown-link"
                  onClick={() => onNavigateToQueue({ itPriority: "URGENT,HIGH" })}
                  data-testid="drilldown-critical"
                >
                  View Critical Incidents →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. Breakdown Section: Status Distribution & Priority Breakdown */}
      <div className="row g-3 mb-4">
        {/* Status Distribution */}
        <div className="col-12 col-lg-7">
          <div
            className="card border-0 shadow-sm h-100 p-4"
            style={{ borderRadius: "var(--zen-border-radius-lg, 10px)", backgroundColor: "#FFFFFF" }}
          >
            <h2 className="h6 fw-bold mb-1" style={{ color: "var(--zen-primary-green)" }}>
              Queue Breakdown by Status
            </h2>
            <p className="text-muted small mb-3">
              Click any status badge to view tickets filtered by that state
            </p>

            <div className="d-flex flex-wrap gap-2">
              {Object.keys(STATUS_BADGE_CONFIG).map((statusKey) => {
                const config = STATUS_BADGE_CONFIG[statusKey];
                const count = metrics.statusCounts?.[statusKey] || 0;
                return (
                  <button
                    key={statusKey}
                    type="button"
                    className="btn dashboard-status-badge-btn d-inline-flex align-items-center gap-1 border"
                    style={{
                      backgroundColor: config.bg,
                      color: config.color,
                      borderColor: config.border.split(" ")[2] || "#D1D5DB",
                    }}
                    onClick={() => onNavigateToQueue && onNavigateToQueue({ status: statusKey })}
                    data-testid={`status-badge-${statusKey}`}
                  >
                    <span aria-hidden="true">{config.icon}</span>
                    <span>{config.label}:</span>
                    <strong className="ms-1">{count}</strong>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Priority Breakdown */}
        <div className="col-12 col-lg-5">
          <div
            className="card border-0 shadow-sm h-100 p-4"
            style={{ borderRadius: "var(--zen-border-radius-lg, 10px)", backgroundColor: "#FFFFFF" }}
          >
            <h2 className="h6 fw-bold mb-1" style={{ color: "var(--zen-primary-green)" }}>
              Workload by IT Priority (Active)
            </h2>
            <p className="text-muted small mb-3">
              Active queue breakdown by technical urgency
            </p>

            <div className="row g-2">
              {["URGENT", "HIGH", "MEDIUM", "LOW"].map((prKey) => {
                const config = PRIORITY_CONFIG[prKey];
                const count = metrics.priorityCounts?.[prKey] || 0;
                return (
                  <div key={prKey} className="col-6">
                    <button
                      type="button"
                      className="btn w-100 text-start p-2 rounded-2 border"
                      style={{
                        backgroundColor: config.bg,
                        color: config.color,
                        borderColor: config.border.split(" ")[2] || "#D1D5DB",
                      }}
                      onClick={() => onNavigateToQueue && onNavigateToQueue({ itPriority: prKey })}
                      data-testid={`priority-tile-${prKey}`}
                    >
                      <div className="d-flex align-items-center justify-content-between">
                        <span className="small fw-semibold">
                          <span className="me-1" aria-hidden="true">{config.icon}</span>
                          {config.label}
                        </span>
                        <span className="fs-5 fw-bold">{count}</span>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Administrator System Statistics Section (Conditional) */}
      {isAdmin && adminData?.adminMetrics && (
        <div
          className="card border-0 shadow-sm mb-4 p-4"
          style={{
            borderRadius: "var(--zen-border-radius-lg, 10px)",
            backgroundColor: "#FAF5FF",
            border: "1px solid #E9D5FF",
          }}
          data-testid="admin-statistics-section"
        >
          <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-3">
            <div>
              <div className="d-flex align-items-center gap-2">
                <span style={{ fontSize: "1.25rem" }} aria-hidden="true">⚙️</span>
                <h2 className="h6 fw-bold mb-0" style={{ color: "#6B21A8" }}>
                  Administrator System Statistics
                </h2>
              </div>
              <p className="text-muted small mb-0">
                Service desk user accounts, role distribution, and system volume
              </p>
            </div>
            {onManageUsers && (
              <button
                type="button"
                className="btn btn-sm text-white"
                style={{ backgroundColor: "#6B21A8" }}
                onClick={onManageUsers}
                data-testid="admin-manage-users-btn"
              >
                Manage Users →
              </button>
            )}
          </div>

          <div className="row g-2 text-center">
            <div className="col-6 col-md-3">
              <div className="bg-white p-2 rounded-2 border">
                <div className="small text-muted">Total Users</div>
                <div className="fw-bold fs-5 text-dark" data-testid="admin-total-users">
                  {adminData.adminMetrics.totalUsers}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="bg-white p-2 rounded-2 border">
                <div className="small text-muted">Active Users</div>
                <div className="fw-bold fs-5 text-success" data-testid="admin-active-users">
                  {adminData.adminMetrics.activeUsers}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="bg-white p-2 rounded-2 border">
                <div className="small text-muted">Inactive Users</div>
                <div className="fw-bold fs-5 text-danger" data-testid="admin-inactive-users">
                  {adminData.adminMetrics.inactiveUsersCount}
                </div>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <div className="bg-white p-2 rounded-2 border">
                <div className="small text-muted">Total Tickets</div>
                <div className="fw-bold fs-5 text-primary" data-testid="admin-total-tickets">
                  {adminData.adminMetrics.totalTicketsCount}
                </div>
              </div>
            </div>
          </div>

          <div className="d-flex flex-wrap gap-2 mt-3 pt-2 border-top">
            <span className="small text-muted align-self-center">Accounts by Role:</span>
            <span className="badge bg-white text-dark border px-2 py-1" data-testid="admin-requesters-count">
              Requesters: <strong>{adminData.adminMetrics.requestersCount}</strong>
            </span>
            <span className="badge bg-white text-dark border px-2 py-1" data-testid="admin-staff-count">
              IT Staff: <strong>{adminData.adminMetrics.staffCount}</strong>
            </span>
            <span className="badge bg-white text-dark border px-2 py-1" data-testid="admin-admins-count">
              Admins: <strong>{adminData.adminMetrics.adminCount}</strong>
            </span>
          </div>
        </div>
      )}

      {/* 5. Recently Updated Active Queue Tickets Table */}
      <div
        className="card border-0 shadow-sm mb-4"
        style={{
          borderRadius: "var(--zen-border-radius-lg, 10px)",
          backgroundColor: "#FFFFFF",
        }}
      >
        <div className="card-body p-4">
          <div className="d-flex flex-wrap align-items-center justify-content-between mb-3 gap-2">
            <div>
              <h2 className="h5 fw-bold mb-0" style={{ color: "var(--zen-primary-green)" }}>
                Recently Updated Active Queue
              </h2>
              <p className="text-muted small mb-0">
                Top 5 active tickets requiring technician attention
              </p>
            </div>
            {onNavigateToQueue && recentTickets.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => onNavigateToQueue()}
                data-testid="view-full-queue-btn"
              >
                View Full Queue →
              </button>
            )}
          </div>

          {recentTickets.length === 0 ? (
            <div
              className="text-center py-5 px-3 rounded-3"
              style={{ backgroundColor: "var(--zen-pale-green, #EAF6EF)" }}
              data-testid="empty-queue-message"
            >
              <div style={{ fontSize: "2.5rem" }} aria-hidden="true">🎉</div>
              <h3 className="h6 fw-bold mt-2" style={{ color: "var(--zen-primary-green)" }}>
                Queue is Clear!
              </h3>
              <p className="text-muted small mb-0" style={{ maxWidth: 450, margin: "0 auto" }}>
                No active tickets pending in the shared queue. Excellent job!
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table align-middle mb-0 table-hover">
                <thead style={{ backgroundColor: "#F9FAFB", fontSize: "0.8125rem" }}>
                  <tr className="text-muted text-uppercase">
                    <th scope="col" style={{ width: "16%" }}>Ticket #</th>
                    <th scope="col">Summary</th>
                    <th scope="col" style={{ width: "14%" }}>Priority</th>
                    <th scope="col" style={{ width: "16%" }}>Status</th>
                    <th scope="col" style={{ width: "18%" }}>Assigned Owner</th>
                    <th scope="col" style={{ width: "14%" }}>Last Updated</th>
                    <th scope="col" className="text-end" style={{ width: "10%" }}>Action</th>
                  </tr>
                </thead>
                <tbody className="border-top-0">
                  {recentTickets.map((ticket: DashboardTicketSummary) => {
                    const statusConfig =
                      STATUS_BADGE_CONFIG[ticket.currentStatus] || {
                        label: ticket.currentStatus,
                        icon: "🔹",
                        bg: "#F3F4F6",
                        color: "#374151",
                        border: "1px solid #E5E7EB",
                      };
                    const priorityConfig =
                      PRIORITY_CONFIG[ticket.itPriority || "MEDIUM"] ||
                      PRIORITY_CONFIG["MEDIUM"];

                    return (
                      <tr
                        key={ticket.id}
                        data-testid={`recent-queue-row-${ticket.id}`}
                        style={{ cursor: onViewTicket ? "pointer" : "default" }}
                        onClick={() => onViewTicket && onViewTicket(ticket.id)}
                      >
                        <td className="fw-semibold text-success">
                          {ticket.ticketNumber}
                        </td>
                        <td>
                          <div className="fw-medium text-truncate" style={{ maxWidth: 320 }}>
                            {ticket.summary}
                          </div>
                        </td>
                        <td>
                          <span
                            className="badge px-2 py-1"
                            style={{
                              backgroundColor: priorityConfig.bg,
                              color: priorityConfig.color,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            <span className="me-1" aria-hidden="true">{priorityConfig.icon}</span>
                            {priorityConfig.label}
                          </span>
                        </td>
                        <td>
                          <span
                            className="badge px-2 py-1"
                            style={{
                              backgroundColor: statusConfig.bg,
                              color: statusConfig.color,
                              border: statusConfig.border,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                            }}
                          >
                            <span className="me-1" aria-hidden="true">{statusConfig.icon}</span>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td>
                          {ticket.owner ? (
                            <span className="fw-medium text-dark small">
                              {ticket.owner.name}
                            </span>
                          ) : (
                            <span className="badge bg-light text-muted border px-2 py-1">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="text-muted small">
                          {formatRelativeTime(ticket.updatedAt)}
                        </td>
                        <td className="text-end" onClick={(e) => e.stopPropagation()}>
                          {onViewTicket && (
                            <button
                              type="button"
                              className="btn btn-outline-success btn-sm py-0 px-2"
                              style={{ fontSize: "0.8125rem" }}
                              onClick={() => onViewTicket(ticket.id)}
                              data-testid={`view-queue-ticket-btn-${ticket.id}`}
                            >
                              Triage
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

