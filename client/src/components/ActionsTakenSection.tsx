import React, { useState, useEffect, useCallback } from "react";
import {
  ActionTakenDTO,
  CreateActionTakenPayload,
  UpdateActionTakenPayload,
  fetchActionsTaken,
  createActionTaken,
  updateActionTaken,
} from "../api.js";

export interface ActionsTakenSectionProps {
  /** Target ticket ID */
  ticketId: number;
  /** Whether controls are strictly read-only (true for Requesters, false for Staff/Admin) */
  readOnly?: boolean;
  /** Authenticated user details from AuthContext or RequesterContext */
  currentUser?: {
    id: number;
    name: string;
    email: string;
    role: "REQUESTER" | "IT_STAFF" | "ADMINISTRATOR";
  } | null;
  /** Optional callback notifying parent view when an action is created or updated */
  onActionsChanged?: (actions: ActionTakenDTO[]) => void;
}

interface ActionFormData {
  actionDateTime: string; // YYYY-MM-DDTHH:mm for datetime-local
  actionDescription: string;
  result: string;
  followUpRequired: boolean;
  followUpNote: string;
  attachmentNotes: string;
}

const toLocalDatetimeInput = (date: Date): string => {
  const pad = (n: number) => n.toString().padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  return `${y}-${m}-${d}T${hh}:${mm}`;
};

const getInitialFormData = (): ActionFormData => ({
  actionDateTime: toLocalDatetimeInput(new Date()),
  actionDescription: "",
  result: "",
  followUpRequired: false,
  followUpNote: "",
  attachmentNotes: "",
});

export const ActionsTakenSection: React.FC<ActionsTakenSectionProps> = ({
  ticketId,
  readOnly = false,
  currentUser = null,
  onActionsChanged,
}) => {
  const [actions, setActions] = useState<ActionTakenDTO[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [modalMode, setModalMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [editingAction, setEditingAction] = useState<ActionTakenDTO | null>(null);

  // Form State
  const [formData, setFormData] = useState<ActionFormData>(getInitialFormData());
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const loadActions = useCallback(async () => {
    if (!ticketId) return;
    setIsLoading(true);
    setLoadError(null);
    try {
      const res = await fetchActionsTaken(ticketId);
      const sorted = (res.actionsTaken || []).sort(
        (a, b) => new Date(a.actionDateTime).getTime() - new Date(b.actionDateTime).getTime()
      );
      setActions(sorted);
      onActionsChanged?.(sorted);
    } catch (err: unknown) {
      const error = err as Error;
      setLoadError(error.message || "Failed to load actions taken.");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId, onActionsChanged]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  // Open Create Modal
  const handleOpenCreateModal = () => {
    if (readOnly) return;
    setModalMode("CREATE");
    setEditingAction(null);
    setFormData(getInitialFormData());
    setFieldErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (action: ActionTakenDTO) => {
    if (readOnly) return;
    setModalMode("EDIT");
    setEditingAction(action);
    setFormData({
      actionDateTime: toLocalDatetimeInput(new Date(action.actionDateTime)),
      actionDescription: action.actionDescription,
      result: action.result,
      followUpRequired: action.followUpRequired,
      followUpNote: action.followUpNote || "",
      attachmentNotes: action.attachmentNotes || "",
    });
    setFieldErrors({});
    setSubmitError(null);
    setIsModalOpen(true);
  };

  // Close Modal
  const handleCloseModal = () => {
    if (isSubmitting) return; // Prevent closing while in flight
    setIsModalOpen(false);
    setEditingAction(null);
    setSubmitError(null);
    setFieldErrors({});
  };

  // Blur validation rule: clear field on invalid format
  const handleDateBlur = () => {
    if (formData.actionDateTime && isNaN(new Date(formData.actionDateTime).getTime())) {
      setFormData((prev) => ({ ...prev, actionDateTime: "" }));
    }
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    // 1. Validate Form Inputs
    const errors: Record<string, string> = {};

    if (!formData.actionDateTime || isNaN(new Date(formData.actionDateTime).getTime())) {
      errors.actionDateTime = "Please provide a valid action date and time.";
    } else if (new Date(formData.actionDateTime).getTime() > Date.now()) {
      errors.actionDateTime = "Action date/time cannot be in the future.";
    }

    const trimmedDesc = formData.actionDescription.trim();
    if (!trimmedDesc || trimmedDesc.length < 5 || trimmedDesc.length > 1000) {
      errors.actionDescription = "Action description must be between 5 and 1000 characters.";
    }

    const trimmedResult = formData.result.trim();
    if (!trimmedResult || trimmedResult.length < 2 || trimmedResult.length > 1000) {
      errors.result = "Result must be between 2 and 1000 characters.";
    }

    if (formData.followUpRequired) {
      const trimmedNote = formData.followUpNote.trim();
      if (!trimmedNote || trimmedNote.length < 3 || trimmedNote.length > 1000) {
        errors.followUpNote = "Follow-up note is required when follow-up is needed (3-1000 characters).";
      }
    }

    if (formData.attachmentNotes && formData.attachmentNotes.trim().length > 500) {
      errors.attachmentNotes = "Attachment notes cannot exceed 500 characters.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const actionIsoDate = new Date(formData.actionDateTime).toISOString();
      const followUpNoteValue = formData.followUpRequired ? formData.followUpNote.trim() : null;
      const attachmentNotesValue = formData.attachmentNotes.trim().length > 0 ? formData.attachmentNotes.trim() : null;

      if (modalMode === "CREATE") {
        const payload: CreateActionTakenPayload = {
          actionDateTime: actionIsoDate,
          actionDescription: trimmedDesc,
          result: trimmedResult,
          followUpRequired: formData.followUpRequired,
          followUpNote: followUpNoteValue,
          attachmentNotes: attachmentNotesValue,
        };

        const res = await createActionTaken(ticketId, payload);
        const updated = [...actions, res.actionTaken].sort(
          (a, b) => new Date(a.actionDateTime).getTime() - new Date(b.actionDateTime).getTime()
        );
        setActions(updated);
        onActionsChanged?.(updated);
        setIsModalOpen(false);
        setSuccessMessage("Action taken recorded successfully.");
        setTimeout(() => setSuccessMessage(null), 4000);
      } else if (modalMode === "EDIT" && editingAction) {
        const payload: UpdateActionTakenPayload = {
          actionDateTime: actionIsoDate,
          actionDescription: trimmedDesc,
          result: trimmedResult,
          followUpRequired: formData.followUpRequired,
          followUpNote: followUpNoteValue,
          attachmentNotes: attachmentNotesValue,
          versionTimestamp: editingAction.updatedAt,
        };

        const res = await updateActionTaken(ticketId, editingAction.id, payload);
        const updated = actions
          .map((a) => (a.id === res.actionTaken.id ? res.actionTaken : a))
          .sort((a, b) => new Date(a.actionDateTime).getTime() - new Date(b.actionDateTime).getTime());
        setActions(updated);
        onActionsChanged?.(updated);
        setIsModalOpen(false);
        setSuccessMessage("Action taken updated successfully.");
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: unknown) {
      const error = err as Error;
      // Preserve form state on error (AC-19.2)
      setSubmitError(error.message || "Failed to save action taken.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return isoString;
    }
  };

  return (
    <div
      className="card shadow-sm border-0 mb-4"
      style={{ borderRadius: 8, backgroundColor: "var(--zen-surface)" }}
      data-testid="actions-taken-section"
    >
      {/* Section Header */}
      <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h2
              className="h6 fw-bold mb-0"
              style={{ color: "var(--zen-primary-green)" }}
            >
              🛠️ Actions Taken by IT Staff
            </h2>
            <span
              className="badge"
              style={{
                backgroundColor: "var(--zen-pale-green)",
                color: "var(--zen-primary-green)",
                border: "1px solid #C4E5D2",
              }}
              data-testid="actions-count-badge"
            >
              {actions.length} {actions.length === 1 ? "action" : "actions"}
            </span>
          </div>
          <span className="small text-muted">
            Granular investigation, troubleshooting steps, and technical actions performed.
          </span>
        </div>

        {!readOnly && (
          <button
            type="button"
            className="btn btn-zen-primary btn-sm px-3"
            onClick={handleOpenCreateModal}
            data-testid="open-create-action-modal-btn"
          >
            + Log Action Taken
          </button>
        )}
      </div>

      <div className="card-body p-4">
        {/* Success Alert Banner */}
        {successMessage && (
          <div
            className="alert alert-success py-2 px-3 small mb-3 d-flex align-items-center"
            role="status"
            data-testid="actions-taken-success-alert"
          >
            <span className="me-2">✅</span>
            {successMessage}
          </div>
        )}

        {/* Error Alert Banner with Retry Button */}
        {loadError && (
          <div
            className="alert alert-danger py-2 px-3 small mb-3 d-flex justify-content-between align-items-center"
            role="alert"
            data-testid="actions-taken-error"
          >
            <span>⚠️ {loadError}</span>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={loadActions}
              data-testid="retry-load-actions-btn"
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* Loading Skeletons */}
        {isLoading && (
          <div data-testid="actions-taken-skeleton">
            <div className="action-skeleton p-4 mb-3" style={{ height: 110 }} />
            <div className="action-skeleton p-4 mb-3" style={{ height: 110 }} />
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !loadError && actions.length === 0 && (
          <div className="action-empty-state" data-testid="actions-taken-empty">
            <div style={{ fontSize: "2rem" }}>📋</div>
            <h3 className="h6 fw-semibold text-dark mt-2 mb-1">
              No actions recorded yet.
            </h3>
            <p className="small text-muted mb-0">
              {readOnly
                ? "No actions taken recorded yet. IT Staff will document technical steps as work progresses."
                : "No actions recorded yet. IT Staff must log actions taken before resolving this ticket."}
            </p>
          </div>
        )}

        {/* Actions List */}
        {!isLoading && !loadError && actions.length > 0 && (
          <div data-testid="actions-taken-list">
            {actions.map((action) => (
              <div
                key={action.id}
                className="action-taken-card"
                data-testid={`action-taken-item-${action.id}`}
              >
                {/* Header row: Timestamp, Performer, Edit Action */}
                <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-2 pb-2 border-bottom">
                  <div className="d-flex align-items-center gap-3 flex-wrap">
                    <span
                      className="text-muted small fw-medium"
                      data-testid={`action-time-${action.id}`}
                    >
                      🕒 {formatDateTime(action.actionDateTime)}
                    </span>
                    <div className="d-flex align-items-center gap-1">
                      <span className="small text-muted">Performed by:</span>
                      <strong className="text-dark small">
                        {action.performedBy?.name || "IT Staff"}
                      </strong>
                      <span
                        className="badge ms-1"
                        style={{
                          fontSize: "0.7rem",
                          backgroundColor:
                            action.performedBy?.role === "ADMINISTRATOR"
                              ? "#F3E8FF"
                              : "var(--zen-pale-green)",
                          color:
                            action.performedBy?.role === "ADMINISTRATOR"
                              ? "#6B21A8"
                              : "var(--zen-primary-green)",
                          border:
                            action.performedBy?.role === "ADMINISTRATOR"
                              ? "1px solid #E9D5FF"
                              : "1px solid #C4E5D2",
                        }}
                      >
                        {action.performedBy?.role === "ADMINISTRATOR"
                          ? "Admin"
                          : "IT Staff"}
                      </span>
                    </div>
                  </div>

                  {!readOnly && (
                    <button
                      type="button"
                      className="btn btn-zen-outline btn-sm py-1 px-2"
                      style={{ fontSize: "0.8rem", minHeight: 30 }}
                      onClick={() => handleOpenEditModal(action)}
                      data-testid={`edit-action-btn-${action.id}`}
                    >
                      ✏️ Edit Action
                    </button>
                  )}
                </div>

                {/* Description */}
                <div className="mb-2">
                  <div className="small fw-bold text-muted">Action Description:</div>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontSize: "0.93rem",
                      color: "var(--zen-text-primary)",
                    }}
                  >
                    {action.actionDescription}
                  </div>
                </div>

                {/* Result */}
                <div className="mb-2">
                  <div className="small fw-bold text-muted">Result:</div>
                  <div
                    style={{
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      fontSize: "0.93rem",
                      color: "var(--zen-text-primary)",
                    }}
                  >
                    {action.result}
                  </div>
                </div>

                {/* Attachment Notes (if populated) */}
                {action.attachmentNotes && (
                  <div
                    className="small text-muted mb-2 d-flex align-items-center gap-1"
                    data-testid={`action-attachment-notes-${action.id}`}
                  >
                    <span>📎</span>
                    <strong>Attachment Notes:</strong>
                    <span>{action.attachmentNotes}</span>
                  </div>
                )}

                {/* Follow-up Indicator & Callout */}
                <div className="mt-2">
                  {action.followUpRequired ? (
                    <div>
                      <span
                        className="badge"
                        style={{
                          backgroundColor: "#FEF3C7",
                          color: "#92400E",
                          border: "1px solid #FDE68A",
                        }}
                      >
                        ⚠️ Follow-up Required
                      </span>
                      {action.followUpNote && (
                        <div
                          className="action-followup-callout"
                          data-testid={`action-followup-note-${action.id}`}
                        >
                          <strong className="d-block small mb-1">Follow-up Note:</strong>
                          <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.9rem" }}>
                            {action.followUpNote}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <span
                      className="badge"
                      style={{
                        backgroundColor: "#F3F4F6",
                        color: "#4B5563",
                        border: "1px solid #E5E7EB",
                      }}
                    >
                      🟢 No Follow-up Needed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log / Edit Action Modal Dialog */}
      {!readOnly && isModalOpen && (
        <div
          className="action-modal-backdrop"
          data-testid="action-taken-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="action-modal-title"
        >
          <div className="action-modal-dialog">
            {/* Modal Header */}
            <div className="d-flex justify-content-between align-items-center border-bottom px-4 py-3">
              <h3 id="action-modal-title" className="h5 fw-bold mb-0 text-success" style={{ color: "var(--zen-primary-green)" }}>
                {modalMode === "CREATE" ? "Log New Action Taken" : "Edit Action Taken"}
              </h3>
              <button
                type="button"
                className="btn-close"
                aria-label="Close"
                onClick={handleCloseModal}
                disabled={isSubmitting}
              />
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} data-testid="action-taken-form" className="p-4">
              {/* Recoverable Server Error Banner (AC-19.2) */}
              {submitError && (
                <div
                  className="alert alert-danger py-2 px-3 small mb-3"
                  role="alert"
                  data-testid="action-form-error-alert"
                >
                  ⚠️ {submitError}
                </div>
              )}

              {/* Performer Card (Read-Only Identity) */}
              <div className="performer-display-card" data-testid="performer-display-card">
                <div className="d-flex align-items-center gap-2 mb-1">
                  <span className="small text-muted">👤 Performed by:</span>
                  <strong className="text-dark small">
                    {modalMode === "CREATE"
                      ? currentUser?.name || "IT Staff Resolver"
                      : editingAction?.performedBy?.name || "IT Staff Resolver"}
                  </strong>
                  <span
                    className="badge"
                    style={{
                      fontSize: "0.7rem",
                      backgroundColor: "var(--zen-pale-green)",
                      color: "var(--zen-primary-green)",
                      border: "1px solid #C4E5D2",
                    }}
                  >
                    {modalMode === "CREATE"
                      ? currentUser?.role || "IT_STAFF"
                      : editingAction?.performedBy?.role || "IT_STAFF"}
                  </span>
                </div>
                <div className="small text-muted" style={{ fontSize: "0.78rem" }}>
                  {modalMode === "CREATE"
                    ? "ℹ️ Auto-assigned from your session. This record will be permanently attributed."
                    : "ℹ️ Performer audit trail is permanent and cannot be modified."}
                </div>
              </div>

              {/* Action Date/Time */}
              <div className="mb-3">
                <label htmlFor="action-datetime-input" className="form-label small fw-semibold">
                  Action Date/Time <span className="text-danger">*</span>
                </label>
                <input
                  id="action-datetime-input"
                  type="datetime-local"
                  className={`form-control ${fieldErrors.actionDateTime ? "is-invalid" : ""}`}
                  value={formData.actionDateTime}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, actionDateTime: e.target.value }))
                  }
                  onBlur={handleDateBlur}
                  data-testid="action-datetime-input"
                />
                {fieldErrors.actionDateTime && (
                  <div className="zen-error-text" data-testid="error-action-datetime">
                    {fieldErrors.actionDateTime}
                  </div>
                )}
                <div className="form-text small text-muted">
                  Defaults to current local time. Cannot be in the future.
                </div>
              </div>

              {/* Action Description */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <label htmlFor="action-description-input" className="form-label small fw-semibold mb-1">
                    Action Description <span className="text-danger">*</span>
                  </label>
                  <span className="small text-muted">{formData.actionDescription.length}/1000 characters</span>
                </div>
                <textarea
                  id="action-description-input"
                  rows={3}
                  className={`form-control ${fieldErrors.actionDescription ? "is-invalid" : ""}`}
                  placeholder="Describe the physical or remote diagnostic action taken..."
                  maxLength={1000}
                  value={formData.actionDescription}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, actionDescription: e.target.value }))
                  }
                  data-testid="action-description-input"
                />
                {fieldErrors.actionDescription && (
                  <div className="zen-error-text" data-testid="error-action-description">
                    {fieldErrors.actionDescription}
                  </div>
                )}
              </div>

              {/* Result */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center">
                  <label htmlFor="action-result-input" className="form-label small fw-semibold mb-1">
                    Result <span className="text-danger">*</span>
                  </label>
                  <span className="small text-muted">{formData.result.length}/1000 characters</span>
                </div>
                <textarea
                  id="action-result-input"
                  rows={3}
                  className={`form-control ${fieldErrors.result ? "is-invalid" : ""}`}
                  placeholder="Document the immediate outcome or technical finding..."
                  maxLength={1000}
                  value={formData.result}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, result: e.target.value }))
                  }
                  data-testid="action-result-input"
                />
                {fieldErrors.result && (
                  <div className="zen-error-text" data-testid="error-action-result">
                    {fieldErrors.result}
                  </div>
                )}
              </div>

              {/* Follow-up Required Toggle */}
              <div className="mb-3 form-check">
                <input
                  type="checkbox"
                  id="followup-required-checkbox"
                  className="form-check-input"
                  checked={formData.followUpRequired}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setFormData((prev) => ({
                      ...prev,
                      followUpRequired: checked,
                      // Clear followUpNote when toggled OFF
                      followUpNote: checked ? prev.followUpNote : "",
                    }));
                    if (!checked) {
                      setFieldErrors((prev) => {
                        const copy = { ...prev };
                        delete copy.followUpNote;
                        return copy;
                      });
                    }
                  }}
                  data-testid="followup-required-checkbox"
                />
                <label
                  htmlFor="followup-required-checkbox"
                  className="form-check-label fw-semibold text-dark small"
                >
                  Follow-up Required?
                </label>
              </div>

              {/* Follow-up Note (Conditionally Rendered) */}
              {formData.followUpRequired && (
                <div className="mb-3" data-testid="followup-note-container">
                  <div className="d-flex justify-content-between align-items-center">
                    <label htmlFor="followup-note-input" className="form-label small fw-semibold text-warning-emphasis mb-1">
                      Follow-up Note <span className="text-danger">*</span>
                    </label>
                    <span className="small text-muted">{formData.followUpNote.length}/1000 characters</span>
                  </div>
                  <textarea
                    id="followup-note-input"
                    rows={2}
                    className={`form-control ${fieldErrors.followUpNote ? "is-invalid" : ""}`}
                    placeholder="Specify follow-up inspection, monitoring schedule, or further actions needed..."
                    maxLength={1000}
                    value={formData.followUpNote}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, followUpNote: e.target.value }))
                    }
                    data-testid="followup-note-input"
                  />
                  {fieldErrors.followUpNote && (
                    <div className="zen-error-text" data-testid="error-followup-note">
                      {fieldErrors.followUpNote}
                    </div>
                  )}
                </div>
              )}

              {/* Attachment Notes */}
              <div className="mb-4">
                <div className="d-flex justify-content-between align-items-center">
                  <label htmlFor="attachment-notes-input" className="form-label small fw-semibold mb-1">
                    Attachment Notes <span className="text-muted fw-normal">(Optional)</span>
                  </label>
                  <span className="small text-muted">{formData.attachmentNotes.length}/500 characters</span>
                </div>
                <input
                  id="attachment-notes-input"
                  type="text"
                  className={`form-control ${fieldErrors.attachmentNotes ? "is-invalid" : ""}`}
                  placeholder="e.g. Cross-referenced with photo switch_patch_bad.jpg in Attachments"
                  maxLength={500}
                  value={formData.attachmentNotes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, attachmentNotes: e.target.value }))
                  }
                  data-testid="attachment-notes-input"
                />
                {fieldErrors.attachmentNotes && (
                  <div className="zen-error-text" data-testid="error-attachment-notes">
                    {fieldErrors.attachmentNotes}
                  </div>
                )}
                <div className="form-text small text-muted">
                  Cross-reference uploaded files in Attachments or physical equipment labels.
                </div>
              </div>

              {/* Modal Actions */}
              <div className="d-flex justify-content-end gap-2 border-top pt-3">
                <button
                  type="button"
                  className="btn btn-zen-outline btn-sm px-3"
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                  data-testid="cancel-action-taken-btn"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-zen-primary btn-sm px-4 d-flex align-items-center"
                  disabled={isSubmitting}
                  data-testid="submit-action-taken-btn"
                >
                  {isSubmitting && (
                    <span
                      className="spinner-border spinner-border-sm me-2"
                      role="status"
                      aria-hidden="true"
                    />
                  )}
                  {isSubmitting ? "Saving..." : "Save Action Taken"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActionsTakenSection;

