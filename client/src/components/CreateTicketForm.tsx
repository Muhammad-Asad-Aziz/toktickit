import { useState, useEffect, ChangeEvent, FormEvent, DragEvent } from "react";
import {
  Category,
  RelatedSystem,
  Ticket,
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
} from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB = 5,242,880 bytes
const MAX_ATTACHMENTS = 5;
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

interface FormErrors {
  categoryId?: string;
  relatedSystemId?: string;
  requestedPriority?: string;
  summary?: string;
  description?: string;
}

interface CreateTicketFormProps {
  onViewTickets?: () => void;
}

export default function CreateTicketForm({ onViewTickets }: CreateTicketFormProps = {}) {
  const { currentRequester, openModal } = useRequester();

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [loadingRefData, setLoadingRefData] = useState(true);

  // Form input state
  const [categoryId, setCategoryId] = useState<string>("");
  const [relatedSystemId, setRelatedSystemId] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<string>("Medium");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);

  // UI interaction states
  const [errors, setErrors] = useState<FormErrors>({});
  const [fileWarning, setFileWarning] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdTicket, setCreatedTicket] = useState<Ticket | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Load Categories and Related Systems
  useEffect(() => {
    async function loadData() {
      setLoadingRefData(true);
      try {
        const [cats, systems] = await Promise.all([
          fetchCategories(),
          fetchRelatedSystems(),
        ]);
        setCategories(cats.filter((c) => c.isActive !== false));
        setRelatedSystems(systems.filter((s) => s.isActive !== false));
      } catch {
        setApiError("Unable to load ticket categories and related systems. Please refresh the page.");
      } finally {
        setLoadingRefData(false);
      }
    }
    loadData();
  }, []);

  // Format file size helper
  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Blur validation rule (BR-10, AGENTS.md §4)
  // Clears whitespace-only text on blur without premature error alerts
  function handleSummaryBlur() {
    if (summary.trim() === "") {
      setSummary("");
    }
  }

  function handleDescriptionBlur() {
    if (description.trim() === "") {
      setDescription("");
    }
  }

  // Handle incoming file selection & client-side boundary checks
  function processSelectedFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setFileWarning(null);

    const incoming = Array.from(files);
    const validToAdd: File[] = [];
    const warnings: string[] = [];

    for (const file of incoming) {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      const isTypeAllowed = ALLOWED_EXTENSIONS.includes(ext) || ALLOWED_MIME_TYPES.includes(file.type);

      if (!isTypeAllowed) {
        warnings.push(`File '${file.name}' rejected: unsupported format. Allowed types: JPG, PNG, WEBP, PDF.`);
        continue;
      }

      if (file.size > MAX_FILE_SIZE) {
        warnings.push(`File '${file.name}' rejected: exceeds the maximum allowed size of 5 MB.`);
        continue;
      }

      validToAdd.push(file);
    }

    if (stagedFiles.length + validToAdd.length > MAX_ATTACHMENTS) {
      warnings.push(`Maximum of ${MAX_ATTACHMENTS} attachments allowed per ticket. Some files were not added.`);
      const remainingSlots = MAX_ATTACHMENTS - stagedFiles.length;
      if (remainingSlots > 0) {
        setStagedFiles((prev) => [...prev, ...validToAdd.slice(0, remainingSlots)]);
      }
    } else {
      setStagedFiles((prev) => [...prev, ...validToAdd]);
    }

    if (warnings.length > 0) {
      setFileWarning(warnings.join(" "));
    }

  }

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    processSelectedFiles(e.target.files);
    e.target.value = ""; // Reset input so same file can be re-selected if removed
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    processSelectedFiles(e.dataTransfer.files);
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  function handleRemoveFile(index: number) {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
    setFileWarning(null);
  }

  function handleResetForm() {
    setCategoryId("");
    setRelatedSystemId("");
    setRequestedPriority("Medium");
    setSummary("");
    setDescription("");
    setStagedFiles([]);
    setErrors({});
    setFileWarning(null);
    setApiError(null);
    setCreatedTicket(null);
    setIsCopied(false);
  }

  // Copy Ticket Number to clipboard
  async function handleCopyTicketNumber() {
    if (!createdTicket) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(createdTicket.ticketNumber);
      }
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 3000);
    } catch {
      // Fallback if clipboard API fails
      setIsCopied(true);
    }
  }

  // Explicit form submission validation
  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setApiError(null);

    if (!currentRequester) {
      openModal();
      return;
    }

    const nextErrors: FormErrors = {};

    if (!categoryId) {
      nextErrors.categoryId = "Please select a Category.";
    }

    if (!relatedSystemId) {
      nextErrors.relatedSystemId = "Please select a Related System.";
    }

    const trimmedSummary = summary.trim();
    if (!trimmedSummary) {
      nextErrors.summary = "Ticket Summary is required.";
    } else if (trimmedSummary.length > 100) {
      nextErrors.summary = "Ticket Summary must not exceed 100 characters.";
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      nextErrors.description = "Detailed Description is required.";
    } else if (trimmedDescription.length < 10) {
      nextErrors.description = "Description must be at least 10 characters.";
    } else if (trimmedDescription.length > 2000) {
      nextErrors.description = "Description must not exceed 2000 characters.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    try {
      let result: Ticket;

      if (stagedFiles.length > 0) {
        // Multipart form-data submission with attachments
        const formData = new FormData();
        formData.append("requesterId", String(currentRequester.id));
        formData.append("categoryId", categoryId);
        formData.append("relatedSystemId", relatedSystemId);
        formData.append("requestedPriority", requestedPriority);
        formData.append("summary", trimmedSummary);
        formData.append("description", trimmedDescription);

        for (const file of stagedFiles) {
          formData.append("attachments", file);
        }

        result = await createTicket(formData);
      } else {
        // Pure JSON submission
        result = await createTicket({
          requesterId: currentRequester.id,
          categoryId: Number(categoryId),
          relatedSystemId: Number(relatedSystemId),
          requestedPriority,
          summary: trimmedSummary,
          description: trimmedDescription,
        });
      }

      setCreatedTicket(result);
    } catch (err: unknown) {
      const error = err as Error & { fieldErrors?: { field: string; message: string }[] };
      // Resilient Failure Recovery: Inputs in state are strictly PRESERVED!
      if (error.fieldErrors && error.fieldErrors.length > 0) {
        const backendErrors: FormErrors = {};
        for (const f of error.fieldErrors) {
          if (f.field === "summary") backendErrors.summary = f.message;
          if (f.field === "description") backendErrors.description = f.message;
          if (f.field === "categoryId") backendErrors.categoryId = f.message;
          if (f.field === "relatedSystemId") backendErrors.relatedSystemId = f.message;
        }
        setErrors(backendErrors);
      }
      setApiError(
        error.message || "Failed to submit ticket: Unable to connect to TokTickIT server. Your entered details have been preserved."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  // Success Confirmation Card (DR-16)
  if (createdTicket) {
    return (
      <div className="card shadow-sm border-0" style={{ borderRadius: 8 }}>
        <div className="card-body p-4 p-md-5 text-center">
          <div
            className="rounded-circle d-inline-flex align-items-center justify-content-center mb-3"
            style={{
              width: 72,
              height: 72,
              backgroundColor: "var(--zen-pale-green)",
              color: "var(--zen-primary-green)",
              fontSize: "2rem",
            }}
          >
            ✓
          </div>

          <h2 className="h3 fw-bold mb-2" style={{ color: "var(--zen-text-primary)" }}>
            Ticket Created Successfully!
          </h2>
          <p className="text-muted mb-4" style={{ maxWidth: 500, margin: "0 auto" }}>
            Your support request has been registered with the KMUTT IT Service Desk. Please save your official Ticket Number for reference.
          </p>

          <div
            className="p-3 mb-4 rounded-3 d-inline-block text-center border"
            style={{
              backgroundColor: "var(--zen-pale-green)",
              borderColor: "#C4E5D2",
              minWidth: 320,
            }}
          >
            <div className="small text-muted fw-semibold text-uppercase tracking-wide mb-1">
              Official Ticket Number
            </div>
            <div
              className="fs-2 fw-bold font-monospace"
              style={{ color: "var(--zen-primary-green)" }}
              data-testid="created-ticket-number"
            >
              {createdTicket.ticketNumber}
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-success mt-2"
              onClick={handleCopyTicketNumber}
              style={{ borderColor: "var(--zen-secondary-green)", color: "var(--zen-secondary-green)" }}
            >
              {isCopied ? "✓ Copied to Clipboard!" : "📋 Copy Ticket Number"}
            </button>
          </div>

          <div
            className="card bg-light border-0 p-3 mb-4 text-start mx-auto"
            style={{ maxWidth: 640, borderRadius: 6 }}
          >
            <div className="row g-2 small">
              <div className="col-sm-6">
                <strong>Status:</strong>{" "}
                <span className="badge bg-success-subtle text-success border border-success-subtle">
                  {createdTicket.currentStatus || "New"}
                </span>
              </div>
              <div className="col-sm-6">
                <strong>Requested Priority:</strong>{" "}
                <span className="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle">
                  {createdTicket.requestedPriority}
                </span>
              </div>
              <div className="col-sm-6">
                <strong>Category:</strong> {createdTicket.category?.name}
              </div>
              <div className="col-sm-6">
                <strong>Related System:</strong> {createdTicket.relatedSystem?.name}
              </div>
              <div className="col-12 mt-2">
                <strong>Summary:</strong> {createdTicket.summary}
              </div>
              {createdTicket.attachments?.length > 0 && (
                <div className="col-12 mt-1">
                  <strong>Attachments:</strong> {createdTicket.attachments.length} file(s) uploaded
                </div>
              )}
            </div>
          </div>

          <div className="d-flex justify-content-center gap-3">
            <button
              type="button"
              className="btn btn-zen-primary px-4 py-2"
              onClick={handleResetForm}
            >
              Create Another Ticket
            </button>
            {onViewTickets && (
              <button
                type="button"
                className="btn btn-zen-outline px-4 py-2"
                onClick={onViewTickets}
              >
                View in My Tickets ➔
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Create Ticket Form View
  return (
    <div className="card shadow-sm border-0" style={{ borderRadius: 8 }}>
      <div className="card-body p-4 p-md-4">
        <div className="d-flex align-items-center justify-content-between mb-3 border-bottom pb-3">
          <div>
            <h2 className="h4 mb-1 fw-bold" style={{ color: "var(--zen-primary-green)" }}>
              Create Support Ticket
            </h2>
            <p className="text-muted mb-0 small">
              Report an IT incident or request service assistance from the KMUTT Service Desk.
            </p>
          </div>
        </div>

        {/* Failure Recovery / Top Error Banner */}
        {apiError && (
          <div
            className="alert alert-danger d-flex align-items-center mb-4"
            role="alert"
            style={{ borderLeft: "4px solid var(--zen-error)" }}
          >
            <span className="me-2 fs-5" aria-hidden="true">⚠️</span>
            <div>
              <strong>Submission Notice:</strong> {apiError}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          {/* Read-Only Header Section */}
          <div
            className="p-3 mb-4 rounded-2 border"
            style={{ backgroundColor: "var(--zen-field-readonly-bg)", borderColor: "var(--zen-border-neutral)" }}
          >
            <div className="row g-3 small">
              <div className="col-md-4">
                <label className="form-label fw-bold text-secondary mb-1">Ticket Number:</label>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  className="form-control form-control-sm form-control-readonly text-muted"
                  value="TKT-YYYY-NNNNN (Generated upon submission)"
                />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-bold text-secondary mb-1">Ticket Date:</label>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  className="form-control form-control-sm form-control-readonly text-muted"
                  value={new Date().toISOString().split("T")[0] + " (Today)"}
                />
              </div>
              <div className="col-md-4">
                <label className="form-label fw-bold text-secondary mb-1">Requester:</label>
                <input
                  type="text"
                  readOnly
                  tabIndex={-1}
                  className="form-control form-control-sm form-control-readonly text-muted"
                  value={
                    currentRequester
                      ? `${currentRequester.name} (${currentRequester.email})`
                      : "No active requester selected"
                  }
                />
              </div>
            </div>
          </div>

          {/* Classification: Category & Related System Dropdowns */}
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label htmlFor="ticket-category" className="form-label fw-semibold mb-1">
                Category <span className="text-danger ms-1" aria-hidden="true">*</span>
              </label>
              {loadingRefData ? (
                <div className="zen-skeleton" style={{ height: 40 }} />
              ) : (
                <select
                  id="ticket-category"
                  className={`form-select ${errors.categoryId ? "is-invalid" : ""}`}
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    if (errors.categoryId) setErrors((prev) => ({ ...prev, categoryId: undefined }));
                  }}
                  disabled={isSubmitting}
                  style={{ height: 40, borderRadius: 6 }}
                >
                  <option value="">-- Select Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.categoryId && (
                <div className="zen-error-text" role="alert">
                  <span className="me-1">⚠️</span> {errors.categoryId}
                </div>
              )}
            </div>

            <div className="col-md-6">
              <label htmlFor="ticket-system" className="form-label fw-semibold mb-1">
                Related System <span className="text-danger ms-1" aria-hidden="true">*</span>
              </label>
              {loadingRefData ? (
                <div className="zen-skeleton" style={{ height: 40 }} />
              ) : (
                <select
                  id="ticket-system"
                  className={`form-select ${errors.relatedSystemId ? "is-invalid" : ""}`}
                  value={relatedSystemId}
                  onChange={(e) => {
                    setRelatedSystemId(e.target.value);
                    if (errors.relatedSystemId) setErrors((prev) => ({ ...prev, relatedSystemId: undefined }));
                  }}
                  disabled={isSubmitting}
                  style={{ height: 40, borderRadius: 6 }}
                >
                  <option value="">-- Select Related System --</option>
                  {relatedSystems.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}
              {errors.relatedSystemId && (
                <div className="zen-error-text" role="alert">
                  <span className="me-1">⚠️</span> {errors.relatedSystemId}
                </div>
              )}
            </div>
          </div>

          {/* Requested Priority Selection (DR-03, Zen Green Badges) */}
          <div className="mb-3">
            <label className="form-label fw-semibold mb-1">
              Requested Priority <span className="text-danger ms-1" aria-hidden="true">*</span>
            </label>
            <div className="priority-pill-group" role="radiogroup" aria-label="Requested Priority">
              {(["Low", "Medium", "High", "Urgent"] as const).map((p) => {
                const isActive = requestedPriority === p;
                const lower = p.toLowerCase();
                return (
                  <button
                    key={p}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    disabled={isSubmitting}
                    className={`priority-pill priority-${lower} ${isActive ? "active" : ""}`}
                    onClick={() => setRequestedPriority(p)}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ticket Summary */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="ticket-summary" className="form-label fw-semibold mb-0">
                Ticket Summary <span className="text-danger ms-1" aria-hidden="true">*</span>
              </label>
              <span className="text-muted small">{summary.length} / 100</span>
            </div>
            <input
              type="text"
              id="ticket-summary"
              className={`form-control ${errors.summary ? "is-invalid" : ""}`}
              placeholder="e.g. Cannot connect to campus Wi-Fi in building SCL"
              maxLength={100}
              value={summary}
              onChange={(e) => {
                setSummary(e.target.value);
                if (errors.summary) setErrors((prev) => ({ ...prev, summary: undefined }));
              }}
              onBlur={handleSummaryBlur}
              disabled={isSubmitting}
              style={{ height: 40, borderRadius: 6 }}
            />
            {errors.summary ? (
              <div className="zen-error-text" role="alert">
                <span className="me-1">⚠️</span> {errors.summary}
              </div>
            ) : (
              <div className="form-text text-muted small">
                Provide a concise description of the issue (max 100 characters).
              </div>
            )}
          </div>

          {/* Detailed Description */}
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="ticket-description" className="form-label fw-semibold mb-0">
                Detailed Description <span className="text-danger ms-1" aria-hidden="true">*</span>
              </label>
              <span className="text-muted small">{description.length} / 2000</span>
            </div>
            <textarea
              id="ticket-description"
              className={`form-control ${errors.description ? "is-invalid" : ""}`}
              rows={4}
              placeholder="Provide exact error messages, room number, steps to reproduce, or affected hardware details..."
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
              }}
              onBlur={handleDescriptionBlur}
              disabled={isSubmitting}
              style={{ minHeight: 120, borderRadius: 6, resize: "vertical" }}
            />
            {errors.description ? (
              <div className="zen-error-text" role="alert">
                <span className="me-1">⚠️</span> {errors.description}
              </div>
            ) : (
              <div className="form-text text-muted small">
                Minimum 10 characters required. Include any relevant diagnostic details.
              </div>
            )}
          </div>

          {/* Supporting Attachments (Optional) */}
          <div className="mb-4">
            <label className="form-label fw-semibold mb-1">
              Supporting Attachments <span className="text-muted fw-normal">(Optional, max 5 files, 5 MB each)</span>
            </label>

            {fileWarning && (
              <div className="alert alert-warning py-2 px-3 small d-flex justify-content-between align-items-center mb-2">
                <span>{fileWarning}</span>
                <button
                  type="button"
                  className="btn-close btn-sm"
                  aria-label="Close warning"
                  onClick={() => setFileWarning(null)}
                />
              </div>
            )}

            <div
              className="p-3 border border-2 border-dashed rounded-3 text-center"
              style={{
                backgroundColor: "var(--zen-page-bg)",
                borderColor: "var(--zen-border-neutral)",
                cursor: stagedFiles.length >= MAX_ATTACHMENTS || isSubmitting ? "not-allowed" : "pointer",
              }}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => {
                if (stagedFiles.length < MAX_ATTACHMENTS && !isSubmitting) {
                  document.getElementById("attachment-file-input")?.click();
                }
              }}
            >
              <input
                type="file"
                id="attachment-file-input"
                className="d-none"
                multiple
                accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
                disabled={stagedFiles.length >= MAX_ATTACHMENTS || isSubmitting}
                onChange={handleFileChange}
              />
              <div className="py-2">
                <span className="fs-3 d-block mb-1">📁</span>
                <div className="fw-semibold text-secondary">
                  {stagedFiles.length >= MAX_ATTACHMENTS
                    ? "Maximum attachment limit reached (5 files)"
                    : "Drag & drop files here, or click to browse"}
                </div>
                <div className="text-muted small mt-1">
                  Accepted formats: JPG, PNG, WEBP, PDF (Max 5 MB per file)
                </div>
              </div>
            </div>

            {/* Staged files list */}
            {stagedFiles.length > 0 && (
              <div className="mt-2">
                <div className="small fw-semibold text-secondary mb-1">
                  Staged Files ({stagedFiles.length} of {MAX_ATTACHMENTS}):
                </div>
                <ul className="list-group list-group-flush border rounded-2">
                  {stagedFiles.map((file, idx) => (
                    <li
                      key={`${file.name}-${idx}`}
                      className="list-group-item d-flex justify-content-between align-items-center py-2 px-3 small"
                    >
                      <div className="d-flex align-items-center text-truncate me-2">
                        <span className="me-2">{file.type.includes("pdf") ? "📄" : "🖼️"}</span>
                        <span className="text-truncate fw-medium">{file.name}</span>
                        <span className="text-muted ms-2">({formatBytes(file.size)})</span>
                      </div>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger py-0 px-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(idx);
                        }}
                        disabled={isSubmitting}
                        aria-label={`Remove ${file.name}`}
                      >
                        ✕ Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="d-flex justify-content-between align-items-center pt-3 border-top">
            <button
              type="button"
              className="btn btn-zen-outline px-3"
              onClick={handleResetForm}
              disabled={isSubmitting}
            >
              Reset Form
            </button>

            <button
              type="submit"
              className="btn btn-zen-primary px-4 py-2"
              disabled={isSubmitting || !currentRequester}
              style={{ minWidth: 160 }}
            >
              {isSubmitting ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                  >
                    <span className="visually-hidden">Loading...</span>
                  </span>
                  Submitting…
                </>
              ) : (
                "Submit Ticket ➔"
              )}
            </button>

          </div>
        </form>
      </div>
    </div>
  );
}
