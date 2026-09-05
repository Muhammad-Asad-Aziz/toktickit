import { useState } from "react";
import { checkSystem, Category } from "./api.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import AppHeader from "./components/AppHeader.js";
import RequesterModal from "./components/RequesterModal.js";

import CreateTicketForm from "./components/CreateTicketForm.js";

type UiState = "idle" | "loading" | "success" | "error";

function AppContent() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const { currentRequester, offlineWarning } = useRequester();


  async function handleCheck() {
    setState("loading");
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch {
      setState("error");
    }
  }

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "#F5F7F6" }}>
      <AppHeader />

      {offlineWarning && (
        <div className="alert alert-warning mb-0 text-center rounded-0 py-2 border-0" role="alert">
          <strong>Network warning:</strong> Unable to synchronize user identity with server. Working offline.
        </div>
      )}

      <main className="container py-4 flex-grow-1" style={{ maxWidth: 860 }}>
        {/* Create Ticket Form (Feature 7 / Feature 3) */}
        <div className="mb-4">
          <CreateTicketForm />
        </div>

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


export default function App() {
  return (
    <RequesterProvider>
      <AppContent />
    </RequesterProvider>
  );
}
