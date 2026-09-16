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

type UiState = "idle" | "loading" | "success" | "error";

interface AppContentProps {
  initialView?: "create" | "my-tickets" | "detail" | "staff-queue";
  initialTicketId?: number | null;
}

function AppContent({ initialView, initialTicketId = null }: AppContentProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [activeView, setActiveView] = useState<"create" | "my-tickets" | "detail" | "staff-queue">(
    initialView || (user && (user.role === "IT_STAFF" || user.role === "ADMINISTRATOR") ? "staff-queue" : "create")
  );
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(initialTicketId);
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);

  // Default staff and admin users to staff-queue if no explicit initialView
  useEffect(() => {
    if (!initialView && user && (user.role === "IT_STAFF" || user.role === "ADMINISTRATOR")) {
      setActiveView("staff-queue");
    }
  }, [user, initialView]);

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

  const handleHeaderViewChange = (view: "create" | "my-tickets" | "staff-queue") => {
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
        className="container py-4 flex-grow-1"
        style={{ maxWidth: activeView === "create" ? 860 : 1320 }}
      >
        {activeView === "create" ? (
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

export default function App({ initialView = "create", initialTicketId = null }: AppContentProps) {
  return (
    <AuthProvider>
      <RequesterProvider>
        <AppContent initialView={initialView} initialTicketId={initialTicketId} />
      </RequesterProvider>
    </AuthProvider>
  );
}
