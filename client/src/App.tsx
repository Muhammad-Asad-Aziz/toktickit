import { useState } from "react";
import * as api from "./api.js";
import { Category } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import AppHeader from "./components/AppHeader.js";
import RequesterModal from "./components/RequesterModal.js";
import CreateTicketForm from "./components/CreateTicketForm.js";
import MyTickets from "./components/MyTickets.js";
import RequesterTicketDetail from "./components/RequesterTicketDetail.js";

type UiState = "idle" | "loading" | "success" | "error";

interface AppContentProps {
  initialView?: "create" | "my-tickets" | "detail";
  initialTicketId?: number | null;
}

function AppContent({ initialView = "create", initialTicketId = null }: AppContentProps) {
  const [activeView, setActiveView] = useState<"create" | "my-tickets" | "detail">(initialView);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(initialTicketId);
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const { currentRequester, offlineWarning } = useRequester();

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

  const handleHeaderViewChange = (view: "create" | "my-tickets") => {
    setActiveView(view);
    setSelectedTicketId(null);
  };

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "#F5F7F6" }}>
      <AppHeader
        activeView={activeView === "detail" ? "my-tickets" : activeView}
        onViewChange={handleHeaderViewChange}
      />

      {offlineWarning && (
        <div className="alert alert-warning mb-0 text-center rounded-0 py-2 border-0" role="alert">
          <strong>Network warning:</strong> Unable to synchronize user identity with server. Working offline.
        </div>
      )}

      <main
        className="container py-4 flex-grow-1"
        style={{ maxWidth: activeView === "create" ? 860 : 1320 }}
      >
        {activeView === "create" ? (
          /* Create Ticket Form View (Feature 7 / Feature 3) */
          <div className="mb-4">
            <CreateTicketForm onViewTickets={() => setActiveView("my-tickets")} />
          </div>
        ) : activeView === "detail" && selectedTicketId ? (
          /* Ticket Detail View (Feature 9 / Feature 5) */
          <div className="mb-4">
            <RequesterTicketDetail
              ticketId={selectedTicketId}
              onBack={() => {
                setActiveView("my-tickets");
                setSelectedTicketId(null);
              }}
            />
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

      <RequesterModal />
    </div>
  );
}

export default function App({ initialView = "create", initialTicketId = null }: AppContentProps) {
  return (
    <RequesterProvider>
      <AppContent initialView={initialView} initialTicketId={initialTicketId} />
    </RequesterProvider>
  );
}
