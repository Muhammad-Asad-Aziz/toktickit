import { useState, useEffect, FormEvent, FocusEvent } from "react";
import { Attachment } from "../api.js";

interface RemoveAttachmentModalProps {
  isOpen: boolean;
  attachment: Attachment | null;
  onClose: () => void;
  onConfirm: (removalReason: string) => Promise<void>;
  isSubmitting?: boolean;
}

export default function RemoveAttachmentModal({
  isOpen,
  attachment,
  onClose,
  onConfirm,
  isSubmitting = false,
}: RemoveAttachmentModalProps) {
  const [removalReason, setRemovalReason] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset state when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setRemovalReason("");
      setErrorMessage(null);
    }
  }, [isOpen, attachment]);

  // Handle ESC key to close modal
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        handleCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isSubmitting]);

  if (!isOpen || !attachment) {
    return null;
  }

  // Work Norm: Fields with invalid inputs during general data entry must clear/blank out on blur.
  // Form-level validation messages are only triggered upon clicking the explicit Save/Submit button.
  const handleBlur = (_e: FocusEvent<HTMLTextAreaElement>) => {
    const trimmed = removalReason.trim();
    if (trimmed.length > 0 && trimmed.length < 3) {
      setRemovalReason("");
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const trimmed = removalReason.trim();

    if (!trimmed || trimmed.length < 3) {
      setErrorMessage("Removal reason is required (minimum 3 characters).");
      return;
    }

    if (trimmed.length > 250) {
      setErrorMessage("Removal reason cannot exceed 250 characters.");
      return;
    }

    setErrorMessage(null);
    try {
      await onConfirm(trimmed);
    } catch (err: unknown) {
      setErrorMessage(
        (err as Error).message || "Failed to remove attachment. Please try again."
      );
    }
  };

  const handleCancel = () => {
    setRemovalReason("");
    setErrorMessage(null);
    onClose();
  };

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      aria-modal="true"
      aria-labelledby="remove-attachment-title"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.5)", zIndex: 1060 }}
      data-testid="remove-attachment-modal"
    >
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className="modal-content shadow-lg border-0" style={{ borderRadius: 8 }}>
          {/* Header */}
          <div className="modal-header border-bottom py-3 px-4" style={{ backgroundColor: "#FEE2E2" }}>
            <h5 className="modal-title h6 fw-bold text-danger d-flex align-items-center gap-2 mb-0" id="remove-attachment-title">
              <span aria-hidden="true">⚠️</span>
              Confirm Attachment Removal
            </h5>
            <button
              type="button"
              className="btn-close"
              aria-label="Close"
              disabled={isSubmitting}
              onClick={handleCancel}
              data-testid="modal-close-x-btn"
            />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            {/* Body */}
            <div className="modal-body p-4">
              <p className="text-muted small mb-3">
                Soft-removing this attachment permanently deletes the physical file binary from the server
                and disables downloads for all users. An immutable tombstone record will be retained in the audit history.
              </p>

              {/* Target File Info */}
              <div
                className="p-3 mb-3 rounded"
                style={{ backgroundColor: "var(--zen-field-readonly-bg)", border: "1px solid var(--zen-border-neutral)" }}
              >
                <div className="small text-muted mb-1">Target Attachment:</div>
                <div className="fw-semibold text-dark text-break" data-testid="modal-filename">
                  📎 {attachment.originalFilename}
                </div>
              </div>

              {/* Removal Reason Input */}
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <label htmlFor="removal-reason-input" className="form-label small fw-semibold mb-0">
                    Reason for Removal <span className="text-danger">*</span>
                  </label>
                  <span className="text-muted small" data-testid="character-counter">
                    {removalReason.length}/250
                  </span>
                </div>
                <textarea
                  id="removal-reason-input"
                  name="removalReason"
                  className={`form-control ${errorMessage ? "is-invalid" : ""}`}
                  rows={3}
                  maxLength={250}
                  placeholder="Provide a clear explanation for why this file is being removed..."
                  value={removalReason}
                  onChange={(e) => {
                    setRemovalReason(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  onBlur={handleBlur}
                  disabled={isSubmitting}
                  data-testid="removal-reason-input"
                  aria-describedby={errorMessage ? "removal-reason-error" : undefined}
                />
                {errorMessage && (
                  <div
                    id="removal-reason-error"
                    className="zen-error-text"
                    data-testid="removal-reason-error"
                  >
                    <span aria-hidden="true" className="me-1">⚠️</span>
                    {errorMessage}
                  </div>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="modal-footer bg-light border-top px-4 py-3 d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-zen-outline px-3"
                disabled={isSubmitting}
                onClick={handleCancel}
                data-testid="cancel-remove-btn"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-danger px-4 fw-semibold"
                disabled={isSubmitting}
                data-testid="confirm-remove-btn"
              >
                {isSubmitting ? "Removing…" : "Confirm Removal"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
