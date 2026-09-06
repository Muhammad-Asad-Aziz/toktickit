import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import AttachmentSection from "../../src/components/AttachmentSection.js";

const mockActiveAttachment: api.Attachment = {
  id: 1,
  ticketId: 101,
  originalFilename: "network_screenshot.png",
  mimeType: "image/png",
  fileSize: 204800, // 200 KB
  isRemoved: false,
  isDeleted: false,
  createdAt: "2026-09-01T10:00:00.000Z",
};

const mockRemovedAttachment: api.Attachment = {
  id: 2,
  ticketId: 101,
  originalFilename: "outdated_log.pdf",
  mimeType: "application/pdf",
  fileSize: 512000, // 500 KB
  isRemoved: true,
  isDeleted: false,
  removalReason: "Superceded by fresh trace logs collected with technician.",
  removedAt: "2026-09-01T14:30:00.000Z",
  removedByRequesterId: 1,
  createdAt: "2026-09-01T10:05:00.000Z",
};

describe("Feature 9: AttachmentSection Component (STS UI-ATT-01 to UI-ATT-08)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("UI-ATT-01: displays list of active attachments with filename, formatted file size, download and remove buttons", () => {
    render(
      <AttachmentSection
        ticketId={101}
        attachments={[mockActiveAttachment]}
        onAttachmentUploaded={vi.fn()}
        onAttachmentRemoved={vi.fn()}
        requesterId={1}
      />
    );

    expect(screen.getByText("network_screenshot.png")).toBeInTheDocument();
    expect(screen.getByText(/200 KB/i)).toBeInTheDocument();
    expect(screen.getByTestId("download-btn-1")).toBeInTheDocument();
    expect(screen.getByTestId("remove-btn-1")).toBeInTheDocument();
    expect(screen.getByTestId("attachment-count-badge")).toHaveTextContent("1 / 5 Active");
  });

  it("UI-ATT-02: displays soft-removed attachments (tombstones, DR-20) with shaded background, strikethrough, 'Removed' badge, reason, and download disabled/omitted", () => {
    render(
      <AttachmentSection
        ticketId={101}
        attachments={[mockActiveAttachment, mockRemovedAttachment]}
        onAttachmentUploaded={vi.fn()}
        onAttachmentRemoved={vi.fn()}
        requesterId={1}
      />
    );

    const tombstone = screen.getByTestId("tombstone-row-2");
    expect(tombstone).toBeInTheDocument();
    expect(screen.getByText("outdated_log.pdf")).toBeInTheDocument();
    expect(screen.getByTestId("removed-badge-2")).toHaveTextContent("Removed");
    expect(screen.getByText(/Superceded by fresh trace logs/i)).toBeInTheDocument();

    // DR-20: Confirm download button and remove button are omitted for soft-removed attachments
    expect(screen.queryByTestId("download-btn-2")).toBeNull();
    expect(screen.queryByTestId("remove-btn-2")).toBeNull();
  });

  it("UI-ATT-03: opens RemoveAttachmentModal upon clicking 'Remove' on an active attachment", async () => {
    const user = userEvent.setup();
    render(
      <AttachmentSection
        ticketId={101}
        attachments={[mockActiveAttachment]}
        onAttachmentUploaded={vi.fn()}
        onAttachmentRemoved={vi.fn()}
        requesterId={1}
      />
    );

    await user.click(screen.getByTestId("remove-btn-1"));

    expect(screen.getByTestId("remove-attachment-modal")).toBeInTheDocument();
    expect(screen.getByTestId("modal-filename")).toHaveTextContent("network_screenshot.png");
    expect(screen.getByTestId("removal-reason-input")).toBeInTheDocument();
    expect(screen.getByTestId("confirm-remove-btn")).toBeInTheDocument();
  });

  it("UI-ATT-04: enforces blur clearing on invalid removal reason input (<3 characters), and displays error only on submit", async () => {
    const user = userEvent.setup();
    render(
      <AttachmentSection
        ticketId={101}
        attachments={[mockActiveAttachment]}
        onAttachmentUploaded={vi.fn()}
        onAttachmentRemoved={vi.fn()}
        requesterId={1}
      />
    );

    await user.click(screen.getByTestId("remove-btn-1"));

    const textarea = screen.getByTestId("removal-reason-input") as HTMLTextAreaElement;

    // Type 2 characters (< 3 characters minimum)
    await user.type(textarea, "ab");
    expect(textarea.value).toBe("ab");

    // Blur rule: fields with invalid inputs clear on blur
    fireEvent.blur(textarea);
    expect(textarea.value).toBe("");

    // Click confirm without entering valid reason -> submission-level validation error appears
    await user.click(screen.getByTestId("confirm-remove-btn"));
    expect(screen.getByTestId("removal-reason-error")).toHaveTextContent(/minimum 3 characters/i);
  });

  it("UI-ATT-05: successfully submits removal with valid reason, calls API, and invokes onAttachmentRemoved", async () => {
    const user = userEvent.setup();
    const handleRemoved = vi.fn();
    const softRemoveSpy = vi.spyOn(api, "softRemoveAttachment").mockResolvedValue({
      success: true,
      attachment: {
        ...mockActiveAttachment,
        isRemoved: true,
        removalReason: "Uploaded wrong configuration file by mistake",
        removedAt: "2026-09-01T15:00:00.000Z",
        removedByRequesterId: 1,
      },
    });

    render(
      <AttachmentSection
        ticketId={101}
        attachments={[mockActiveAttachment]}
        onAttachmentUploaded={vi.fn()}
        onAttachmentRemoved={handleRemoved}
        requesterId={1}
      />
    );

    await user.click(screen.getByTestId("remove-btn-1"));

    const textarea = screen.getByTestId("removal-reason-input");
    await user.type(textarea, "Uploaded wrong configuration file by mistake");

    await user.click(screen.getByTestId("confirm-remove-btn"));

    await waitFor(() => {
      expect(softRemoveSpy).toHaveBeenCalledWith(
        1,
        "Uploaded wrong configuration file by mistake",
        1
      );
      expect(handleRemoved).toHaveBeenCalled();
    });

    // Modal closes
    expect(screen.queryByTestId("remove-attachment-modal")).toBeNull();
  });

  it("UI-ATT-06: enforces 5 active attachments ceiling: disables 'Add Attachment' button and displays warning notice", () => {
    const fiveActiveAttachments: api.Attachment[] = [1, 2, 3, 4, 5].map((id) => ({
      id,
      ticketId: 101,
      originalFilename: `file_${id}.png`,
      mimeType: "image/png",
      fileSize: 102400,
      isRemoved: false,
      createdAt: "2026-09-01T10:00:00.000Z",
    }));

    render(
      <AttachmentSection
        ticketId={101}
        attachments={fiveActiveAttachments}
        onAttachmentUploaded={vi.fn()}
        onAttachmentRemoved={vi.fn()}
        requesterId={1}
      />
    );

    expect(screen.getByTestId("attachment-count-badge")).toHaveTextContent("5 / 5 Active");
    expect(screen.getByTestId("add-attachment-btn")).toBeDisabled();
    expect(screen.getByTestId("limit-reached-alert")).toBeInTheDocument();
  });

  it("UI-ATT-07: enforces client-side validation on file upload: rejects file > 5MB and invalid file types without calling API", async () => {
    const uploadSpy = vi.spyOn(api, "uploadAttachment");

    render(
      <AttachmentSection
        ticketId={101}
        attachments={[mockActiveAttachment]}
        onAttachmentUploaded={vi.fn()}
        onAttachmentRemoved={vi.fn()}
        requesterId={1}
      />
    );

    const fileInput = screen.getByTestId("file-upload-input");

    // Test 1: File > 5MB
    const oversizedFile = new File(["x".repeat(100)], "oversized.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(oversizedFile, "size", { value: 6 * 1024 * 1024 }); // 6 MB

    fireEvent.change(fileInput, { target: { files: [oversizedFile] } });

    expect(screen.getByTestId("upload-error-alert")).toHaveTextContent(/exceeds 5MB/i);
    expect(uploadSpy).not.toHaveBeenCalled();

    // Test 2: Invalid file extension / MIME
    const invalidFile = new File(["binary"], "script.exe", {
      type: "application/x-msdownload",
    });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(screen.getByTestId("upload-error-alert")).toHaveTextContent(/Invalid file type/i);
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  it("UI-ATT-08: soft-removed tombstones do not count against the 5 active attachments ceiling", () => {
    // 3 active attachments + 3 soft-removed tombstones = 6 total rows in DB
    const mixedAttachments: api.Attachment[] = [
      { id: 1, originalFilename: "a1.png", mimeType: "image/png", fileSize: 100, isRemoved: false, createdAt: "2026-09-01T10:00:00Z" },
      { id: 2, originalFilename: "a2.png", mimeType: "image/png", fileSize: 100, isRemoved: false, createdAt: "2026-09-01T10:00:00Z" },
      { id: 3, originalFilename: "a3.png", mimeType: "image/png", fileSize: 100, isRemoved: false, createdAt: "2026-09-01T10:00:00Z" },
      { id: 4, originalFilename: "r1.png", mimeType: "image/png", fileSize: 100, isRemoved: true, removalReason: "r1", createdAt: "2026-09-01T10:00:00Z" },
      { id: 5, originalFilename: "r2.png", mimeType: "image/png", fileSize: 100, isRemoved: true, removalReason: "r2", createdAt: "2026-09-01T10:00:00Z" },
      { id: 6, originalFilename: "r3.png", mimeType: "image/png", fileSize: 100, isRemoved: true, removalReason: "r3", createdAt: "2026-09-01T10:00:00Z" },
    ];

    render(
      <AttachmentSection
        ticketId={101}
        attachments={mixedAttachments}
        onAttachmentUploaded={vi.fn()}
        onAttachmentRemoved={vi.fn()}
        requesterId={1}
      />
    );

    // Active count is 3 / 5
    expect(screen.getByTestId("attachment-count-badge")).toHaveTextContent("3 / 5 Active");
    // Button is enabled
    expect(screen.getByTestId("add-attachment-btn")).not.toBeDisabled();
    // No limit-reached warning
    expect(screen.queryByTestId("limit-reached-alert")).toBeNull();
  });
});
