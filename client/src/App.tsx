import { useState, useEffect } from "react";
import * as api from "./api.js";
import { Category } from "./api.js";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { RequesterProvider } from "./context/RequesterContext.js";
import AppHeader from "./components/AppHeader.js";
import LoginView from "./components/LoginView.js";
import ChangePasswordView from "./components/ChangePasswordView.js";
import CreateTicketForm from "./components/CreateTicketForm.js";
import MyTickets from "./components/MyTickets.js";
import RequesterTicketDetail from "./components/RequesterTicketDetail.js";
import StaffTicketQueue from "./components/StaffTicketQueue.js";
import StaffTicketDetail from "./components/StaffTicketDetail.js";
import UserManagement from "./components/UserManagement.js";
import RequesterDashboard from "./components/RequesterDashboard.js";
import StaffDashboard from "./components/StaffDashboard.js";

type UiState = "idle" | "loading" | "success" | "error";

interface AppContentProps {
  initialView?: "dashboard" | "create" | "my-tickets" | "detail" | "staff-queue" | "user-admin";
  initialTicketId?: number | null;
}

function AppContent({ initialView, initialTicketId = null }: AppContentProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  type ActiveView = "dashboard" | "create" | "my-tickets" | "detail" | "staff-queue" | "user-admin";
  const [activeView, setActiveView] = useState<ActiveView>(
    initialView || (user?.isLegacyRequester ? "create" : "dashboard")
  );
  const [drillDownFilters, setDrillDownFilters] = useState<{
    status?: string;
    owner?: string;
    itPriority?: string;
  }>({});
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(initialTicketId);
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

  // Default post-login landing view to role-appropriate dashboard (AC-21.5, BR-14)
  useEffect(() => {
    if (!initialView && user) {
      setActiveView(user.isLegacyRequester ? "create" : "dashboard");
    }
  }, [user?.id, user?.role, initialView]);

  async function handleCheck() {
    setState("loading");
    try {
      const result = await api.checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch {
      setState("error");
    }
  }

  const handleHeaderViewChange = (view: ActiveView) => {
    setDrillDownFilters({});
    setActiveView(view);
    setSelectedTicketId(null);
  };

  // 1. Initial Session Loading State
  if (isLoading) {
    return (
      <div
        className="min-vh-100 d-flex flex-column justify-content-center align-items-center"
        style={{ backgroundColor: "#F5F7F6" }}
        data-testid="app-loading-state"
      >
        <div className="spinner-border text-success" role="status" style={{ width: "3rem", height: "3rem" }}>
          <span className="visually-hidden">Loading TokTickIT...</span>
        </div>
        <p className="mt-3 text-muted">Loading TokTickIT Desk...</p>
      </div>
    );
  }

  // 2. Unauthenticated State -> Render Login View
  if (!isAuthenticated || !user) {
    return (
      <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "#F5F7F6" }}>
        <AppHeader />
        <main className="container py-4 flex-grow-1">
          <LoginView />
        </main>
      </div>
    );
  }

  // 3. Mandatory First-Login Password Change Barrier (BR-02)
  if (user.mustChangePassword) {
    return (
      <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "#F5F7F6" }}>
        <AppHeader />
        <main className="container py-4 flex-grow-1">
          <ChangePasswordView />
        </main>
      </div>
    );
  }

  // 4. Authenticated Operational Views
  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "#F5F7F6" }}>
      <a href="#main-content" className="skip-link">Skip to main content</a>
      <AppHeader
        activeView={
          activeView === "detail"
            ? user.role === "REQUESTER"
              ? "my-tickets"
              : "staff-queue"
            : activeView
        }
        onViewChange={handleHeaderViewChange}
      />

      <main
        id="main-content"
        className="container py-4 flex-grow-1"
        style={{ maxWidth: activeView === "create" ? 860 : 1320 }}
      >
        {activeView === "dashboard" ? (
          /* Role-Based Dashboard View (Issue 21) */
          user.role === "REQUESTER" ? (
            <div className="mb-4">
              <RequesterDashboard
                onCreateTicket={() => {
                  setActiveView("create");
                  setSelectedTicketId(null);
                }}
                onNavigateToMyTickets={(status) => {
                  setDrillDownFilters(status ? { status } : {});
                  setActiveView("my-tickets");
                  setSelectedTicketId(null);
                }}
                onViewTicket={(ticketId) => {
                  setSelectedTicketId(ticketId);
                  setActiveView("detail");
                }}
              />
            </div>
          ) : (
            <div className="mb-4">
              <StaffDashboard
                onCreateTicket={() => {
                  setActiveView("create");
                  setSelectedTicketId(null);
                }}
                onNavigateToQueue={(filters) => {
                  setDrillDownFilters(filters || {});
                  setActiveView("staff-queue");
                  setSelectedTicketId(null);
                }}
                onViewTicket={(ticketId) => {
                  setSelectedTicketId(ticketId);
                  setActiveView("detail");
                }}
                onManageUsers={() => {
                  setActiveView("user-admin");
                  setSelectedTicketId(null);
                }}
              />
            </div>
          )
        ) : activeView === "user-admin" && user.role === "ADMINISTRATOR" ? (
          /* Administrator User Management View (Issue 15) */
          <div className="mb-4">
            <UserManagement />
          </div>
        ) : activeView === "create" ? (
          /* Create Ticket Form View (Feature 7 / Feature 3) */
          <div className="mb-4">
            <CreateTicketForm
              onViewTickets={() =>
                setActiveView(user.role === "REQUESTER" ? "my-tickets" : "staff-queue")
              }
            />
          </div>
        ) : activeView === "staff-queue" ? (
          /* IT Staff Ticket Queue View (Issue 13 / Feature 3) */
          <div className="mb-4">
            <StaffTicketQueue
              initialStatusFilter={drillDownFilters.status}
              initialOwnerFilter={drillDownFilters.owner}
              initialPriorityFilter={drillDownFilters.itPriority}
              onViewTicket={(ticketId) => {
                setSelectedTicketId(ticketId);
                setActiveView("detail");
              }}
            />
          </div>
        ) : activeView === "detail" && selectedTicketId ? (
          /* Ticket Detail View (Issue 14 Staff / Requester) */
          <div className="mb-4">
            {user.role === "REQUESTER" ? (
              <RequesterTicketDetail
                ticketId={selectedTicketId}
                onBack={() => {
                  setActiveView("my-tickets");
                  setSelectedTicketId(null);
                }}
              />
            ) : (
              <StaffTicketDetail
                ticketId={selectedTicketId}
                onBack={() => {
                  setActiveView("staff-queue");
                  setSelectedTicketId(null);
                }}
              />
            )}
          </div>
        ) : (
          /* My Tickets View (Feature 8 / Feature 4) */
          <div className="mb-4">
            <MyTickets
              initialStatusFilter={drillDownFilters.status}
              onCreateTicket={() => setActiveView("create")}
              onViewTicket={(ticketId) => {
                setSelectedTicketId(ticketId);
                setActiveView("detail");
              }}
            />
          </div>
        )}

        {/* System Status / Health Check (Preserved Lab 1 Baseline) */}
        <div className="card shadow-sm border-0" style={{ borderRadius: 8 }}>
          <div className="card-body p-4">
            <h2 className="h4 mb-4">
              System Verification <span className="text-success">& Status</span>
            </h2>

            <button
              className="btn btn-success"
              onClick={handleCheck}
              disabled={state === "loading"}
              style={{ backgroundColor: "#006B3C" }}
            >
              {state === "loading" ? "Loading…" : "Check System"}
            </button>

            {state === "success" && (
              <div className="mt-4">
                <p>System Status: Online</p>
                <p className="mt-3 mb-2">Supported Request Categories:</p>
                <ol>
                  {categories.map((category) => (
                    <li key={category.id}>{category.name}</li>
                  ))}
                </ol>
              </div>
            )}

            {state === "error" && (
              <div className="mt-4">
                <p>System Status: Offline</p>
                <p>Unable to connect to TokTickIT API</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default function App({ initialView, initialTicketId = null }: AppContentProps) {
  return (
    <AuthProvider>
      <RequesterProvider>
        <AppContent initialView={initialView} initialTicketId={initialTicketId} />
      </RequesterProvider>
    </AuthProvider>
  );
}
