import { useState, useRef, ChangeEvent } from "react";
import {
  Attachment,
  uploadAttachment,
  downloadAttachment,
  softRemoveAttachment,
} from "../api.js";
import RemoveAttachmentModal from "./RemoveAttachmentModal.js";

interface AttachmentSectionProps {
  ticketId: number;
  attachments: Attachment[];
  onAttachmentUploaded: (attachment: Attachment) => void;
  onAttachmentRemoved: (attachment: Attachment) => void;
  requesterId?: number;
}

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDateTime(isoString?: string | null): string {
  if (!isoString) return "—";
  try {
    const d = new Date(isoString);
    return `${d.toISOString().split("T")[0]} ${d.toTimeString().split(" ")[0].slice(0, 5)}`;
  } catch {
    return isoString;
  }
}

export default function AttachmentSection({
  ticketId,
  attachments,
  onAttachmentUploaded,
  onAttachmentRemoved,
  requesterId,
}: AttachmentSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  // Modal State
  const [selectedForRemoval, setSelectedForRemoval] = useState<Attachment | null>(null);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  // Split attachments into active vs soft-removed tombstones
  const activeAttachments = attachments.filter(
    (a) => !a.isRemoved && !a.isDeleted
  );
  const removedAttachments = attachments.filter(
    (a) => a.isRemoved || a.isDeleted
  );

  const activeCount = activeAttachments.length;
  const isLimitReached = activeCount >= MAX_ATTACHMENTS;

  const handleChooseFileClick = () => {
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploadError(null);

    // Client-side validation: Active files ceiling check
    if (activeCount >= MAX_ATTACHMENTS) {
      setUploadError("Maximum 5 active attachments per ticket reached.");
      return;
    }

    // Client-side validation: File size (<= 5MB)
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setUploadError("File size exceeds 5MB limit. Please select a smaller file.");
      return;
    }

    // Client-side validation: File type / extension
    const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
    const isValidType =
      ALLOWED_MIME_TYPES.includes(file.type) || ALLOWED_EXTENSIONS.includes(extension);

    if (!isValidType) {
      setUploadError("Invalid file type. Only JPG, PNG, WEBP, and PDF files are allowed.");
      return;
    }

    if (!requesterId) {
      setUploadError("No active requester context. Please select a requester.");
      return;
    }

    setIsUploading(true);
    try {
      const uploaded = await uploadAttachment(ticketId, file, requesterId);
      onAttachmentUploaded(uploaded);
    } catch (err: unknown) {
      setUploadError(
        (err as Error).message || "Failed to upload file. Please try again."
      );
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDownload = async (attachment: Attachment) => {
    if (!requesterId) {
      setUploadError("No active requester context.");
      return;
    }

    setDownloadingId(attachment.id);
    try {
      await downloadAttachment(attachment.id, attachment.originalFilename, requesterId);
    } catch (err: unknown) {
      setUploadError((err as Error).message || "Download failed.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleConfirmRemoval = async (removalReason: string) => {
    if (!selectedForRemoval || !requesterId) return;

    const targetAttachment = selectedForRemoval;
    setIsRemoving(true);
    try {
      const result = await softRemoveAttachment(
        targetAttachment.id,
        removalReason,
        requesterId
      );

      // Support either direct Attachment, or { attachment: Attachment } wrapper
      const payload: Partial<Attachment> = (result as any)?.attachment || result || {};

      const updatedAttachment: Attachment = {
        ...targetAttachment,
        ...payload,
        id: targetAttachment.id,
        isRemoved: true,
        isDeleted: true,
        removalReason: payload.removalReason || removalReason,
        removedAt: payload.removedAt || new Date().toISOString(),
      };

      onAttachmentRemoved(updatedAttachment);
      setSelectedForRemoval(null);
    } catch (err: unknown) {
      setUploadError((err as Error).message || "Failed to remove attachment.");
      throw err;
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: 8 }} data-testid="attachments-section">
      <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <h2 className="h6 fw-bold mb-0" style={{ color: "var(--zen-primary-green)" }}>
            Attachments
          </h2>
          <span
            className="badge rounded-pill bg-light text-dark border small"
            data-testid="attachment-count-badge"
          >
            {activeCount} / {MAX_ATTACHMENTS} Active
          </span>
        </div>

        {/* Action Button & Hidden Input */}
        <div>
          <input
            ref={fileInputRef}
            type="file"
            className="d-none"
            accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
            onChange={handleFileSelected}
            data-testid="file-upload-input"
          />
          <button
            type="button"
            className="btn btn-zen-primary btn-sm px-3 d-inline-flex align-items-center gap-1"
            disabled={isLimitReached || isUploading}
            onClick={handleChooseFileClick}
            data-testid="add-attachment-btn"
            title={isLimitReached ? "Maximum 5 active attachments allowed" : "Add an attachment"}
          >
            {isUploading ? (
              <>
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                <span>Uploading…</span>
              </>
            ) : (
              <>
                <span aria-hidden="true">📎</span>
                <span>Add Attachment</span>
              </>
            )}
          </button>
        </div>
      </div>

      <div className="card-body p-4">
        {/* Validation or Upload Error Banner */}
        {uploadError && (
          <div
            className="alert alert-danger d-flex align-items-center justify-content-between py-2 px-3 mb-3 small"
            role="alert"
            data-testid="upload-error-alert"
          >
            <div className="d-flex align-items-center gap-2">
              <span aria-hidden="true">⚠️</span>
              <span>{uploadError}</span>
            </div>
            <button
              type="button"
              className="btn-close btn-sm"
              aria-label="Close"
              onClick={() => setUploadError(null)}
            />
          </div>
        )}

        {/* Limit Reached Callout */}
        {isLimitReached && (
          <div
            className="alert alert-warning py-2 px-3 mb-3 small d-flex align-items-center gap-2"
            data-testid="limit-reached-alert"
          >
            <span aria-hidden="true">ℹ️</span>
            <span>
              Attachment limit reached (5 active files). To upload new files, remove an existing attachment.
            </span>
          </div>
        )}

        {/* Active Attachments List */}
        <div className="mb-4">
          <h3 className="h6 fw-semibold text-muted mb-2 small text-uppercase" style={{ letterSpacing: "0.04em" }}>
            Active Files ({activeCount})
          </h3>

          {activeAttachments.length === 0 ? (
            <div className="p-3 text-center text-muted small rounded border border-dashed" data-testid="no-active-attachments">
              No active attachments uploaded for this ticket.
            </div>
          ) : (
            <div className="d-flex flex-column gap-2" data-testid="active-attachments-list">
              {activeAttachments.map((att) => (
                <div
                  key={att.id}
                  className="d-flex justify-content-between align-items-center p-3 rounded border bg-white"
                  data-testid={`attachment-row-${att.id}`}
                >
                  <div className="d-flex align-items-center gap-3 overflow-hidden me-2">
                    <div
                      className="rounded d-flex align-items-center justify-content-center flex-shrink-0"
                      style={{ width: 36, height: 36, backgroundColor: "var(--zen-pale-green)", color: "var(--zen-primary-green)" }}
                      aria-hidden="true"
                    >
                      📎
                    </div>
                    <div className="overflow-hidden">
                      <div className="fw-semibold text-dark text-truncate" title={att.originalFilename}>
                        {att.originalFilename}
                      </div>
                      <div className="text-muted small">
                        {formatBytes(att.fileSize || att.sizeBytes)} • Uploaded {formatDateTime(att.createdAt || att.uploadedAt)}
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      className="btn btn-zen-outline btn-sm px-2 py-1 d-inline-flex align-items-center gap-1"
                      disabled={downloadingId === att.id}
                      onClick={() => handleDownload(att)}
                      data-testid={`download-btn-${att.id}`}
                      aria-label={`Download ${att.originalFilename}`}
                    >
                      {downloadingId === att.id ? (
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true" />
                      ) : (
                        <span aria-hidden="true">⬇️</span>
                      )}
                      <span className="d-none d-sm-inline">Download</span>
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm px-2 py-1 d-inline-flex align-items-center gap-1"
                      onClick={() => setSelectedForRemoval(att)}
                      data-testid={`remove-btn-${att.id}`}
                      aria-label={`Remove ${att.originalFilename}`}
                    >
                      <span aria-hidden="true">🗑️</span>
                      <span className="d-none d-sm-inline">Remove</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Soft-Removed Attachments Tombstones (DR-20) */}
        {removedAttachments.length > 0 && (
          <div>
            <h3 className="h6 fw-semibold text-muted mb-2 small text-uppercase" style={{ letterSpacing: "0.04em" }}>
              Removed Attachments Audit Log ({removedAttachments.length})
            </h3>
            <div className="d-flex flex-column gap-2" data-testid="removed-attachments-list">
              {removedAttachments.map((att) => (
                <div
                  key={att.id}
                  className="p-3 rounded border"
                  style={{ backgroundColor: "var(--zen-field-readonly-bg)", borderColor: "var(--zen-border-neutral)" }}
                  data-testid={`tombstone-row-${att.id}`}
                >
                  <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-1">
                    <div className="d-flex align-items-center gap-2">
                      <span className="text-muted text-decoration-line-through fw-semibold text-break">
                        {att.originalFilename}
                      </span>
                      <span className="badge bg-secondary text-white small" data-testid={`removed-badge-${att.id}`}>
                        Removed
                      </span>
                    </div>
                    <span className="text-muted small">
                      {formatBytes(att.fileSize || att.sizeBytes)}
                    </span>
                  </div>

                  <div className="small text-muted mt-1">
                    <div>
                      <strong>Removed:</strong> {formatDateTime(att.removedAt)}
                    </div>
                    <div className="mt-1">
                      <strong>Reason:</strong>{" "}
                      <span className="fst-italic text-dark">"{att.removalReason || "No explanation provided"}"</span>
                    </div>
                  </div>

                  <div className="mt-2 text-muted small fst-italic" style={{ fontSize: "12px" }}>
                    🔒 File download disabled permanently per security policy.
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Remove Confirmation Modal */}
      <RemoveAttachmentModal
        isOpen={Boolean(selectedForRemoval)}
        attachment={selectedForRemoval}
        onClose={() => setSelectedForRemoval(null)}
        onConfirm={handleConfirmRemoval}
        isSubmitting={isRemoving}
      />
    </div>
  );
}
