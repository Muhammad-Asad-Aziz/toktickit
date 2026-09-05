import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import * as api from "../../src/api.js";
import App from "../../src/App.js";

const mockActiveRequester: api.RequesterUser = {
  id: 1,
  name: "Sompong IT",
  email: "sompong.it@kmutt.ac.th",
  department: "Information Technology Office",
  isActive: true,
  createdAt: "2026-09-01T08:00:00.000Z",
};

const mockCategories: api.Category[] = [
  { id: 1, name: "Account and Access", code: "ACC", isActive: true },
  { id: 2, name: "Hardware", code: "HW", isActive: true },
  { id: 3, name: "Software", code: "SW", isActive: true },
  { id: 4, name: "Network", code: "NET", isActive: true },
];

const mockSystems: api.RelatedSystem[] = [
  { id: 1, name: "Campus Wi-Fi", isActive: true },
  { id: 2, name: "Email", isActive: true },
  { id: 3, name: "VPN", isActive: true },
  { id: 4, name: "LEB2 App", isActive: true },
  { id: 5, name: "Grade Submission App", isActive: true },
  { id: 6, name: "Printer", isActive: true },
];

describe("Feature 7 / Feature 3: Create Ticket Form & Validation Component Tests", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_current_requester", JSON.stringify(mockActiveRequester));
    vi.restoreAllMocks();

    // Default mock resolvers
    vi.spyOn(api, "fetchRequesters").mockResolvedValue([mockActiveRequester]);
    vi.spyOn(api, "fetchCategories").mockResolvedValue(mockCategories);
    vi.spyOn(api, "fetchRelatedSystems").mockResolvedValue(mockSystems);

    // Mock clipboard API in JSDOM
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  // UI-TKT-01: Read-Only Header Population
  it("UI-TKT-01: Pre-fills read-only header with generated number placeholder and active requester info", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByDisplayValue(/TKT-YYYY-NNNNN \(Generated upon submission\)/i)).toBeInTheDocument();
      expect(screen.getByDisplayValue(/Sompong IT \(sompong\.it@kmutt\.ac\.th\)/i)).toBeInTheDocument();
    });
  });

  // UI-TKT-02: Dropdown Population
  it("UI-TKT-02: Populates Category and Related System dropdowns dynamically from API", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: "Network" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "Campus Wi-Fi" })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: "LEB2 App" })).toBeInTheDocument();
    });
  });

  // UI-TKT-03: Empty Submission Inline Errors
  it("UI-TKT-03: Clicking Submit with empty required fields halts submission and displays inline errors", async () => {
    const createSpy = vi.spyOn(api, "createTicket");
    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Submit Ticket/i })).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(createSpy).not.toHaveBeenCalled();
      expect(screen.getByText(/Please select a Category\./i)).toBeInTheDocument();
      expect(screen.getByText(/Please select a Related System\./i)).toBeInTheDocument();
      expect(screen.getByText(/Ticket Summary is required\./i)).toBeInTheDocument();
      expect(screen.getByText(/Detailed Description is required\./i)).toBeInTheDocument();
    });
  });

  // UI-TKT-04: Blur Validation Rule (AGENTS.md §4, BR-10)
  it("UI-TKT-04: Blurring input with whitespace-only data clears the field without premature error messages", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/e\.g\. Cannot connect to campus Wi-Fi/i)).toBeInTheDocument();
    });

    const summaryInput = screen.getByPlaceholderText(/e\.g\. Cannot connect to campus Wi-Fi/i);

    // Type whitespace into summary and blur
    fireEvent.change(summaryInput, { target: { value: "     " } });
    fireEvent.blur(summaryInput);

    // Value should be cleared
    expect((summaryInput as HTMLInputElement).value).toBe("");

    // Form-level error message must NOT be displayed before explicit submit click
    expect(screen.queryByText(/Ticket Summary is required/i)).not.toBeInTheDocument();
  });

  // UI-TKT-05: Submitting Busy State
  it("UI-TKT-05: Submit button transitions to disabled state with spinner during active submission", async () => {
    let resolvePromise: (val: any) => void;
    vi.spyOn(api, "createTicket").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    });

    // Fill valid form
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "4" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Cannot connect to campus Wi-Fi/i), {
      target: { value: "Wi-Fi outage in library" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Provide exact error messages/i), {
      target: { value: "Students are unable to connect to KMUTT-Secure on floor 2." },
    });

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    // Verify busy submitting state
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Submitting…/i })).toBeDisabled();
      expect(screen.getByRole("status")).toBeInTheDocument(); // spinner
    });

    // Resolve submission
    resolvePromise!({
      id: 101,
      ticketNumber: "TKT-2026-00001",
      currentStatus: "New",
      requestedPriority: "Medium",
      summary: "Wi-Fi outage in library",
      description: "Students are unable to connect to KMUTT-Secure on floor 2.",
      category: { id: 4, name: "Network" },
      relatedSystem: { id: 1, name: "Campus Wi-Fi" },
      attachments: [],
    });

    await waitFor(() => {
      expect(screen.getByText(/Ticket Created Successfully!/i)).toBeInTheDocument();
    });
  });

  // UI-TKT-06: Creation Success Card & Copy Number
  it("UI-TKT-06: Renders success confirmation card with TKT-YYYY-NNNNN and copy action", async () => {
    vi.spyOn(api, "createTicket").mockResolvedValue({
      id: 105,
      ticketNumber: "TKT-2026-00099",
      currentStatus: "New",
      requestedPriority: "High",
      summary: "Printer toner empty",
      description: "Department printer in room 402 is out of black toner.",
      category: { id: 2, name: "Hardware" },
      relatedSystem: { id: 6, name: "Printer" },
      attachments: [],
      requesterId: 1,
      categoryId: 2,
      relatedSystemId: 6,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requester: { id: 1, name: "Sompong IT", email: "sompong.it@kmutt.ac.th" },
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "2" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "6" } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Cannot connect to campus Wi-Fi/i), {
      target: { value: "Printer toner empty" },
    });
    fireEvent.change(screen.getByPlaceholderText(/Provide exact error messages/i), {
      target: { value: "Department printer in room 402 is out of black toner." },
    });

    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    await waitFor(() => {
      expect(screen.getByTestId("created-ticket-number")).toHaveTextContent("TKT-2026-00099");
      expect(screen.getByRole("button", { name: /Copy Ticket Number/i })).toBeInTheDocument();
    });

    // Test copy button
    const copyBtn = screen.getByRole("button", { name: /Copy Ticket Number/i });
    fireEvent.click(copyBtn);

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith("TKT-2026-00099");
      expect(screen.getByText(/Copied to Clipboard!/i)).toBeInTheDocument();
    });

    // Test "Create Another Ticket" reset
    fireEvent.click(screen.getByRole("button", { name: /Create Another Ticket/i }));
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Submit Ticket/i })).toBeInTheDocument();
    });
  });

  // UI-TKT-07: Resilient Error Recovery & Strict Input Retention
  it("UI-TKT-07: On API failure, renders top error alert and strictly preserves all user-entered inputs", async () => {
    vi.spyOn(api, "createTicket").mockRejectedValue(new Error("Unable to connect to TokTickIT server"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByLabelText(/Category/i)).toBeInTheDocument();
    });

    const typedSummary = "Urgent: LEB2 submission error for final exam";
    const typedDescription = "Students receive HTTP 504 gateway timeout when uploading PDF submissions.";

    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "4" } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Cannot connect to campus Wi-Fi/i), {
      target: { value: typedSummary },
    });
    fireEvent.change(screen.getByPlaceholderText(/Provide exact error messages/i), {
      target: { value: typedDescription },
    });

    // Submit
    fireEvent.click(screen.getByRole("button", { name: /Submit Ticket/i }));

    // Verify error banner is shown
    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Unable to connect to TokTickIT server/i)).toBeInTheDocument();
    });

    // CRITICAL ASSERTION: All typed data must be intact in the input elements
    const summaryInput = screen.getByPlaceholderText(/e\.g\. Cannot connect to campus Wi-Fi/i) as HTMLInputElement;
    const descriptionTextarea = screen.getByPlaceholderText(/Provide exact error messages/i) as HTMLTextAreaElement;
    const categorySelect = screen.getByLabelText(/Category/i) as HTMLSelectElement;
    const systemSelect = screen.getByLabelText(/Related System/i) as HTMLSelectElement;

    expect(summaryInput.value).toBe(typedSummary);
    expect(descriptionTextarea.value).toBe(typedDescription);
    expect(categorySelect.value).toBe("3");
    expect(systemSelect.value).toBe("4");

    // Submit button must be re-enabled for retry
    expect(screen.getByRole("button", { name: /Submit Ticket/i })).toBeEnabled();
  });

  // UI-TKT-08: Client File Validation (Type & Size)
  it("UI-TKT-08: Rejects unsupported file types and files exceeding 5 MB with warning alert", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Drag & drop files here, or click to browse/i)).toBeInTheDocument();
    });

    const fileInput = document.getElementById("attachment-file-input") as HTMLInputElement;
    expect(fileInput).not.toBeNull();

    // 1. Create unsupported .txt file
    const txtFile = new File(["sample text"], "notes.txt", { type: "text/plain" });

    // 2. Create oversized file (> 5 MB)
    const largeFile = new File([new ArrayBuffer(6 * 1024 * 1024)], "huge.png", { type: "image/png" });

    // Trigger change with both invalid files
    fireEvent.change(fileInput, { target: { files: [txtFile, largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/rejected: unsupported format/i)).toBeInTheDocument();
    });

    // Staged files list should remain empty
    expect(screen.queryByText(/Staged Files/i)).not.toBeInTheDocument();
  });

  // UI-TKT-09: Staged Attachment Removal
  it("UI-TKT-09: Staging valid files and clicking Remove removes the targeted file from staged list", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Drag & drop files here, or click to browse/i)).toBeInTheDocument();
    });

    const fileInput = document.getElementById("attachment-file-input") as HTMLInputElement;

    const file1 = new File(["valid content 1"], "doc1.pdf", { type: "application/pdf" });
    const file2 = new File(["valid content 2"], "screen.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    await waitFor(() => {
      expect(screen.getByText("doc1.pdf")).toBeInTheDocument();
      expect(screen.getByText("screen.png")).toBeInTheDocument();
    });

    // Click remove on doc1.pdf
    const removeBtn = screen.getByRole("button", { name: /Remove doc1\.pdf/i });
    fireEvent.click(removeBtn);

    await waitFor(() => {
      expect(screen.queryByText("doc1.pdf")).not.toBeInTheDocument();
      expect(screen.getByText("screen.png")).toBeInTheDocument();
    });
  });
});
