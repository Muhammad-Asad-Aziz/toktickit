import { useState, useEffect, useCallback } from "react";
import { fetchTicketById, Ticket } from "../api.js";
import { useRequester } from "../context/RequesterContext.js";
import AttachmentSection from "./AttachmentSection.js";

interface RequesterTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

type DetailErrorType = "none" | "forbidden" | "not_found" | "network";

function formatDate(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return `${d.toISOString().split("T")[0]} ${d.toTimeString().split(" ")[0].slice(0, 5)}`;
  } catch {
    return isoString;
  }
}

export default function RequesterTicketDetail({
  ticketId,
  onBack,
}: RequesterTicketDetailProps) {
  const { currentRequester } = useRequester();
  const requesterId = currentRequester?.id;

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorType, setErrorType] = useState<DetailErrorType>("none");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadTicket = useCallback(async () => {
    if (!requesterId) {
      setTicket(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorType("none");
    setErrorMessage(null);

    try {
      const data = await fetchTicketById(ticketId, requesterId);
      setTicket(data);
    } catch (err: unknown) {
      const error = err as Error & { code?: string; status?: number };
      if (error.status === 403 || error.code === "FORBIDDEN_CROSS_REQUESTER") {
        setErrorType("forbidden");
        setErrorMessage(
          "Access Forbidden: You do not have permission to view this ticket as it belongs to another requester."
        );
      } else if (error.status === 404 || error.code === "TICKET_NOT_FOUND") {
        setErrorType("not_found");
        setErrorMessage(
          "Ticket Not Found: The requested ticket does not exist or has been removed."
        );
      } else {
        setErrorType("network");
        setErrorMessage(
          error.message || "Failed to load ticket details. Please check your network connection."
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, requesterId]);

  useEffect(() => {
    loadTicket();
  }, [loadTicket]);

  // Status badge class mapper
  const getStatusBadgeClass = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "new") return "badge-status-new";
    if (s === "assigned") return "badge-status-assigned";
    if (s.includes("progress")) return "badge-status-in-progress";
    if (s.includes("pending")) return "badge-status-pending-requester";
    if (s === "resolved" || s === "closed") return "badge-status-resolved";
    if (s === "cancelled") return "badge-status-cancelled";
    return "badge-status-new";
  };

  // Priority badge class mapper
  const getPriorityBadgeClass = (priority?: string | null) => {
    if (!priority) return "badge-priority-unassigned";
    const p = priority.toLowerCase();
    if (p === "urgent") return "badge-priority-urgent";
    if (p === "high") return "badge-priority-high";
    if (p === "medium") return "badge-priority-medium";
    if (p === "low") return "badge-priority-low";
    return "badge-priority-unassigned";
  };

  return (
    <div className="container-fluid px-0" data-testid="ticket-detail-view">
      {/* Navigation Header */}
      <div className="mb-4">
        <button
          type="button"
          className="btn btn-zen-outline btn-sm d-inline-flex align-items-center gap-2 px-3"
          onClick={onBack}
          data-testid="back-to-tickets-btn"
        >
          <span aria-hidden="true">←</span>
          <span>Back to My Tickets</span>
        </button>
      </div>

      {/* Loading Shimmer State */}
      {isLoading && (
        <div className="card shadow-sm border-0 p-4 mb-4" style={{ borderRadius: 8 }}>
          <div className="d-flex flex-column gap-3">
            <div className="zen-skeleton" style={{ height: 36, width: "40%" }} />
            <div className="zen-skeleton" style={{ height: 24, width: "60%" }} />
            <div className="zen-skeleton" style={{ height: 120, width: "100%" }} />
            <div className="zen-skeleton" style={{ height: 80, width: "100%" }} />
          </div>
        </div>
      )}

      {/* 403 Forbidden Error State */}
      {!isLoading && errorType === "forbidden" && (
        <div
          className="card shadow-sm border-0 text-center p-5 mb-4"
          style={{ borderRadius: 8, borderLeft: "4px solid var(--zen-error)" }}
          data-testid="forbidden-error-card"
        >
          <div className="py-4">
            <div className="fs-1 mb-3" aria-hidden="true">
              🔒
            </div>
            <h2 className="h4 fw-bold text-danger mb-2">Access Forbidden</h2>
            <p className="text-muted mx-auto mb-4" style={{ maxWidth: 480 }}>
              {errorMessage}
            </p>
            <button
              type="button"
              className="btn btn-zen-outline px-4 py-2"
              onClick={onBack}
            >
              Return to My Tickets
            </button>
          </div>
        </div>
      )}

      {/* 404 Not Found Error State */}
      {!isLoading && errorType === "not_found" && (
        <div
          className="card shadow-sm border-0 text-center p-5 mb-4"
          style={{ borderRadius: 8 }}
          data-testid="not-found-error-card"
        >
          <div className="py-4">
            <div className="fs-1 mb-3" aria-hidden="true">
              🔍
            </div>
            <h2 className="h4 fw-bold mb-2">Ticket Not Found</h2>
            <p className="text-muted mx-auto mb-4" style={{ maxWidth: 480 }}>
              {errorMessage}
            </p>
            <button
              type="button"
              className="btn btn-zen-outline px-4 py-2"
              onClick={onBack}
            >
              Return to My Tickets
            </button>
          </div>
        </div>
      )}

      {/* General Network Error State */}
      {!isLoading && errorType === "network" && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between p-4 mb-4 shadow-sm"
          role="alert"
          style={{ borderRadius: 8, borderLeft: "4px solid var(--zen-error)" }}
          data-testid="network-error-card"
        >
          <div className="d-flex align-items-center gap-3">
            <span aria-hidden="true" className="fs-3">⚠️</span>
            <div>
              <h3 className="h6 fw-bold mb-1">Failed to Load Ticket</h3>
              <p className="mb-0 small">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger px-3 py-2"
            onClick={loadTicket}
            data-testid="retry-load-btn"
          >
            Retry
          </button>
        </div>
      )}

      {/* Ticket Details (Strictly Read-Only) */}
      {!isLoading && ticket && (
        <>
          {/* Main Ticket Information Card */}
          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: 8 }} data-testid="ticket-detail-card">
            {/* Header: Ticket Number, Badges, Dates */}
            <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div className="d-flex align-items-center gap-3">
                <span
                  className="font-monospace fw-bold fs-5"
                  style={{ color: "var(--zen-primary-green)" }}
                  data-testid="ticket-number"
                >
                  {ticket.ticketNumber || ticket.ticketNo}
                </span>
                <span
                  className={`badge-status ${getStatusBadgeClass(ticket.currentStatus || ticket.status)}`}
                  data-testid="ticket-status-badge"
                >
                  {ticket.currentStatus || ticket.status}
                </span>
              </div>

              <div className="small text-muted d-flex align-items-center gap-3">
                <div>
                  <strong>Created:</strong>{" "}
                  <span data-testid="ticket-created-date">{formatDate(ticket.createdAt)}</span>
                </div>
                <div>
                  <strong>Updated:</strong>{" "}
                  <span data-testid="ticket-updated-date">{formatDate(ticket.updatedAt)}</span>
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="card-body p-4">
              {/* Summary */}
              <div className="mb-4">
                <label className="text-muted small fw-semibold text-uppercase mb-1" style={{ letterSpacing: "0.04em" }}>
                  Summary
                </label>
                <h1 className="h4 fw-bold text-dark mb-0" data-testid="ticket-summary">
                  {ticket.summary}
                </h1>
              </div>

              {/* Metadata Grid */}
              <div
                className="row g-3 p-3 mb-4 rounded"
                style={{ backgroundColor: "var(--zen-page-bg)", border: "1px solid var(--zen-border-neutral)" }}
              >
                <div className="col-12 col-sm-6 col-md-3">
                  <div className="text-muted small fw-semibold">Requester</div>
                  <div className="fw-medium text-dark mt-1" data-testid="ticket-requester-name">
                    {ticket.requester?.name || "—"}
                  </div>
                  <div className="text-muted small">{ticket.requester?.email}</div>
                  {ticket.requester?.department && (
                    <div className="text-muted small">{ticket.requester.department}</div>
                  )}
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <div className="text-muted small fw-semibold">Category & System</div>
                  <div className="fw-medium text-dark mt-1" data-testid="ticket-category">
                    {ticket.category?.name || "—"}
                  </div>
                  <div className="text-muted small" data-testid="ticket-system">
                    {ticket.relatedSystem?.name || "—"}
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <div className="text-muted small fw-semibold">Priorities</div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <span className="small text-muted">Req:</span>
                    <span
                      className={`badge-priority ${getPriorityBadgeClass(ticket.requestedPriority)}`}
                      data-testid="ticket-requested-priority"
                    >
                      {ticket.requestedPriority}
                    </span>
                  </div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <span className="small text-muted">IT:</span>
                    {ticket.itPriority ? (
                      <span
                        className={`badge-priority ${getPriorityBadgeClass(ticket.itPriority)}`}
                        data-testid="ticket-it-priority"
                      >
                        {ticket.itPriority}
                      </span>
                    ) : (
                      <span className="text-muted small" data-testid="ticket-it-priority">
                        Unassigned
                      </span>
                    )}
                  </div>
                </div>

                <div className="col-12 col-sm-6 col-md-3">
                  <div className="text-muted small fw-semibold">Assigned IT Owner</div>
                  <div className="fw-medium text-dark mt-1" data-testid="ticket-owner">
                    {ticket.ticketOwner || "Unassigned"}
                  </div>
                </div>
              </div>

              {/* Description (Read-Only Shaded Area) */}
              <div>
                <label className="text-muted small fw-semibold text-uppercase mb-1" style={{ letterSpacing: "0.04em" }}>
                  Description
                </label>
                <div
                  className="p-3 rounded text-dark"
                  style={{
                    backgroundColor: "var(--zen-field-readonly-bg)",
                    border: "1px solid var(--zen-border-neutral)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    minHeight: 100,
                  }}
                  data-testid="ticket-description"
                >
                  {ticket.description}
                </div>
              </div>
            </div>
          </div>

          {/* Attachment Lifecycle Section */}
          <AttachmentSection
            ticketId={ticket.id}
            attachments={ticket.attachments || []}
            requesterId={currentRequester?.id}
            onAttachmentUploaded={(newAttachment) => {
              setTicket((prev) =>
                prev
                  ? {
                      ...prev,
                      attachments: [...(prev.attachments || []), newAttachment],
                    }
                  : null
              );
            }}
            onAttachmentRemoved={(removedAttachment) => {
              if (!removedAttachment) return;
              setTicket((prev) => {
                if (!prev) return null;
                const targetId = removedAttachment.id;
                if (!targetId) return prev;
                return {
                  ...prev,
                  attachments: (prev.attachments || []).map((att) => {
                    if (att.id === targetId) {
                      return {
                        ...att,
                        ...removedAttachment,
                        isRemoved: true,
                        isDeleted: true,
                        removalReason:
                          removedAttachment.removalReason ||
                          att.removalReason ||
                          "Attachment removed",
                        removedAt:
                          removedAttachment.removedAt ||
                          att.removedAt ||
                          new Date().toISOString(),
                      };
                    }
                    return att;
                  }),
                };
              });
            }}
          />
        </>
      )}
    </div>
  );
}
