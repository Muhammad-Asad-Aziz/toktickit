import { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";

export default function RequesterModal() {
  const {
    currentRequester,
    requesters,
    isLoading,
    error,
    isModalOpen,
    setCurrentRequester,
    closeModal,
    refreshRequesters,
  } = useRequester();

  const [selectedId, setSelectedId] = useState<string>("");

  useEffect(() => {
    if (currentRequester) {
      setSelectedId(String(currentRequester.id));
    } else {
      setSelectedId("");
    }
  }, [currentRequester, isModalOpen]);

  if (!isModalOpen) {
    return null;
  }

  function handleContinue() {
    if (!selectedId) return;
    const user = requesters.find((u) => u.id === Number(selectedId));
    if (user) {
      setCurrentRequester(user);
    }
  }

  return (
    <div
      className="modal fade show d-block"
      tabIndex={-1}
      role="dialog"
      aria-labelledby="requester-modal-title"
      aria-modal="true"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.6)" }}
    >
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 8 }}>
          <div
            className="modal-header text-white"
            style={{ backgroundColor: "#006B3C", borderTopLeftRadius: 8, borderTopRightRadius: 8 }}
          >
            <h5 className="modal-title h5 mb-0" id="requester-modal-title">
              Simulated Identity Selector
            </h5>
            {currentRequester && (
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={closeModal}
              />
            )}
          </div>

          <div className="modal-body p-4">
            {/* Development notice disclaimer banner */}
            <div
              className="p-3 mb-4 rounded-2"
              style={{
                backgroundColor: "#EAF6EF",
                border: "1px solid #D3E4D8",
                color: "#1C2826",
                fontSize: "0.95rem",
              }}
            >
              <div className="d-flex align-items-start">
                <span className="me-2 fs-5">ℹ️</span>
                <div>
                  <strong>Development Notice:</strong> Select a Development Requester to test requester-specific
                  ticket behavior. This is not a login screen. Authentication will be introduced in Lab 3.
                </div>
              </div>
            </div>

            {/* Error state with retry */}
            {error && (
              <div className="alert alert-danger d-flex align-items-center justify-content-between mb-3" role="alert">
                <span>{error}</span>
                <button
                  type="button"
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => refreshRequesters()}
                >
                  Retry Connection
                </button>
              </div>
            )}

            {/* Loading skeleton */}
            {isLoading && requesters.length === 0 ? (
              <div className="text-center py-4">
                <div className="spinner-border text-success" role="status">
                  <span className="visually-hidden">Loading requesters...</span>
                </div>
                <p className="text-muted mt-2 mb-0">Loading development requesters…</p>
              </div>
            ) : !error && requesters.length === 0 ? (
              /* Empty state */
              <div className="alert alert-warning mb-3">
                No active development requesters found in the database. Please run database seeding.
              </div>
            ) : (
              /* Dropdown selection */
              <div className="mb-3">
                <label htmlFor="requester-select" className="form-label fw-semibold mb-2">
                  Choose Requester:
                </label>
                <select
                  id="requester-select"
                  className="form-select"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                  style={{ height: 40, borderRadius: 6, fontSize: "1.0rem" }}
                >
                  <option value="">-- Select a Development Requester --</option>
                  {requesters.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="modal-footer bg-light px-4 py-3 border-top d-flex justify-content-end gap-2">
            {currentRequester && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={closeModal}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              className="btn btn-success"
              style={{ backgroundColor: "#006B3C", minWidth: 100 }}
              disabled={!selectedId || isLoading}
              onClick={handleContinue}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
