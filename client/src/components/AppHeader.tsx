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
      className="navbar navbar-expand-lg px-2 px-sm-3 py-2 text-white shadow-sm app-header-root"
      style={{ backgroundColor: "var(--zen-primary-green, #006B3C)" }}
    >
      <div className="container-fluid d-flex flex-wrap align-items-center justify-content-between p-0">
        {/* Brand identity */}
        <div className="d-flex align-items-center app-header-brand">
          <h1 className="navbar-brand text-white fw-bold d-flex align-items-center mb-0 fs-5 fs-sm-4 me-0">
            <span className="me-2">TokTickIT</span>
            <span className="badge bg-light text-dark fw-normal opacity-75 fs-6 d-none d-sm-inline-block">
              IT Service Desk
            </span>
          </h1>
        </div>

        {/* User Profile & Logout - Fixed to top right across all breakpoints */}
        <div className="d-flex align-items-center gap-2 app-header-user ms-auto">
          {user ? (
            <>
              <div
                className="d-flex align-items-center gap-1 gap-sm-2"
                data-testid="user-profile-badge"
              >
                <span className="text-white d-inline-flex align-items-center small">
                  <span className="me-1" aria-hidden="true">👤</span>
                  <span
                    className="fw-semibold text-truncate user-name-display-truncate"
                    data-testid="user-name-display"
                  >
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
                className="btn btn-outline-light btn-sm ms-1 px-2 py-1 header-logout-btn"
                onClick={() => logout()}
                data-testid="logout-button"
              >
                Logout
              </button>
            </>
          ) : null}
        </div>

        {/* Main Navigation - Integrated inline on Desktop (>= 992px), Dedicated Tab Bar on Tablet & Mobile (< 992px) */}
        {user && onViewChange && (
          <nav
            className="app-header-nav d-flex align-items-center"
            aria-label="Main Navigation"
          >
            {user.role === "REQUESTER" && (
              <>
                <button
                  type="button"
                  className={`btn btn-sm header-nav-tab ${activeView === "create" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
                  onClick={() => onViewChange("create")}
                  data-testid="nav-create-ticket"
                >
                  Create Ticket
                </button>
                <button
                  type="button"
                  className={`btn btn-sm header-nav-tab ${activeView === "my-tickets" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
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
                  className={`btn btn-sm header-nav-tab ${activeView === "staff-queue" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
                  onClick={() => onViewChange("staff-queue")}
                  data-testid="nav-staff-queue"
                >
                  Staff Queue
                </button>
                <button
                  type="button"
                  className={`btn btn-sm header-nav-tab ${activeView === "create" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
                  onClick={() => onViewChange("create")}
                  data-testid="nav-create-ticket"
                >
                  Create Ticket
                </button>
                <button
                  type="button"
                  className={`btn btn-sm header-nav-tab ${activeView === "my-tickets" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
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
                  className={`btn btn-sm header-nav-tab ${activeView === "user-admin" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
                  onClick={() => onViewChange("user-admin")}
                  data-testid="nav-user-admin"
                >
                  User Admin
                </button>
                <button
                  type="button"
                  className={`btn btn-sm header-nav-tab ${activeView === "staff-queue" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
                  onClick={() => onViewChange("staff-queue")}
                  data-testid="nav-staff-queue"
                >
                  Staff Queue
                </button>
                <button
                  type="button"
                  className={`btn btn-sm header-nav-tab ${activeView === "my-tickets" ? "btn-light fw-bold text-success" : "btn-outline-light text-white"}`}
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
    </header>
  );
}
