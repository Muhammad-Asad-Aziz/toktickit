import { useState, useEffect, useRef, useCallback, ChangeEvent, KeyboardEvent } from "react";
import {
  fetchTickets,
  fetchCategories,
  Category,
  TicketSummaryItem,
  GetTicketsParams,
} from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

interface MyTicketsProps {
  onCreateTicket?: () => void;
  onViewTicket?: (ticketId: number) => void;
}

type SortColumn =
  | "ticketNumber"
  | "createdAt"
  | "summary"
  | "requestedPriority"
  | "itPriority"
  | "currentStatus";

export default function MyTickets({ onCreateTicket, onViewTicket }: MyTicketsProps) {
  const { currentRequester } = useRequester();

  // Reference data
  const [categories, setCategories] = useState<Category[]>([]);

  // Search input and debouncing
  const [searchInput, setSearchInput] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dropdown filter states
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedRequestedPriority, setSelectedRequestedPriority] = useState<string>("");
  const [selectedItPriority, setSelectedItPriority] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // Sorting & pagination states
  const [sortBy, setSortBy] = useState<SortColumn>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Data loading & error states
  const [tickets, setTickets] = useState<TicketSummaryItem[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Abort controller reference to cancel in-flight requests
  const abortControllerRef = useRef<AbortController | null>(null);

  // Track if any filter or search term is actively applied
  const hasActiveFilters =
    Boolean(debouncedSearch.trim()) ||
    Boolean(selectedCategory) ||
    Boolean(selectedRequestedPriority) ||
    Boolean(selectedItPriority) ||
    Boolean(selectedStatus);

  // Load categories for filter dropdown
  useEffect(() => {
    let isMounted = true;
    fetchCategories()
      .then((cats) => {
        if (isMounted) {
          setCategories(cats.filter((c) => c.isActive !== false));
        }
      })
      .catch(() => {
        // Silently handle reference data fetch failure; dropdown will remain with "All Categories"
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Debounce search input changes by 350ms
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchInput]);

  // Load tickets function
  const requesterId = currentRequester?.id;

  const loadTickets = useCallback(async () => {
    if (!requesterId) {
      setTickets([]);
      setTotalCount(0);
      setTotalPages(0);
      setIsLoading(false);
      return;
    }

    // Cancel in-flight request if present
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const params: GetTicketsParams = {
        search: debouncedSearch || undefined,
        category: selectedCategory || undefined,
        requestedPriority: selectedRequestedPriority || undefined,
        itPriority: selectedItPriority || undefined,
        status: selectedStatus || undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        pageSize,
      };

      const response = await fetchTickets(requesterId, params, controller.signal);

      setTickets(response.items);
      setTotalCount(response.totalCount);
      setTotalPages(response.totalPages);
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") {
        return; // Request was aborted due to newer input; do nothing
      }
      setErrorMessage(
        (err as Error).message || "Unable to load tickets. Please check your network connection."
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    requesterId,
    debouncedSearch,
    selectedCategory,
    selectedRequestedPriority,
    selectedItPriority,
    selectedStatus,
    sortBy,
    sortOrder,
    currentPage,
    pageSize,
  ]);

  // Trigger load whenever query dependencies change
  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // React to Requester switch: immediately purge tickets, reset filters & pagination
  const prevRequesterIdRef = useRef<number | null>(currentRequester?.id ?? null);
  useEffect(() => {
    if (currentRequester?.id !== prevRequesterIdRef.current) {
      prevRequesterIdRef.current = currentRequester?.id ?? null;
      // Immediately purge stale tickets
      setTickets([]);
      setTotalCount(0);
      setTotalPages(0);
      // Reset filters & search
      setSearchInput("");
      setDebouncedSearch("");
      setSelectedCategory("");
      setSelectedRequestedPriority("");
      setSelectedItPriority("");
      setSelectedStatus("");
      setSortBy("createdAt");
      setSortOrder("desc");
      setCurrentPage(1);
    }
  }, [currentRequester?.id]);

  // Keyboard shortcut: Press Enter in search input to search immediately (bypassing debounce)
  const handleSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }
  };

  // Clear single search input
  const handleClearSearch = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchInput("");
    setDebouncedSearch("");
    setCurrentPage(1);
  };

  // Clear all filters action
  const handleClearAllFilters = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    setSearchInput("");
    setDebouncedSearch("");
    setSelectedCategory("");
    setSelectedRequestedPriority("");
    setSelectedItPriority("");
    setSelectedStatus("");
    setCurrentPage(1);
  };

  // Sorting header click handler
  const handleHeaderSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder(column === "createdAt" || column === "ticketNumber" ? "desc" : "asc");
    }
    setCurrentPage(1);
  };

  // Status badge class mapper
  const getStatusBadgeClass = (status: string) => {
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
  const getPriorityBadgeClass = (priority: string | null | undefined) => {
    if (!priority) return "badge-priority-unassigned";
    const p = priority.toLowerCase();
    if (p === "urgent") return "badge-priority-urgent";
    if (p === "high") return "badge-priority-high";
    if (p === "medium") return "badge-priority-medium";
    if (p === "low") return "badge-priority-low";
    return "badge-priority-unassigned";
  };

  // Format date helper
  const formatDate = (isoString?: string) => {
    if (!isoString) return "—";
    try {
      const d = new Date(isoString);
      return d.toISOString().split("T")[0];
    } catch {
      return isoString;
    }
  };

  // Compute pagination summary range
  const fromIndex = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const toIndex = Math.min(currentPage * pageSize, totalCount);

  return (
    <div className="container-fluid px-0" data-testid="my-tickets-container">
      {/* Header Bar */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
        <div>
          <h1 className="h3 fw-bold mb-1" style={{ color: "var(--zen-primary-green)" }}>
            My Tickets
          </h1>
          <p className="text-muted mb-0 small">
            Track and manage your submitted IT support requests.
          </p>
        </div>

        {onCreateTicket && (
          <button
            type="button"
            className="btn btn-zen-primary d-inline-flex align-items-center gap-2 px-3 py-2 my-tickets-create-btn"
            data-testid="create-ticket-btn"
            onClick={onCreateTicket}
          >
            <span aria-hidden="true">＋</span>
            <span>Create Ticket</span>
          </button>
        )}
      </div>

      {/* Network or Server Error Banner with Retry */}
      {errorMessage && (
        <div
          className="alert alert-danger d-flex align-items-center justify-content-between mb-4 shadow-sm"
          role="alert"
          style={{ borderLeft: "4px solid var(--zen-error)" }}
        >
          <div className="d-flex align-items-center gap-2">
            <span aria-hidden="true" className="fs-5">⚠️</span>
            <div>
              <strong>Connection Error:</strong> {errorMessage}
            </div>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            data-testid="error-retry-btn"
            onClick={loadTickets}
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Filter and Search Bar Card */}
      <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: 8 }}>
        <div className="card-body p-3 p-md-4">
          <div className="row g-3 align-items-center">
            {/* Search Input */}
            <div className="col-12 col-lg-4">
              <div className="position-relative">
                <span
                  className="position-absolute text-muted"
                  style={{ left: 12, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                  aria-hidden="true"
                >
                  🔍
                </span>
                <input
                  type="text"
                  className="form-control"
                  style={{ paddingLeft: 38, paddingRight: searchInput ? 38 : 12 }}
                  placeholder="Search by ticket # or summary..."
                  value={searchInput}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchInput(e.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  data-testid="filter-search-input"
                  aria-label="Search tickets"
                />
                {searchInput && (
                  <button
                    type="button"
                    className="btn btn-sm position-absolute text-muted p-0 border-0"
                    style={{ right: 12, top: "50%", transform: "translateY(-50%)", fontSize: 16 }}
                    onClick={handleClearSearch}
                    data-testid="clear-search-btn"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter */}
            <div className="col-6 col-sm-3 col-lg-2">
              <select
                className="form-select"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                data-testid="filter-category-select"
                aria-label="Filter by Category"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Requested Priority Filter */}
            <div className="col-6 col-sm-3 col-lg-2">
              <select
                className="form-select"
                value={selectedRequestedPriority}
                onChange={(e) => {
                  setSelectedRequestedPriority(e.target.value);
                  setCurrentPage(1);
                }}
                data-testid="filter-requested-priority-select"
                aria-label="Filter by Requested Priority"
              >
                <option value="">All Req. Priorities</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            {/* IT Priority Filter */}
            <div className="col-6 col-sm-3 col-lg-2">
              <select
                className="form-select"
                value={selectedItPriority}
                onChange={(e) => {
                  setSelectedItPriority(e.target.value);
                  setCurrentPage(1);
                }}
                data-testid="filter-it-priority-select"
                aria-label="Filter by IT Priority"
              >
                <option value="">All IT Priorities</option>
                <option value="UNASSIGNED">Unassigned (None)</option>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Urgent">Urgent</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="col-6 col-sm-3 col-lg-2">
              <select
                className="form-select"
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                data-testid="filter-status-select"
                aria-label="Filter by Status"
              >
                <option value="">All Statuses</option>
                <option value="New">New</option>
                <option value="Assigned">Assigned</option>
                <option value="In Progress">In Progress</option>
                <option value="Pending Requester">Pending Requester</option>
                <option value="Resolved">Resolved</option>
                <option value="Closed">Closed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            {/* Clear Filters Action Button */}
            {hasActiveFilters && (
              <div className="col-12 text-end pt-1">
                <button
                  type="button"
                  className="btn btn-sm btn-zen-outline px-3"
                  data-testid="clear-filters-btn"
                  onClick={handleClearAllFilters}
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading && tickets.length === 0 ? (
        /* Loading Shimmer State (initial load) */
        <div className="card shadow-sm border-0 p-4" style={{ borderRadius: 8 }}>
          <div className="d-flex flex-column gap-3">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="zen-skeleton"
                style={{ height: 48, width: "100%" }}
                aria-hidden="true"
              />
            ))}
          </div>
        </div>
      ) : totalCount === 0 && !hasActiveFilters && !isLoading ? (
        /* Empty State (0 Total Tickets Ever) */
        <div
          className="card shadow-sm border-0 text-center p-5 my-4"
          style={{ borderRadius: 8 }}
          data-testid="empty-state"
        >
          <div className="py-4">
            <div className="fs-1 mb-3" aria-hidden="true">
              📥
            </div>
            <h2 className="h4 fw-bold mb-2">No tickets submitted yet</h2>
            <p className="text-muted mx-auto mb-4" style={{ maxWidth: 480 }}>
              You haven't submitted any IT support requests. If you are experiencing technical
              difficulties, submit a ticket to get assistance from the IT Helpdesk.
            </p>
            <button
              type="button"
              className="btn btn-zen-primary px-4 py-2"
              onClick={onCreateTicket}
            >
              Create Your First Ticket
            </button>
          </div>
        </div>
      ) : totalCount === 0 && hasActiveFilters && !isLoading ? (
        /* No-Results State (0 Tickets Matching Active Filters) */
        <div
          className="card shadow-sm border-0 text-center p-5 my-4"
          style={{ borderRadius: 8 }}
          data-testid="no-results-state"
        >
          <div className="py-4">
            <div className="fs-1 mb-3" aria-hidden="true">
              🔍
            </div>
            <h2 className="h4 fw-bold mb-2">No matching tickets found</h2>
            <p className="text-muted mx-auto mb-4" style={{ maxWidth: 480 }}>
              We couldn't find any tickets matching your search query or filter criteria. Try
              searching with different keywords or clearing your active filters.
            </p>
            <button
              type="button"
              className="btn btn-zen-outline px-4 py-2"
              onClick={handleClearAllFilters}
            >
              Clear Filters
            </button>
          </div>
        </div>
      ) : (
        /* Results Table (Desktop) + Stacked Cards (Mobile) */
        <div className="card shadow-sm border-0 mb-4" style={{ borderRadius: 8 }}>
          {/* Desktop Table Presentation (Visible on screens >= 768px) */}
          <div className="table-responsive d-none d-md-block">
            <table className="table my-tickets-table mb-0 align-middle">
              <thead>
                <tr>
                  <th
                    className="sortable-th ps-4 py-3"
                    onClick={() => handleHeaderSort("ticketNumber")}
                    scope="col"
                  >
                    Ticket No{" "}
                    <span className="sort-indicator">
                      {sortBy === "ticketNumber" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </th>
                  <th
                    className="sortable-th py-3"
                    onClick={() => handleHeaderSort("createdAt")}
                    scope="col"
                  >
                    Created Date{" "}
                    <span className="sort-indicator">
                      {sortBy === "createdAt" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </th>
                  <th
                    className="sortable-th py-3"
                    style={{ minWidth: 220 }}
                    onClick={() => handleHeaderSort("summary")}
                    scope="col"
                  >
                    Summary{" "}
                    <span className="sort-indicator">
                      {sortBy === "summary" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </th>
                  <th className="py-3" scope="col">
                    Category
                  </th>
                  <th
                    className="sortable-th py-3"
                    onClick={() => handleHeaderSort("requestedPriority")}
                    scope="col"
                  >
                    Requested Priority{" "}
                    <span className="sort-indicator">
                      {sortBy === "requestedPriority" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </th>
                  <th
                    className="sortable-th py-3"
                    onClick={() => handleHeaderSort("itPriority")}
                    scope="col"
                  >
                    IT Priority{" "}
                    <span className="sort-indicator">
                      {sortBy === "itPriority" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </th>
                  <th
                    className="sortable-th py-3"
                    onClick={() => handleHeaderSort("currentStatus")}
                    scope="col"
                  >
                    Status{" "}
                    <span className="sort-indicator">
                      {sortBy === "currentStatus" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                    </span>
                  </th>
                  <th className="pe-4 py-3 text-center" scope="col">
                    Attachments
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr key={t.id}>
                    <td className="ps-4">
                      {onViewTicket ? (
                        <button
                          type="button"
                          className="btn btn-link p-0 ticket-number-cell text-decoration-none border-0"
                          onClick={() => onViewTicket(t.id)}
                          data-testid={`ticket-link-${t.id}`}
                          style={{ cursor: "pointer", color: "var(--zen-primary-green)" }}
                        >
                          {t.ticketNumber || t.ticketNo}
                        </button>
                      ) : (
                        <span className="ticket-number-cell">{t.ticketNumber || t.ticketNo}</span>
                      )}
                    </td>
                    <td>{formatDate(t.createdAt)}</td>
                    <td>
                      <div
                        className="text-truncate fw-medium"
                        style={{ maxWidth: 280 }}
                        title={t.summary}
                      >
                        {t.summary}
                      </div>
                    </td>
                    <td>
                      <span className="text-secondary small">{t.category?.name || "—"}</span>
                    </td>
                    <td>
                      <span className={`badge-priority ${getPriorityBadgeClass(t.requestedPriority)}`}>
                        {t.requestedPriority}
                      </span>
                    </td>
                    <td>
                      {t.itPriority ? (
                        <span className={`badge-priority ${getPriorityBadgeClass(t.itPriority)}`}>
                          {t.itPriority}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge-status ${getStatusBadgeClass(t.currentStatus || t.status || "New")}`}>
                        {t.currentStatus || t.status}
                      </span>
                    </td>
                    <td className="pe-4 text-center">
                      {t.attachmentCount > 0 ? (
                        <span className="badge rounded-pill bg-light text-dark border">
                          📎 {t.attachmentCount}
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card Presentation (Visible on screens < 768px) */}
          <div className="d-md-none p-3">
            {tickets.map((t) => (
              <div key={t.id} className="my-tickets-mobile-card" data-testid={`ticket-card-${t.id}`}>
                {/* Header: Ticket Number & Status */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  {onViewTicket ? (
                    <button
                      type="button"
                      className="btn btn-link p-0 ticket-number-cell fs-6 text-decoration-none border-0"
                      onClick={() => onViewTicket(t.id)}
                      data-testid={`mobile-ticket-link-${t.id}`}
                      style={{ cursor: "pointer", color: "var(--zen-primary-green)" }}
                    >
                      {t.ticketNumber || t.ticketNo}
                    </button>
                  ) : (
                    <span className="ticket-number-cell fs-6">{t.ticketNumber || t.ticketNo}</span>
                  )}
                  <span className={`badge-status ${getStatusBadgeClass(t.currentStatus || t.status || "New")}`}>
                    {t.currentStatus || t.status}
                  </span>
                </div>

                {/* Body: Summary */}
                <h3 className="h6 fw-bold mb-2 text-dark">{t.summary}</h3>

                {/* Metadata Grid */}
                <div className="row g-2 small text-muted mb-3">
                  <div className="col-6">
                    <strong>Category:</strong> {t.category?.name || "—"}
                  </div>
                  <div className="col-6">
                    <strong>Created:</strong> {formatDate(t.createdAt)}
                  </div>
                  <div className="col-6 d-flex align-items-center gap-1">
                    <strong>Req. Priority:</strong>
                    <span className={`badge-priority ${getPriorityBadgeClass(t.requestedPriority)}`}>
                      {t.requestedPriority}
                    </span>
                  </div>
                  <div className="col-6 d-flex align-items-center gap-1">
                    <strong>IT Priority:</strong>
                    {t.itPriority ? (
                      <span className={`badge-priority ${getPriorityBadgeClass(t.itPriority)}`}>
                        {t.itPriority}
                      </span>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </div>
                  {t.attachmentCount > 0 && (
                    <div className="col-12 text-muted">
                      <span>📎 {t.attachmentCount} attachment(s)</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls Bar */}
          <div
            className="card-footer bg-white border-top p-3 d-flex flex-column flex-sm-row justify-content-between align-items-center gap-3"
            data-testid="pagination-controls"
          >
            {/* Range summary */}
            <div className="small text-muted" data-testid="pagination-summary">
              Showing {fromIndex} to {toIndex} of {totalCount} tickets
            </div>

            {/* Pagination buttons and page size */}
            <div className="d-flex align-items-center gap-2 flex-wrap">
              {/* Previous Page Button */}
              <button
                type="button"
                className="zen-page-btn"
                data-testid="prev-page-btn"
                disabled={currentPage <= 1 || totalPages === 0}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                aria-label="Previous Page"
              >
                ‹ Prev
              </button>

              {/* Page Number Pills */}
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter((p) => {
                  // Display first, last, and pages adjacent to current page
                  if (totalPages <= 5) return true;
                  return Math.abs(p - currentPage) <= 1 || p === 1 || p === totalPages;
                })
                .map((p, idx, arr) => {
                  const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                  return (
                    <span key={p} className="d-inline-flex align-items-center gap-1">
                      {showEllipsisBefore && <span className="text-muted px-1">…</span>}
                      <button
                        type="button"
                        className={`zen-page-btn ${p === currentPage ? "active" : ""}`}
                        data-testid={`page-btn-${p}`}
                        onClick={() => setCurrentPage(p)}
                        aria-label={`Page ${p}`}
                        aria-current={p === currentPage ? "page" : undefined}
                      >
                        {p}
                      </button>
                    </span>
                  );
                })}

              {/* Next Page Button */}
              <button
                type="button"
                className="zen-page-btn"
                data-testid="next-page-btn"
                disabled={currentPage >= totalPages || totalPages === 0}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                aria-label="Next Page"
              >
                Next ›
              </button>

              {/* Page Size Selector */}
              <div className="ms-sm-3 d-flex align-items-center gap-1">
                <select
                  className="form-select form-select-sm"
                  style={{ width: "auto", height: 38 }}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  data-testid="page-size-select"
                  aria-label="Items per page"
                >
                  <option value={10}>10 / page</option>
                  <option value={25}>25 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
