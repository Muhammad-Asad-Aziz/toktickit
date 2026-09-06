import { useRequester } from "../context/RequesterContext.js";

interface AppHeaderProps {
  activeView?: "create" | "my-tickets";
  onViewChange?: (view: "create" | "my-tickets") => void;
}

export default function AppHeader({ activeView = "create", onViewChange }: AppHeaderProps) {
  const { currentRequester, openModal } = useRequester();

  return (
    <header
      className="navbar navbar-expand-md px-3 py-2 text-white shadow-sm flex-column"
      style={{ backgroundColor: "#006B3C" }}
    >
      <div className="container-fluid d-flex flex-wrap justify-content-between align-items-center gap-2">
        <div className="d-flex align-items-center gap-3">
          <h1 className="navbar-brand text-white fw-bold d-flex align-items-center mb-0 fs-4">
            <span className="me-2">TokTickIT</span>
            <span className="badge bg-light text-dark fw-normal opacity-75 fs-6">
              IT Service Desk
            </span>
          </h1>

          {onViewChange && (
            <nav className="d-none d-sm-flex align-items-center gap-1 ms-2" aria-label="Main Navigation">
              <button
                type="button"
                className={`btn btn-sm ${activeView === "create" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
                onClick={() => onViewChange("create")}
                data-testid="nav-create-ticket"
              >
                Create Ticket
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeView === "my-tickets" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
                onClick={() => onViewChange("my-tickets")}
                data-testid="nav-my-tickets"
              >
                My Tickets
              </button>
            </nav>
          )}
        </div>

        <div className="d-flex align-items-center gap-2 gap-sm-3">
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

      {/* Mobile navigation bar */}
      {onViewChange && (
        <div className="d-flex d-sm-none w-100 mt-2 pt-2 border-top border-success-subtle gap-2 justify-content-center">
          <button
            type="button"
            className={`btn btn-sm flex-fill ${activeView === "create" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
            onClick={() => onViewChange("create")}
          >
            Create Ticket
          </button>
          <button
            type="button"
            className={`btn btn-sm flex-fill ${activeView === "my-tickets" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
            onClick={() => onViewChange("my-tickets")}
          >
            My Tickets
          </button>
        </div>
      )}
    </header>
  );
}
