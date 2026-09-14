import { useAuth } from "../context/AuthContext.js";
import { Role } from "../types/auth.js";

interface AppHeaderProps {
  activeView?: "create" | "my-tickets" | "staff-queue" | "user-admin";
  onViewChange?: (view: any) => void;
}

const ROLE_BADGE_STYLES: Record<
  Role,
  { bg: string; color: string; border: string; label: string }
> = {
  REQUESTER: {
    bg: "#EAF6EF",
    color: "#006B3C",
    border: "1px solid #C4E5D2",
    label: "Requester",
  },
  IT_STAFF: {
    bg: "#E0F2FE",
    color: "#0369A1",
    border: "1px solid #BAE6FD",
    label: "IT Staff",
  },
  ADMINISTRATOR: {
    bg: "#F3E8FF",
    color: "#6B21A8",
    border: "1px solid #E9D5FF",
    label: "Administrator",
  },
};

export default function AppHeader({
  activeView = "create",
  onViewChange,
}: AppHeaderProps) {
  const { user, logout } = useAuth();

  const roleStyle = user ? ROLE_BADGE_STYLES[user.role] : null;

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

          {user && onViewChange && (
            <nav
              className="d-none d-sm-flex align-items-center gap-1 ms-2"
              aria-label="Main Navigation"
            >
              {/* Requester & Staff & Admin common links */}
              {user.role === "REQUESTER" && (
                <>
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
                </>
              )}

              {user.role === "IT_STAFF" && (
                <>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeView === "staff-queue" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
                    onClick={() => onViewChange("staff-queue")}
                    data-testid="nav-staff-queue"
                  >
                    Staff Queue
                  </button>
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
                </>
              )}

              {user.role === "ADMINISTRATOR" && (
                <>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeView === "user-admin" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
                    onClick={() => onViewChange("user-admin")}
                    data-testid="nav-user-admin"
                  >
                    User Admin
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeView === "staff-queue" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
                    onClick={() => onViewChange("staff-queue")}
                    data-testid="nav-staff-queue"
                  >
                    Staff Queue
                  </button>
                  <button
                    type="button"
                    className={`btn btn-sm ${activeView === "my-tickets" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
                    onClick={() => onViewChange("my-tickets")}
                    data-testid="nav-my-tickets"
                  >
                    My Tickets
                  </button>
                </>
              )}
            </nav>
          )}
        </div>

        {/* Right side: Authenticated User Profile & Logout */}
        <div className="d-flex align-items-center gap-2 gap-sm-3">
          {user ? (
            <>
              <div
                className="d-flex align-items-center gap-2"
                data-testid="user-profile-badge"
              >
                <span className="text-white d-inline-flex align-items-center">
                  <span className="me-1">👤</span>
                  <span className="fw-semibold" data-testid="user-name-display">
                    {user.name}
                  </span>
                </span>

                {roleStyle && (
                  <span
                    className="badge rounded-pill px-2 py-1"
                    style={{
                      backgroundColor: roleStyle.bg,
                      color: roleStyle.color,
                      border: roleStyle.border,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                    }}
                    data-testid="user-role-badge"
                  >
                    {roleStyle.label}
                  </span>
                )}
              </div>

              <button
                type="button"
                className="btn btn-outline-light btn-sm ms-1"
                onClick={() => logout()}
                data-testid="logout-button"
              >
                Logout
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* Mobile navigation bar */}
      {user && onViewChange && (
        <div className="d-flex d-sm-none w-100 mt-2 pt-2 border-top border-success-subtle gap-2 justify-content-center">
          {user.role === "REQUESTER" && (
            <>
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
            </>
          )}
          {(user.role === "IT_STAFF" || user.role === "ADMINISTRATOR") && (
            <>
              <button
                type="button"
                className={`btn btn-sm flex-fill ${activeView === "create" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
                onClick={() => onViewChange("create")}
              >
                Create
              </button>
              <button
                type="button"
                className={`btn btn-sm flex-fill ${activeView === "my-tickets" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
                onClick={() => onViewChange("my-tickets")}
              >
                My Tickets
              </button>
            </>
          )}
        </div>
      )}
    </header>
  );
}
