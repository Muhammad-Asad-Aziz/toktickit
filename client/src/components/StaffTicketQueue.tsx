import { useState, useEffect, useCallback, useRef } from "react";
import {
  fetchStaffTickets,
  fetchCategories,
  Category,
  StaffTicketSummary,
  StaffTicketQueryParams,
} from "../api.js";

export interface StaffTicketQueueProps {
  onViewTicket?: (ticketId: number) => void;
}

type SortColumn = "createdAt" | "ticketNumber" | "summary" | "itPriority" | "currentStatus";

const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  OPEN: "Open",
  IN_PROGRESS: "In Progress",
  WAITING_FOR_REQUESTER: "Waiting for Requester",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  REOPENED: "Reopened",
  CANCELLED: "Cancelled",
};

const STATUS_BADGE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  NEW: { bg: "#EAF6EF", color: "#006B3C", border: "1px solid #C4E5D2" },
  OPEN: { bg: "#EFF6FF", color: "#1E40AF", border: "1px solid #BFDBFE" },
  IN_PROGRESS: { bg: "#FEF3C7", color: "#92400E", border: "1px solid #FDE68A" },
  WAITING_FOR_REQUESTER: { bg: "#F3E8FF", color: "#6B21A8", border: "1px solid #E9D5FF" },
  RESOLVED: { bg: "#F3F4F6", color: "#374151", border: "1px solid #E5E7EB" },
  CLOSED: { bg: "#E5E7EB", color: "#4B5563", border: "1px solid #D1D5DB" },
  REOPENED: { bg: "#FFF7ED", color: "#C2410C", border: "1px solid #FFEDD5" },
  CANCELLED: { bg: "#FEE2E2", color: "#991B1B", border: "1px solid #FECACA" },
};

const PRIORITY_BADGE_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  LOW: { bg: "#E5E7EB", color: "#374151", label: "Low" },
  MEDIUM: { bg: "#DBEAFE", color: "#1E40AF", label: "Medium" },
  HIGH: { bg: "#FEF3C7", color: "#92400E", label: "High" },
  URGENT: { bg: "#FEE2E2", color: "#991B1B", label: "Urgent" },
};

export default function StaffTicketQueue({ onViewTicket }: StaffTicketQueueProps) {
  // Reference categories
  const [categories, setCategories] = useState<Category[]>([]);

  // Filter and search parameters
  const [search, setSearch] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [itPriority, setItPriority] = useState<string>("");
  const [owner, setOwner] = useState<string>("");

  // Sorting and pagination
  const [sortBy, setSortBy] = useState<SortColumn>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Response state
  const [tickets, setTickets] = useState<StaffTicketSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Viewport detection (< 768px responsive mobile view)
  const [isMobile, setIsMobile] = useState<boolean>(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );

  const abortControllerRef = useRef<AbortController | null>(null);

  // Responsive resize handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Fetch categories on mount
  useEffect(() => {
    let mounted = true;
    fetchCategories()
      .then((cats) => {
        if (mounted) {
          setCategories(cats.filter((c) => c.isActive !== false));
        }
      })
      .catch(() => {
        // Silently ignore category load failure
      });
    return () => {
      mounted = false;
    };
  }, []);

  // Fetch tickets callback
  const loadTickets = useCallback(
    async (
      overrideParams?: Partial<StaffTicketQueryParams>
    ) => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setErrorMessage(null);

      const queryParams: StaffTicketQueryParams = {
        search,
        status,
        category,
        itPriority,
        owner,
        sortBy,
        sortOrder,
        page,
        pageSize,
        ...overrideParams,
      };

      try {
        const data = await fetchStaffTickets(queryParams, controller.signal);
        setTickets(data.items);
        setTotalCount(data.totalCount);
        setTotalPages(data.totalPages || 1);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setErrorMessage(err.message || "Unable to load ticket queue.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [search, status, category, itPriority, owner, sortBy, sortOrder, page, pageSize]
  );

  // Trigger query on parameters change
  useEffect(() => {
    loadTickets();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadTickets]);

  // Reset all filters
  const handleResetFilters = () => {
    setSearch("");
    setStatus("");
    setCategory("");
    setItPriority("");
    setOwner("");
    setPage(1);
    loadTickets({
      search: "",
      status: "",
      category: "",
      itPriority: "",
      owner: "",
      page: 1,
    });
  };

  // Sort click handler
  const handleSort = (column: SortColumn) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  };

  const getSortIndicator = (column: SortColumn) => {
    if (sortBy !== column) return "";
    return sortOrder === "asc" ? " ▲" : " ▼";
  };

  const hasActiveFilters =
    Boolean(search.trim()) ||
    Boolean(status) ||
    Boolean(category) ||
    Boolean(itPriority) ||
    Boolean(owner);

  const startRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalCount);

  return (
    <div
      className="card shadow-sm border-0"
      style={{ backgroundColor: "var(--zen-surface)" }}
      data-testid="staff-ticket-queue-view"
    >
      {/* Top Header & Counter Banner */}
      <div
        className="card-header bg-white py-3 px-4 d-flex flex-wrap justify-content-between align-items-center gap-3 border-bottom"
        style={{ borderColor: "var(--zen-border-neutral)" }}
      >
        <div className="d-flex align-items-center gap-3">
          <h2 className="mb-0 fw-bold fs-4" style={{ color: "var(--zen-text-primary)" }}>
            IT Staff Ticket Queue
          </h2>
          <span
            className="badge rounded-pill px-3 py-2 fw-semibold"
            style={{
              backgroundColor: "var(--zen-pale-green)",
              color: "var(--zen-primary-green)",
              border: "1px solid #C4E5D2",
              fontSize: "14px",
            }}
            data-testid="total-tickets-pill"
          >
            Total Tickets: <span className="ms-1 fw-bold">{totalCount}</span>
          </span>
        </div>
      </div>

      <div className="card-body p-4">
        {/* Error Alert with Retry */}
        {errorMessage && (
          <div
            className="alert alert-danger d-flex justify-content-between align-items-center mb-4"
            role="alert"
            data-testid="queue-error-alert"
          >
            <div>
              <strong>Error: </strong>
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-outline-danger"
              onClick={() => loadTickets()}
            >
              Retry
            </button>
          </div>
        )}

        {/* Filter & Search Toolbar */}
        <div className="bg-light p-3 rounded-3 mb-4 border" style={{ borderColor: "var(--zen-border-neutral)" }}>
          <div className="row g-3 align-items-end">
            {/* Search Input */}
            <div className="col-12 col-md-4">
              <label htmlFor="staff-queue-search" className="form-label small fw-semibold text-muted mb-1">
                Search Tickets
              </label>
              <input
                id="staff-queue-search"
                type="text"
                className="form-control"
                placeholder="Search by ticket number or summary..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                data-testid="queue-search-input"
              />
            </div>

            {/* Status Dropdown */}
            <div className="col-6 col-md-2">
              <label htmlFor="filter-status" className="form-label small fw-semibold text-muted mb-1">
                Filter by Status
              </label>
              <select
                id="filter-status"
                aria-label="Filter by Status"
                className="form-select"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
                data-testid="filter-status"
              >
                <option value="">All Statuses</option>
                <option value="NEW">New</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
                <option value="REOPENED">Reopened</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            {/* Category Dropdown */}
            <div className="col-6 col-md-2">
              <label htmlFor="filter-category" className="form-label small fw-semibold text-muted mb-1">
                Filter by Category
              </label>
              <select
                id="filter-category"
                aria-label="Filter by Category"
                className="form-select"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
                data-testid="filter-category"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* IT Priority Dropdown */}
            <div className="col-6 col-md-2">
              <label htmlFor="filter-priority" className="form-label small fw-semibold text-muted mb-1">
                Filter by Priority
              </label>
              <select
                id="filter-priority"
                aria-label="Filter by Priority"
                className="form-select"
                value={itPriority}
                onChange={(e) => {
                  setItPriority(e.target.value);
                  setPage(1);
                }}
                data-testid="filter-priority"
              >
                <option value="">All Priorities</option>
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            {/* Owner Dropdown */}
            <div className="col-6 col-md-2">
              <label htmlFor="filter-owner" className="form-label small fw-semibold text-muted mb-1">
                Filter by Owner
              </label>
              <select
                id="filter-owner"
                aria-label="Filter by Owner"
                className="form-select"
                value={owner}
                onChange={(e) => {
                  setOwner(e.target.value);
                  setPage(1);
                }}
                data-testid="filter-owner"
              >
                <option value="">All Owners</option>
                <option value="unassigned">Unassigned</option>
              </select>
            </div>
          </div>

          {/* Reset Filters Action */}
          <div className="d-flex justify-content-end mt-3">
            <button
              type="button"
              className="btn btn-zen-outline btn-sm px-3"
              onClick={handleResetFilters}
              data-testid="reset-filters-button"
            >
              Reset Filters
            </button>
          </div>
        </div>

        {/* Loading Shimmer Skeleton */}
        {isLoading && (
          <div className="py-4" data-testid="queue-skeleton" role="status" aria-busy="true">
            {[1, 2, 3, 4, 5].map((idx) => (
              <div
                key={idx}
                className="zen-skeleton mb-3"
                style={{ height: "48px", width: "100%" }}
              />
            ))}
          </div>
        )}

        {/* Empty / No Results Banner */}
        {!isLoading && totalCount === 0 && (
          <div className="text-center py-5 border rounded-3 bg-white" data-testid="queue-empty-state">
            <h4 className="fw-semibold text-muted mb-2">No matching tickets found</h4>
            <p className="text-muted mb-3">
              {hasActiveFilters
                ? "No tickets match your filter criteria. Try adjusting search or filters."
                : "The queue is currently empty."}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-zen-primary btn-sm px-4"
                onClick={handleResetFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        )}

        {/* Desktop / Tablet Data Table (>= 768px) */}
        {!isLoading && totalCount > 0 && (
          <div
            className="table-responsive"
            style={{
              opacity: isMobile ? 0 : 1,
              height: isMobile ? 0 : "auto",
              overflow: isMobile ? "hidden" : "visible",
              pointerEvents: isMobile ? "none" : "auto",
            }}
          >
            <table
              className="table table-hover align-middle my-tickets-table mb-0"
              style={{
                opacity: isMobile ? 0 : 1,
              }}
            >
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sortable-th"
                    onClick={() => handleSort("ticketNumber")}
                    data-tooltip="Sort by Ticket Number"
                    data-testid="th-sort-ticket-number"
                  >
                    Ticket No{getSortIndicator("ticketNumber")}
                  </th>
                  <th
                    scope="col"
                    className="sortable-th"
                    onClick={() => handleSort("createdAt")}
                    data-tooltip="Sort by Creation Date"
                    data-testid="th-sort-created-at"
                  >
                    Created Date{getSortIndicator("createdAt")}
                  </th>
                  <th
                    scope="col"
                    className="sortable-th"
                    onClick={() => handleSort("summary")}
                    data-tooltip="Sort by Summary"
                    data-testid="th-sort-summary"
                  >
                    Summary{getSortIndicator("summary")}
                  </th>
                  <th scope="col">Category</th>
                  <th scope="col">Req. Prio</th>
                  <th
                    scope="col"
                    className="sortable-th"
                    onClick={() => handleSort("itPriority")}
                    data-tooltip="Sort by IT Priority"
                    data-testid="th-sort-priority"
                  >
                    IT Prio{getSortIndicator("itPriority")}
                  </th>
                  <th
                    scope="col"
                    className="sortable-th"
                    onClick={() => handleSort("currentStatus")}
                    data-tooltip="Sort by Status"
                    data-testid="th-sort-status"
                  >
                    Status{getSortIndicator("currentStatus")}
                  </th>
                  <th scope="col">Owner</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => {
                  const statusStyle = STATUS_BADGE_STYLES[t.currentStatus] || {
                    bg: "#F3F4F6",
                    color: "#374151",
                    border: "1px solid #E5E7EB",
                  };
                  const reqPrioStyle = PRIORITY_BADGE_STYLES[t.requestedPriority] || {
                    bg: "#E5E7EB",
                    color: "#374151",
                    label: t.requestedPriority,
                  };
                  const itPrioStyle = PRIORITY_BADGE_STYLES[t.itPriority] || {
                    bg: "#E5E7EB",
                    color: "#374151",
                    label: t.itPriority,
                  };

                  return (
                    <tr
                      key={t.id}
                      onClick={() => onViewTicket?.(t.id)}
                      style={{ cursor: "pointer" }}
                      data-testid={`queue-row-${t.id}`}
                    >
                      <td className="ticket-number-cell">{t.ticketNumber}</td>
                      <td className="text-muted small">
                        {new Date(t.createdAt).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="fw-semibold text-truncate" style={{ maxWidth: "260px" }}>
                        {t.summary}
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {t.categoryName}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge-priority"
                          style={{ backgroundColor: reqPrioStyle.bg, color: reqPrioStyle.color }}
                        >
                          {reqPrioStyle.label}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge-priority"
                          style={{ backgroundColor: itPrioStyle.bg, color: itPrioStyle.color }}
                        >
                          {itPrioStyle.label}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge-status"
                          style={{
                            backgroundColor: statusStyle.bg,
                            color: statusStyle.color,
                            border: statusStyle.border,
                          }}
                        >
                          {STATUS_LABELS[t.currentStatus] || t.currentStatus}
                        </span>
                      </td>
                      <td>
                        {t.ownerName ? (
                          <span className="fw-medium small text-secondary">{t.ownerName}</span>
                        ) : (
                          <span
                            className="badge text-muted border bg-light"
                            style={{ fontStyle: "italic", fontWeight: 400 }}
                          >
                            Unassigned
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Stacked Card Presentation (< 768px, AC-13.4) */}
        {!isLoading && totalCount > 0 && isMobile && (
          <div
            data-testid="mobile-card-container"
            className="d-flex flex-column gap-3"
            style={{
              overflowX: "hidden",
              width: "100%",
            }}
          >
            {tickets.map((t) => {
              const statusStyle = STATUS_BADGE_STYLES[t.currentStatus] || {
                bg: "#F3F4F6",
                color: "#374151",
                border: "1px solid #E5E7EB",
              };
              const itPrioStyle = PRIORITY_BADGE_STYLES[t.itPriority] || {
                bg: "#E5E7EB",
                color: "#374151",
                label: t.itPriority,
              };

              return (
                <div
                  key={t.id}
                  className="my-tickets-mobile-card border rounded-3 p-3 bg-white shadow-sm"
                  style={{ borderColor: "var(--zen-border-neutral)", width: "100%" }}
                  data-testid={`mobile-card-${t.id}`}
                >
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold ticket-number-cell">{t.ticketNumber}</span>
                    <span
                      className="badge-status"
                      style={{
                        backgroundColor: statusStyle.bg,
                        color: statusStyle.color,
                        border: statusStyle.border,
                      }}
                    >
                      {STATUS_LABELS[t.currentStatus] || t.currentStatus}
                    </span>
                  </div>

                  <h6 className="fw-semibold mb-2 text-dark">{t.summary}</h6>

                  <div className="d-flex flex-wrap align-items-center gap-2 mb-2 text-muted small">
                    <span className="badge bg-light text-dark border">{t.categoryName}</span>
                    <span>•</span>
                    <span>
                      IT Prio:{" "}
                      <strong style={{ color: itPrioStyle.color }}>{itPrioStyle.label}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      Owner: <strong>{t.ownerName || "Unassigned"}</strong>
                    </span>
                  </div>

                  <div className="text-muted small mb-3">
                    Created:{" "}
                    {new Date(t.createdAt).toLocaleDateString("en-GB", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>

                  <button
                    type="button"
                    className="btn btn-zen-outline w-100 fw-semibold d-flex justify-content-center align-items-center"
                    style={{ minHeight: "48px" }}
                    onClick={() => onViewTicket?.(t.id)}
                  >
                    View Ticket Details &gt;
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar Controls */}
        {!isLoading && totalCount > 0 && (
          <div
            className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 pt-4 border-top mt-3"
            style={{ borderColor: "var(--zen-border-neutral)" }}
          >
            {/* Showing Count Text */}
            <div className="text-muted small text-center text-md-start">
              Showing {startRecord} to {endRecord} of {totalCount} tickets
            </div>

            {/* Pagination Controls & Rows-per-page Selector */}
            <div className="d-flex flex-wrap justify-content-center justify-content-md-end align-items-center gap-2 gap-sm-3 w-100 w-md-auto">
              <div className="d-flex align-items-center gap-2">
                <label htmlFor="staff-page-size" className="small text-muted mb-0">
                  Rows:
                </label>
                <select
                  id="staff-page-size"
                  aria-label="Rows per page"
                  className="form-select form-select-sm"
                  style={{ width: "75px" }}
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(parseInt(e.target.value, 10));
                    setPage(1);
                  }}
                  data-testid="page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>

              <div className="d-flex align-items-center gap-1 flex-wrap justify-content-center">
                <button
                  type="button"
                  className="zen-page-btn"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  data-testid="prev-page-button"
                  aria-label="Previous Page"
                >
                  Previous
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (totalPages <= 5) return true;
                    return Math.abs(p - page) <= 1 || p === 1 || p === totalPages;
                  })
                  .map((p, idx, arr) => {
                    const showEllipsisBefore = idx > 0 && p - arr[idx - 1] > 1;
                    return (
                      <span key={p} className="d-inline-flex align-items-center gap-1">
                        {showEllipsisBefore && <span className="text-muted px-1 small">…</span>}
                        <button
                          type="button"
                          className={`zen-page-btn ${page === p ? "active" : ""}`}
                          onClick={() => setPage(p)}
                          data-testid={`page-button-${p}`}
                          aria-label={`Page ${p}`}
                          aria-current={page === p ? "page" : undefined}
                        >
                          {p}
                        </button>
                      </span>
                    );
                  })}

                <button
                  type="button"
                  className="zen-page-btn"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  data-testid="next-page-button"
                  aria-label="Next Page"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
