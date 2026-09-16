import { useState, useEffect, useCallback } from "react";
import {
  fetchStaffTicketDetail,
  fetchAssignees,
  assignTicketOwner,
  updateTicketPriority,
  transitionTicketStatus,
  postPublicComment,
  postInternalNote,
  StaffTicketDetailDTO,
  AssigneeOption,
  PublicCommentDTO,
  InternalNoteDTO,
} from "../api.js";
import { useAuth } from "../context/AuthContext.js";
import AttachmentSection from "./AttachmentSection.js";

interface StaffTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
};

function formatDate(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return `${d.toISOString().split("T")[0]} ${d.toTimeString().split(" ")[0].slice(0, 5)}`;
  } catch {
    return isoString;
  }
}

export default function StaffTicketDetail({
  ticketId,
  onBack,
}: StaffTicketDetailProps) {
  const { user: currentUser } = useAuth();

  const [ticket, setTicket] = useState<StaffTicketDetailDTO | null>(null);
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Operational form state
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [isUpdatingOwner, setIsUpdatingOwner] = useState<boolean>(false);

  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [isUpdatingPriority, setIsUpdatingPriority] = useState<boolean>(false);

  const [selectedNextStatus, setSelectedNextStatus] = useState<string>("");
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Comment & Note form state
  const [commentContent, setCommentContent] = useState<string>("");
  const [isSubmittingComment, setIsSubmittingComment] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  const [noteContent, setNoteContent] = useState<string>("");
  const [isSubmittingNote, setIsSubmittingNote] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const loadTicketData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [ticketData, assigneesList] = await Promise.all([
        fetchStaffTicketDetail(ticketId),
        fetchAssignees().catch(() => []),
      ]);
      setTicket(ticketData);
      setAssignees(assigneesList);
      setSelectedOwnerId(ticketData.ownerId ? String(ticketData.ownerId) : "");
      setSelectedPriority(ticketData.itPriority || "MEDIUM");
      const currentStatus = ticketData.currentStatus || "NEW";
      const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
      setSelectedNextStatus(allowed.length > 0 ? allowed[0] : "");
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Failed to load staff ticket details");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  useEffect(() => {
    loadTicketData();
  }, [loadTicketData]);

  // Status badge class mapper
  const getStatusBadgeClass = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (s === "new") return "badge-status-new";
    if (s === "open" || s === "assigned") return "badge-status-assigned";
    if (s.includes("progress")) return "badge-status-in-progress";
    if (s.includes("waiting") || s.includes("pending")) return "badge-status-pending-requester";
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

  // 1. Assign Owner Handler
  const handleAssignOwner = async (targetOwnerId: number | null) => {
    if (!ticket) return;
    setIsUpdatingOwner(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await assignTicketOwner(ticket.id, targetOwnerId);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              ownerId: targetOwnerId,
              owner: res.owner
                ? { id: res.owner.id, name: res.owner.name, email: res.owner.email, role: res.owner.role }
                : null,
              ticketOwner: res.owner?.name || null,
            }
          : null
      );
      setSelectedOwnerId(targetOwnerId ? String(targetOwnerId) : "");
      setSuccessMessage("Ticket ownership updated successfully.");
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Failed to update ticket ownership.");
    } finally {
      setIsUpdatingOwner(false);
    }
  };

  // 2. Claim Ticket Shortcut Handler
  const handleClaimTicket = async () => {
    if (!currentUser) return;
    await handleAssignOwner(currentUser.id);
  };

  // 3. Update IT Priority Handler
  const handleUpdatePriority = async () => {
    if (!ticket || !selectedPriority) return;
    setIsUpdatingPriority(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await updateTicketPriority(ticket.id, selectedPriority);
      setTicket((prev) => (prev ? { ...prev, itPriority: selectedPriority } : null));
      setSuccessMessage("IT priority updated successfully.");
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Failed to update IT priority.");
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  // 4. Transition Status Handler
  const handleTransitionStatus = async () => {
    if (!ticket || !selectedNextStatus) return;
    setIsUpdatingStatus(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await transitionTicketStatus(ticket.id, selectedNextStatus);
      const newStatus = selectedNextStatus;
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              currentStatus: newStatus,
              status: newStatus,
            }
          : null
      );
      const allowed = ALLOWED_TRANSITIONS[newStatus] || [];
      setSelectedNextStatus(allowed.length > 0 ? allowed[0] : "");
      setSuccessMessage(`Ticket transitioned to ${newStatus}.`);
    } catch (err: unknown) {
      const error = err as Error;
      setErrorMessage(error.message || "Failed to transition ticket status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 5. Submit Public Comment Handler
  const handleSubmitComment = async (e: React.FormEvent) => {
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
      setCommentError(error.message || "Failed to submit public comment.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // 6. Submit Internal Note Handler
  const handleSubmitNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket || !noteContent.trim()) return;
    setIsSubmittingNote(true);
    setNoteError(null);
    try {
      const res = await postInternalNote(ticket.id, noteContent.trim());
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              internalNotes: [...(prev.internalNotes || []), res.note],
            }
          : null
      );
      setNoteContent("");
    } catch (err: unknown) {
      const error = err as Error;
      setNoteError(error.message || "Failed to submit internal note.");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  if (isLoading) {
    return (
      <div className="card shadow-sm border-0 p-4 mb-4" style={{ borderRadius: 8 }} data-testid="staff-ticket-detail-loading">
        <div className="d-flex flex-column gap-3">
          <div className="zen-skeleton" style={{ height: 36, width: "40%" }} />
          <div className="zen-skeleton" style={{ height: 24, width: "60%" }} />
          <div className="zen-skeleton" style={{ height: 120, width: "100%" }} />
        </div>
      </div>
    );
  }

  if (errorMessage && !ticket) {
    return (
      <div className="alert alert-danger p-4 mb-4 shadow-sm" role="alert" style={{ borderRadius: 8 }}>
        <h3 className="h6 fw-bold mb-1">Failed to Load Ticket</h3>
        <p className="mb-3 small">{errorMessage}</p>
        <button type="button" className="btn btn-zen-outline btn-sm" onClick={onBack}>
          ← Back to Staff Queue
        </button>
      </div>
    );
  }

  if (!ticket) return null;

  const currentStatus = ticket.currentStatus || "NEW";
  const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
  const isAlreadyOwner = Boolean(currentUser && ticket.ownerId === currentUser.id);

  return (
    <div className="container-fluid px-0" data-testid="staff-ticket-detail-view">
      {/* Navigation Header */}
      <div className="mb-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-zen-outline btn-sm d-inline-flex align-items-center gap-2 px-3"
          onClick={onBack}
          data-testid="back-to-queue-btn"
        >
          <span aria-hidden="true">←</span>
          <span>Back to Staff Queue</span>
        </button>

        <div className="small text-muted d-flex align-items-center gap-3">
          <div>
            <strong>Created:</strong> <span data-testid="ticket-created-date">{formatDate(ticket.createdAt)}</span>
          </div>
          <div>
            <strong>Updated:</strong> <span data-testid="ticket-updated-date">{formatDate(ticket.updatedAt)}</span>
          </div>
        </div>
      </div>

      {/* Global Toast / Feedback Alerts */}
      {successMessage && (
        <div className="alert alert-success alert-dismissible fade show mb-4" role="alert">
          <span>✓ {successMessage}</span>
          <button type="button" className="btn-close" onClick={() => setSuccessMessage(null)} aria-label="Close" />
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
          <span>⚠️ {errorMessage}</span>
          <button type="button" className="btn-close" onClick={() => setErrorMessage(null)} aria-label="Close" />
        </div>
      )}

      {/* Main Grid: Left Context (60%) & Right Operational Controls (40%) */}
      <div className="row g-4 mb-4">
        {/* Left Column: Read-Only Ticket Context */}
        <div className="col-12 col-lg-7">
          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: 8 }}>
            {/* Header with Ticket Number and Badges */}
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
                  className={`badge-status ${getStatusBadgeClass(ticket.currentStatus)}`}
                  data-testid="ticket-status-badge"
                >
                  {ticket.currentStatus}
                </span>
                <span
                  className={`badge-priority ${getPriorityBadgeClass(ticket.itPriority)}`}
                  data-testid="ticket-it-priority-badge"
                >
                  IT: {ticket.itPriority || "Unassigned"}
                </span>
              </div>
            </div>

            <div className="card-body p-4">
              {/* Requester Resolution Alert Banner (BR-05) */}
              {ticket.requesterResolvedAt && (
                <div
                  className="requester-resolved-banner mb-4"
                  data-testid="requester-resolved-indicator"
                >
                  <span aria-hidden="true" className="fs-5">★</span>
                  <div>
                    <strong>Requester indicated problem appears resolved</strong>
                    <div className="small text-muted">
                      Marked on {formatDate(ticket.requesterResolvedAt)}. Verified ready for IT staff resolution.
                    </div>
                  </div>
                </div>
              )}

              {/* Summary */}
              <div className="mb-4">
                <label className="text-muted small fw-semibold text-uppercase mb-1" style={{ letterSpacing: "0.04em" }}>
                  Summary
                </label>
                <h2 className="h4 fw-bold text-dark mb-0" data-testid="ticket-summary">
                  {ticket.summary}
                </h2>
              </div>

              {/* Metadata Grid */}
              <div
                className="row g-3 p-3 mb-4 rounded"
                style={{ backgroundColor: "var(--zen-page-bg)", border: "1px solid var(--zen-border-neutral)" }}
                data-testid="requester-card"
              >
                <div className="col-12 col-sm-6">
                  <div className="text-muted small fw-semibold">Requester Details</div>
                  <div className="fw-medium text-dark mt-1" data-testid="ticket-requester-name">
                    {ticket.requester?.name || "—"}
                  </div>
                  <div className="text-muted small">{ticket.requester?.email}</div>
                  {ticket.requester?.department && (
                    <div className="text-muted small">{ticket.requester?.department}</div>
                  )}
                </div>

                <div className="col-12 col-sm-6">
                  <div className="text-muted small fw-semibold">Classification</div>
                  <div className="fw-medium text-dark mt-1" data-testid="ticket-category">
                    {ticket.category?.name || "—"}
                  </div>
                  <div className="text-muted small" data-testid="ticket-system">
                    System: {ticket.relatedSystem?.name || "—"}
                  </div>
                  <div className="d-flex align-items-center gap-2 mt-1">
                    <span className="small text-muted">Requested Priority:</span>
                    <span
                      className={`badge-priority ${getPriorityBadgeClass(ticket.requestedPriority)}`}
                      data-testid="ticket-requested-priority"
                    >
                      {ticket.requestedPriority}
                    </span>
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
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
                    minHeight: 120,
                  }}
                  data-testid="ticket-description"
                >
                  {ticket.description}
                </div>
              </div>
            </div>
          </div>

          {/* Attachments Section */}
          <AttachmentSection
            ticketId={ticket.id}
            attachments={ticket.attachments || []}
            requesterId={ticket.requesterId}
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
                return {
                  ...prev,
                  attachments: (prev.attachments || []).map((att) =>
                    att.id === targetId ? { ...att, isRemoved: true, isDeleted: true } : att
                  ),
                };
              });
            }}
          />
        </div>

        {/* Right Column: Operational Controls */}
        <div className="col-12 col-lg-5">
          {/* Card 1: Owner Assignment */}
          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: 8 }} data-testid="ownership-card">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h3 className="h6 fw-bold mb-0">Ticket Ownership</h3>
            </div>
            <div className="card-body p-4">
              <div className="mb-3">
                <span className="text-muted small">Current Owner: </span>
                <strong data-testid="current-owner-display">
                  {ticket.owner?.name || ticket.ticketOwner || "Unassigned"}
                </strong>
              </div>

              <div className="mb-3">
                <label htmlFor="assignee-select" className="form-label small fw-semibold text-muted">
                  Assign to IT Staff
                </label>
                <select
                  id="assignee-select"
                  className="form-select"
                  value={selectedOwnerId}
                  onChange={(e) => setSelectedOwnerId(e.target.value)}
                  data-testid="assignee-select"
                >
                  <option value="">Unassigned</option>
                  {assignees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="d-flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-zen-primary btn-sm px-3"
                  onClick={() => handleAssignOwner(selectedOwnerId ? Number(selectedOwnerId) : null)}
                  disabled={isUpdatingOwner}
                  data-testid="save-assignment-btn"
                >
                  {isUpdatingOwner ? "Saving…" : "Update Owner"}
                </button>

                <button
                  type="button"
                  className="btn btn-zen-outline btn-sm px-3"
                  onClick={handleClaimTicket}
                  disabled={isUpdatingOwner || isAlreadyOwner}
                  data-testid="claim-ticket-btn"
                >
                  {isAlreadyOwner ? "✓ Assigned to You" : "Claim Ticket (Assign to Me)"}
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: IT Priority Setting */}
          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: 8 }} data-testid="priority-card">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h3 className="h6 fw-bold mb-0">IT Operational Priority</h3>
            </div>
            <div className="card-body p-4">
              <div className="mb-3">
                <label htmlFor="it-priority-select" className="form-label small fw-semibold text-muted">
                  Select Priority Level
                </label>
                <select
                  id="it-priority-select"
                  className="form-select"
                  value={selectedPriority}
                  onChange={(e) => setSelectedPriority(e.target.value)}
                  data-testid="it-priority-select"
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
              </div>

              <button
                type="button"
                className="btn btn-zen-primary btn-sm px-3"
                onClick={handleUpdatePriority}
                disabled={isUpdatingPriority || selectedPriority === ticket.itPriority}
                data-testid="save-priority-btn"
              >
                {isUpdatingPriority ? "Saving…" : "Save Priority"}
              </button>
            </div>
          </div>

          {/* Card 3: Status Workflow Execution */}
          <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: 8 }} data-testid="status-card">
            <div className="card-header bg-white border-bottom py-3 px-4">
              <h3 className="h6 fw-bold mb-0">Status Workflow Transition</h3>
            </div>
            <div className="card-body p-4">
              <div className="mb-3">
                <span className="text-muted small">Current State: </span>
                <span className={`badge-status ${getStatusBadgeClass(ticket.currentStatus)}`}>
                  {ticket.currentStatus}
                </span>
              </div>

              {allowedNextStatuses.length === 0 ? (
                <div className="alert alert-secondary py-2 px-3 small mb-0">
                  Terminal status reached ({ticket.currentStatus}). No further transitions permitted.
                </div>
              ) : (
                <>
                  <div className="mb-3">
                    <label htmlFor="status-transition-select" className="form-label small fw-semibold text-muted">
                      Next Allowed State
                    </label>
                    <select
                      id="status-transition-select"
                      className="form-select"
                      value={selectedNextStatus}
                      onChange={(e) => setSelectedNextStatus(e.target.value)}
                      data-testid="status-transition-select"
                    >
                      {allowedNextStatuses.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="btn btn-zen-primary btn-sm px-3"
                    onClick={handleTransitionStatus}
                    disabled={isUpdatingStatus || !selectedNextStatus}
                    data-testid="transition-status-btn"
                  >
                    {isUpdatingStatus ? "Transitioning…" : `Transition to ${selectedNextStatus}`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Dual Collaboration Threads */}
      <div className="row g-4 mb-4">
        {/* Thread 1: Public Comments (Visible to Requester & Staff) */}
        <div className="col-12 col-lg-6">
          <div
            className="card shadow-sm border-0 h-100"
            style={{ borderRadius: 8 }}
            data-testid="public-comments-section"
          >
            <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <div>
                <h3 className="h6 fw-bold mb-0 text-success" style={{ color: "var(--zen-primary-green)" }}>
                  💬 Public Comments
                </h3>
                <span className="small text-muted">Shared communication visible to Requester & Staff</span>
              </div>
              <span className="badge bg-light text-dark border">
                {(ticket.publicComments || []).length} comments
              </span>
            </div>

            <div className="card-body p-4 d-flex flex-column justify-content-between">
              {/* Comments Feed */}
              <div
                className="overflow-auto pe-1 mb-4"
                style={{ maxHeight: 380, minHeight: 120 }}
                data-testid="public-comments-list"
              >
                {(!ticket.publicComments || ticket.publicComments.length === 0) ? (
                  <div className="text-center text-muted p-4 border rounded border-dashed small">
                    No public comments yet. Post the first comment below.
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
              <form onSubmit={handleSubmitComment} data-testid="new-comment-form">
                {commentError && (
                  <div className="alert alert-danger py-1 px-2 small mb-2">{commentError}</div>
                )}
                <div className="mb-2">
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Write a public comment to the requester..."
                    value={commentContent}
                    maxLength={2000}
                    onChange={(e) => setCommentContent(e.target.value)}
                    data-testid="public-comment-input"
                  />
                  <div
                    className="d-flex justify-content-between small text-muted mt-1"
                    data-testid="public-comment-char-counter"
                  >
                    <span>Append-only • Visible to requester</span>
                    <span>{commentContent.length}/2000 characters</span>
                  </div>
                </div>

                <button
                  type="submit"
                  className="btn btn-zen-primary btn-sm px-3"
                  disabled={isSubmittingComment || !commentContent.trim() || commentContent.length > 2000}
                  data-testid="submit-public-comment-btn"
                >
                  {isSubmittingComment ? "Posting…" : "Post Public Comment"}
                </button>
              </form>
            </div>
          </div>
        </div>

        {/* Thread 2: Internal Notes (High-Contrast Amber Visual Guardrail) */}
        <div className="col-12 col-lg-6">
          <div
            className="internal-note-container h-100 d-flex flex-column justify-content-between shadow-sm"
            data-testid="internal-notes-section"
          >
            <div>
              {/* Prominent Confidentiality Warning Banner */}
              <div
                className="internal-note-banner"
                data-testid="internal-note-confidential-banner"
              >
                <span className="fs-5" aria-hidden="true">🔒</span>
                <div>
                  <div className="fw-bold">CONFIDENTIAL — INTERNAL IT NOTE</div>
                  <div className="small" style={{ fontWeight: 400 }}>
                    Visible strictly to IT Staff & Administrators. Never visible to Requesters.
                  </div>
                </div>
              </div>

              {/* Internal Notes Feed */}
              <div
                className="overflow-auto pe-1 mb-4"
                style={{ maxHeight: 340, minHeight: 120 }}
                data-testid="internal-notes-list"
              >
                {(!ticket.internalNotes || ticket.internalNotes.length === 0) ? (
                  <div className="text-center text-muted p-4 border rounded border-dashed small bg-white">
                    No confidential internal notes recorded yet.
                  </div>
                ) : (
                  ticket.internalNotes.map((note: InternalNoteDTO) => (
                    <div
                      key={note.id}
                      className="internal-note-card"
                      data-testid={`internal-note-item-${note.id}`}
                    >
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div className="d-flex align-items-center gap-2">
                          <strong className="text-dark small">{note.author?.name}</strong>
                          <span
                            className="badge bg-warning text-dark"
                            style={{ fontSize: "0.7rem", fontWeight: 700 }}
                          >
                            🔒 {note.author?.role}
                          </span>
                        </div>
                        <span className="text-muted small" style={{ fontSize: "0.75rem" }}>
                          {formatDate(note.createdAt)}
                        </span>
                      </div>
                      <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.92rem", color: "#1C2826" }}>
                        {note.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Add Internal Note Form */}
            <form onSubmit={handleSubmitNote} data-testid="new-note-form">
              {noteError && (
                <div className="alert alert-danger py-1 px-2 small mb-2">{noteError}</div>
              )}
              <div className="mb-2">
                <textarea
                  className="form-control"
                  rows={3}
                  placeholder="Record confidential technical notes, internal diagnostics, or handover comments..."
                  value={noteContent}
                  maxLength={2000}
                  onChange={(e) => setNoteContent(e.target.value)}
                  data-testid="internal-note-input"
                  style={{ borderColor: "var(--zen-note-border)" }}
                />
                <div
                  className="d-flex justify-content-between small text-muted mt-1"
                  data-testid="internal-note-char-counter"
                >
                  <span className="text-warning-emphasis fw-semibold">🔒 IT Staff Only • Append-only</span>
                  <span>{noteContent.length}/2000 characters</span>
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-zen-amber btn-sm px-3"
                disabled={isSubmittingNote || !noteContent.trim() || noteContent.length > 2000}
                data-testid="submit-internal-note-btn"
              >
                {isSubmittingNote ? "Recording…" : "🔒 Add Confidential Note"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
