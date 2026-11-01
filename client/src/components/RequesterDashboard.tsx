import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  fetchRequesterDashboard,
  RequesterDashboardData,
  DashboardTicketSummary,
} from "../api.js";

export interface RequesterDashboardProps {
  onNavigateToMyTickets?: (initialStatusFilter?: string) => void;
  onCreateTicket?: () => void;
  onViewTicket?: (ticketId: number) => void;
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

const PRIORITY_BADGE_CONFIG: Record<
  string,
  { label: string; icon: string; bg: string; color: string }
> = {
  URGENT: { label: "Urgent", icon: "⚠️", bg: "#FEE2E2", color: "#991B1B" },
  HIGH: { label: "High", icon: "⚠️", bg: "#FEF3C7", color: "#92400E" },
  MEDIUM: { label: "Medium", icon: "🔹", bg: "#DBEAFE", color: "#1E40AF" },
  LOW: { label: "Low", icon: "⚪", bg: "#F3F4F6", color: "#374151" },
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

export default function RequesterDashboard({
  onNavigateToMyTickets,
  onCreateTicket,
  onViewTicket,
}: RequesterDashboardProps) {
  const { user } = useAuth();
  const [data, setData] = useState<RequesterDashboardData | null>(null);
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
      const result = await fetchRequesterDashboard();
      setData(result);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to load dashboard metrics. Please try again.");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading && !data) {
    return (
      <div
        className="d-flex flex-column align-items-center justify-content-center p-5"
        data-testid="requester-dashboard-loading"
      >
        <div
          className="spinner-border"
          role="status"
          style={{ width: "2.5rem", height: "2.5rem", color: "var(--zen-primary-green)" }}
        >
          <span className="visually-hidden">Loading dashboard...</span>
        </div>
        <p className="mt-3 text-muted">Loading your service requests...</p>
      </div>
    );
  }

  if (errorMessage && !data) {
    return (
      <div className="alert alert-danger my-4 p-4 rounded-3" data-testid="requester-dashboard-error">
        <h4 className="alert-heading fw-bold">Unable to Load Dashboard</h4>
        <p>{errorMessage}</p>
        <button className="btn btn-zen-primary btn-sm mt-2" onClick={() => loadData()}>
          Retry
        </button>
      </div>
    );
  }

  const metrics = data?.metrics || {
    totalOpen: 0,
    openTicketsCount: 0,
    waitingForRequester: 0,
    waitingForRequesterCount: 0,
    inProgress: 0,
    resolved: 0,
    closed: 0,
    recentlyResolvedCount: 0,
  };
  const recentTickets = data?.recentlyUpdatedTickets || [];
  const totalTickets =
    metrics.totalOpen + metrics.resolved + metrics.closed;

  return (
    <div className="requester-dashboard-container" data-testid="requester-dashboard">
      {/* 1. Welcome Header Banner */}
      <div
        className="card border-0 shadow-sm p-4 mb-4"
        style={{
          borderRadius: "var(--zen-border-radius-lg, 10px)",
          backgroundColor: "#FFFFFF",
          borderLeft: "6px solid var(--zen-primary-green, #006B3C)",
        }}
        data-testid="requester-welcome-banner"
      >
        <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <h1 className="h3 fw-bold mb-1" style={{ color: "var(--zen-text-primary, #1C2826)" }}>
              Welcome back, {user?.name || "Requester"}!
            </h1>
            <p className="text-muted mb-0 small">
              Track and manage your IT service requests, respond to technician questions, and check resolution updates.
            </p>
          </div>
          <div className="d-flex flex-wrap align-items-center gap-2">
            <button
              type="button"
              className="btn btn-outline-secondary btn-sm dashboard-refresh-btn d-inline-flex align-items-center gap-1"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              data-testid="refresh-dashboard-btn"
              data-tooltip="Refresh metrics"
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
                className="btn btn-zen-primary btn-sm px-3"
                onClick={onCreateTicket}
                data-testid="quick-create-ticket-btn"
              >
                + Create Ticket
              </button>
            )}

            {onNavigateToMyTickets && (
              <button
                type="button"
                className="btn btn-zen-outline btn-sm px-3"
                onClick={() => onNavigateToMyTickets()}
                data-testid="quick-my-tickets-btn"
              >
                View My Tickets
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Action Required Alert Banner */}
      {metrics.waitingForRequester > 0 && (
        <div
          className="alert mb-4 p-3 d-flex flex-wrap align-items-center justify-content-between gap-2 rounded-3 shadow-sm"
          style={{
            backgroundColor: "var(--zen-warning-bg, #FFFBEB)",
            border: "1px solid var(--zen-warning-border, #F59E0B)",
            color: "#92400E",
          }}
          data-testid="action-required-banner"
          role="alert"
        >
          <div className="d-flex align-items-center gap-2">
            <span style={{ fontSize: "1.25rem" }} aria-hidden="true">⚠️</span>
            <div>
              <strong>Action Required: </strong>
              IT Staff is awaiting your input on{" "}
              <strong>
                {metrics.waitingForRequester} ticket{metrics.waitingForRequester > 1 ? "s" : ""}
              </strong>
              .
            </div>
          </div>
          {onNavigateToMyTickets && (
            <button
              type="button"
              className="btn btn-sm fw-semibold"
              style={{
                backgroundColor: "#F59E0B",
                color: "#FFFFFF",
                border: "none",
              }}
              onClick={() => onNavigateToMyTickets("WAITING_FOR_REQUESTER")}
              data-testid="action-required-drilldown"
            >
              Review Questions →
            </button>
          )}
        </div>
      )}

      {/* 3. Operational Metric Cards Grid */}
      <div className="row g-3 mb-4">
        {/* Card 1: My Open Tickets */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="dashboard-kpi-card h-100 d-flex flex-column justify-content-between"
            style={{ borderTop: "4px solid var(--zen-primary-green, #006B3C)" }}
            data-testid="card-my-open"
          >
            <div>
              <div className="dashboard-kpi-label mb-1">My Open Tickets</div>
              <div className="dashboard-kpi-number">{metrics.totalOpen}</div>
              <div className="text-muted small mt-1">Pending investigation & active work</div>
            </div>
            {onNavigateToMyTickets && (
              <div className="mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="dashboard-drilldown-link"
                  onClick={() => onNavigateToMyTickets("OPEN")}
                  data-testid="drilldown-my-open"
                >
                  View Open Tickets →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: In Progress */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="dashboard-kpi-card h-100 d-flex flex-column justify-content-between"
            style={{ borderTop: "4px solid #D97706" }}
            data-testid="card-in-progress"
          >
            <div>
              <div className="dashboard-kpi-label mb-1">In Progress</div>
              <div className="dashboard-kpi-number" style={{ color: "#D97706" }}>
                {metrics.inProgress}
              </div>
              <div className="text-muted small mt-1">Currently being worked on by staff</div>
            </div>
            {onNavigateToMyTickets && (
              <div className="mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="dashboard-drilldown-link"
                  onClick={() => onNavigateToMyTickets("IN_PROGRESS")}
                  data-testid="drilldown-in-progress"
                >
                  View In Progress →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 3: Resolved */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="dashboard-kpi-card h-100 d-flex flex-column justify-content-between"
            style={{ borderTop: "4px solid #2E7D32" }}
            data-testid="card-resolved"
          >
            <div>
              <div className="dashboard-kpi-label mb-1">Resolved</div>
              <div className="dashboard-kpi-number" style={{ color: "#2E7D32" }}>
                {metrics.resolved}
              </div>
              <div className="text-muted small mt-1">Remediated & verified by technicians</div>
            </div>
            {onNavigateToMyTickets && (
              <div className="mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="dashboard-drilldown-link"
                  onClick={() => onNavigateToMyTickets("RESOLVED")}
                  data-testid="drilldown-resolved"
                >
                  View Resolved →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Card 4: Closed */}
        <div className="col-12 col-sm-6 col-lg-3">
          <div
            className="dashboard-kpi-card h-100 d-flex flex-column justify-content-between"
            style={{ borderTop: "4px solid #4B5563" }}
            data-testid="card-closed"
          >
            <div>
              <div className="dashboard-kpi-label mb-1">Closed</div>
              <div className="dashboard-kpi-number" style={{ color: "#4B5563" }}>
                {metrics.closed}
              </div>
              <div className="text-muted small mt-1">Archived service request history</div>
            </div>
            {onNavigateToMyTickets && (
              <div className="mt-3 pt-2 border-top">
                <button
                  type="button"
                  className="dashboard-drilldown-link"
                  onClick={() => onNavigateToMyTickets("CLOSED")}
                  data-testid="drilldown-closed"
                >
                  View Closed →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4. Recently Updated Tickets Table */}
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
                Recently Updated Tickets
              </h2>
              <p className="text-muted small mb-0">
                Your 5 most recently active service desk tickets
              </p>
            </div>
            {onNavigateToMyTickets && recentTickets.length > 0 && (
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary"
                onClick={() => onNavigateToMyTickets()}
                data-testid="view-all-tickets-btn"
              >
                View All Tickets →
              </button>
            )}
          </div>

          {recentTickets.length === 0 ? (
            <div
              className="text-center py-5 px-3 rounded-3"
              style={{ backgroundColor: "var(--zen-pale-green, #EAF6EF)" }}
              data-testid="empty-tickets-message"
            >
              <div style={{ fontSize: "2.5rem" }} aria-hidden="true">🎫</div>
              <h3 className="h6 fw-bold mt-2" style={{ color: "var(--zen-primary-green)" }}>
                No Service Requests Yet
              </h3>
              <p className="text-muted small mb-3" style={{ maxWidth: 450, margin: "0 auto" }}>
                You currently have no service tickets submitted. If you encounter any technical issues with campus systems or equipment, click below.
              </p>
              {onCreateTicket && (
                <button
                  type="button"
                  className="btn btn-zen-primary btn-sm px-4"
                  onClick={onCreateTicket}
                >
                  + Create Your First Ticket
                </button>
              )}
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
                    <th scope="col" style={{ width: "16%" }}>Last Updated</th>
                    <th scope="col" className="text-end" style={{ width: "12%" }}>Action</th>
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
                      PRIORITY_BADGE_CONFIG[ticket.requestedPriority || "MEDIUM"] ||
                      PRIORITY_BADGE_CONFIG["MEDIUM"];

                    return (
                      <tr
                        key={ticket.id}
                        data-testid={`recent-ticket-row-${ticket.id}`}
                        style={{ cursor: onViewTicket ? "pointer" : "default" }}
                        onClick={() => onViewTicket && onViewTicket(ticket.id)}
                      >
                        <td className="fw-semibold text-success">
                          {ticket.ticketNumber}
                        </td>
                        <td>
                          <div className="fw-medium text-truncate" style={{ maxWidth: 350 }}>
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
                              data-testid={`view-ticket-btn-${ticket.id}`}
                            >
                              View
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

