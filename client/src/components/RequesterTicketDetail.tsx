import { useState, useEffect, useCallback } from "react";
import {
  fetchTicketById,
  indicateProblemResolved,
  postPublicComment,
  Ticket,
  PublicCommentDTO,
} from "../api.js";
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

  // Resolution indication state (BR-05)
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);
  const [resolveSuccess, setResolveSuccess] = useState<string | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);

  // Comment state
  const [commentContent, setCommentContent] = useState<string>("");
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const handleIndicateResolved = async () => {
    if (!ticket) return;
    setIsResolving(true);
    setResolveError(null);
    try {
      const res = await indicateProblemResolved(ticket.id);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              requesterResolvedAt: res.requesterResolvedAt,
            }
          : null
      );
      setShowResolveModal(false);
      setResolveSuccess("Thank you! IT Staff has been notified that your problem appears resolved.");
    } catch (err: unknown) {
      const error = err as Error;
      setResolveError(error.message || "Failed to record resolution indication.");
    } finally {
      setIsResolving(false);
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !commentContent.trim()) return;
    setIsSubmittingComment(true);
    setCommentError(null);
    try {
      const res = await postPublicComment(ticket.id, commentContent.trim());
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              publicComments: [...(prev.publicComments || []), res.comment],
            }
          : null
      );
      setCommentContent("");
    } catch (err: unknown) {
      const error = err as Error;
      setCommentError(error.message || "Failed to post comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

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

              <div className="d-flex align-items-center gap-3 flex-wrap">
                {ticket.publicComments !== undefined &&
                  !ticket.requesterResolvedAt &&
                  (ticket.currentStatus || ticket.status) !== "CLOSED" &&
                  (ticket.currentStatus || ticket.status) !== "CANCELLED" && (
                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm d-inline-flex align-items-center gap-1"
                      onClick={() => setShowResolveModal(true)}
                      data-testid="indicate-resolved-btn"
                    >
                      <span aria-hidden="true">✓</span>
                      <span>Problem Appears Resolved</span>
                    </button>
                  )}

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
            </div>

            {/* Body */}
            <div className="card-body p-4">
              {/* Requester Resolved Confirmation Banner (BR-05) */}
              {ticket.requesterResolvedAt && (
                <div
                  className="requester-resolved-banner mb-4"
                  data-testid="requester-resolved-banner"
                >
                  <span aria-hidden="true" className="fs-5">✓</span>
                  <div>
                    <strong>You indicated this problem appears resolved</strong>
                    <div className="small text-muted">
                      Marked on {formatDate(ticket.requesterResolvedAt)}. IT Staff has been notified.
                    </div>
                  </div>
                </div>
              )}

              {resolveSuccess && (
                <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
                  <span>✓ {resolveSuccess}</span>
                  <button type="button" className="btn-close" onClick={() => setResolveSuccess(null)} aria-label="Close" />
                </div>
              )}

              {resolveError && (
                <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
                  <span>⚠️ {resolveError}</span>
                  <button type="button" className="btn-close" onClick={() => setResolveError(null)} aria-label="Close" />
                </div>
              )}

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

          {/* Public Comments Section (Feature 14) */}
          {ticket.publicComments !== undefined && (
            <div className="card shadow-sm border-0 mt-4 mb-4" style={{ borderRadius: 8 }} data-testid="public-comments-section">
              <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                <div>
                  <h2 className="h6 fw-bold mb-0 text-success" style={{ color: "var(--zen-primary-green)" }}>
                    💬 Public Comments
                  </h2>
                  <span className="small text-muted">Shared communication with IT support staff</span>
                </div>
                <span className="badge bg-light text-dark border">
                  {(ticket.publicComments || []).length} comments
                </span>
              </div>

              <div className="card-body p-4">
                {/* Comments List */}
                <div
                  className="overflow-auto pe-1 mb-4"
                  style={{ maxHeight: 380, minHeight: 80 }}
                  data-testid="public-comments-list"
                >
                  {(!ticket.publicComments || ticket.publicComments.length === 0) ? (
                    <div className="text-center text-muted p-4 border rounded border-dashed small">
                      No public comments yet. If you have questions or updates for IT Staff, post a comment below.
                    </div>
                  ) : (
                    ticket.publicComments.map((comment: PublicCommentDTO) => (
                      <div
                        key={comment.id}
                        className="public-comment-card"
                        data-testid={`public-comment-item-${comment.id}`}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <div className="d-flex align-items-center gap-2">
                            <strong className="text-dark small">{comment.author?.name}</strong>
                            <span
                              className={`badge ${
                                comment.author?.role === "REQUESTER"
                                ? "bg-secondary"
                                : "bg-success"
                            } text-white`}
                            style={{ fontSize: "0.7rem" }}
                          >
                            {comment.author?.role}
                          </span>
                        </div>
                        <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.92rem" }}>
                        {comment.content}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handlePostComment} data-testid="new-comment-form">
                {commentError && (
                  <div className="alert alert-danger py-1 px-2 small mb-2">{commentError}</div>
                )}
                <div className="mb-2">
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Write a comment or question for IT Staff..."
                    value={commentContent}
                    maxLength={2000}
                    onChange={(e) => setCommentContent(e.target.value)}
                    data-testid="public-comment-input"
                  />
                  <div
                    className="d-flex justify-content-between small text-muted mt-1"
                    data-testid="public-comment-char-counter"
                  >
                    <span>Append-only • Visible to IT Staff</span>
                    <span>{commentContent.length}/2000 characters</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-zen-primary btn-sm px-3"
                  disabled={isSubmittingComment || !commentContent.trim() || commentContent.length > 2000}
                  data-testid="submit-public-comment-btn"
                >
                  {isSubmittingComment ? "Posting…" : "Post Comment"}
                </button>
              </form>
            </div>
          </div>
        )}

          {/* Resolve Confirmation Modal (BR-05) */}
          {showResolveModal && (
            <div
              className="modal show d-block"
              tabIndex={-1}
              role="dialog"
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
              data-testid="resolve-confirm-modal"
            >
              <div className="modal-dialog modal-dialog-centered" role="document">
                <div className="modal-content border-0 shadow" style={{ borderRadius: 8 }}>
                  <div className="modal-header border-bottom">
                    <h5 className="modal-title fw-bold text-success">
                      Problem Appears Resolved
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowResolveModal(false)}
                      aria-label="Close"
                      disabled={isResolving}
                    />
                  </div>
                  <div className="modal-body py-4">
                    <p className="mb-2">
                      Indicate that this problem appears resolved?
                    </p>
                    <p className="text-muted small mb-0">
                      This notifies IT Staff that your issue is resolved, but does not immediately close the ticket.
                    </p>
                  </div>
                  <div className="modal-footer border-top bg-light">
                    <button
                      type="button"
                      className="btn btn-zen-outline btn-sm px-3"
                      onClick={() => setShowResolveModal(false)}
                      disabled={isResolving}
                      data-testid="cancel-resolve-btn"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-zen-primary btn-sm px-3"
                      onClick={handleIndicateResolved}
                      disabled={isResolving}
                      data-testid="confirm-resolve-btn"
                    >
                      {isResolving ? "Updating…" : "Yes, Problem Appears Resolved"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

