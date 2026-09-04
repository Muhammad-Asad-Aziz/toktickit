import { useRequester } from "../context/RequesterContext.js";

export default function AppHeader() {
  const { currentRequester, openModal } = useRequester();

  return (
    <header
      className="navbar navbar-expand px-3 py-2 text-white shadow-sm"
      style={{ backgroundColor: "#006B3C" }}
    >
      <div className="container-fluid d-flex justify-content-between align-items-center">
        <h1 className="navbar-brand text-white fw-bold d-flex align-items-center mb-0 fs-4">
          <span className="me-2">TokTickIT</span>
          <span className="badge bg-light text-dark fw-normal opacity-75 fs-6">
            IT Service Desk
          </span>
        </h1>

        <div className="d-flex align-items-center gap-3">
          {currentRequester ? (
            <>
              <span
                className="text-white d-inline-flex align-items-center"
                data-testid="active-user-badge"
                title={`${currentRequester.email}${currentRequester.department ? ` • ${currentRequester.department}` : ""}`}
              >
                <span className="me-1">👤</span>
                <span className="fw-semibold">{currentRequester.name}</span>
              </span>

              <button
                type="button"
                className="btn btn-outline-light btn-sm"
                onClick={openModal}
              >
                Change Requester
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-light btn-sm fw-semibold text-success"
              onClick={openModal}
            >
              Select Requester
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
