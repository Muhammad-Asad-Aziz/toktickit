import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { RequesterUser, fetchRequesters } from "../api.js";

const STORAGE_KEY = "toktickit_current_requester";

export interface RequesterContextType {
  currentRequester: RequesterUser | null;
  requesters: RequesterUser[];
  isLoading: boolean;
  error: string | null;
  offlineWarning: boolean;
  isModalOpen: boolean;
  setCurrentRequester: (user: RequesterUser) => void;
  openModal: () => void;
  closeModal: () => void;
  refreshRequesters: () => Promise<void>;
}

const RequesterContext = createContext<RequesterContextType | undefined>(undefined);

export function RequesterProvider({ children }: { children: ReactNode }) {
  const [currentRequester, setCurrentRequesterState] = useState<RequesterUser | null>(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });

  const [requesters, setRequesters] = useState<RequesterUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offlineWarning, setOfflineWarning] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  async function loadRequesters() {
    setIsLoading(true);
    setError(null);
    setOfflineWarning(false);
    try {
      const data = await fetchRequesters();
      setRequesters(data);

      // Bootstrap Cache Validation Rule (§5.2.4)
      const cachedRaw = localStorage.getItem(STORAGE_KEY);
      let cachedUser: RequesterUser | null = null;
      try {
        cachedUser = cachedRaw ? JSON.parse(cachedRaw) : null;
      } catch {
        cachedUser = null;
      }

      if (cachedUser) {
        const stillActive = data.some((u) => u.id === cachedUser!.id && u.isActive);
        if (!stillActive) {
          // Stale cache: User was deleted, reset, or deactivated
          localStorage.removeItem(STORAGE_KEY);
          setCurrentRequesterState(null);
          setIsModalOpen(true);
        } else {
          // Refresh user context with active data from DB
          const freshUser = data.find((u) => u.id === cachedUser!.id);
          if (freshUser) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(freshUser));
            setCurrentRequesterState(freshUser);
          }
          setIsModalOpen(false);
        }
      } else {
        // No user cached: Open selection modal
        setIsModalOpen(true);
      }
    } catch {
      setError("Failed to fetch development requesters");
      const cachedRaw = localStorage.getItem(STORAGE_KEY);
      if (cachedRaw) {
        setOfflineWarning(true);
      } else {
        setIsModalOpen(true);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadRequesters();
  }, []);

  function setCurrentRequester(user: RequesterUser) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setCurrentRequesterState(user);
    setIsModalOpen(false);
  }

  function openModal() {
    setIsModalOpen(true);
  }

  function closeModal() {
    if (currentRequester) {
      setIsModalOpen(false);
    }
  }

  return (
    <RequesterContext.Provider
      value={{
        currentRequester,
        requesters,
        isLoading,
        error,
        offlineWarning,
        isModalOpen,
        setCurrentRequester,
        openModal,
        closeModal,
        refreshRequesters: loadRequesters,
      }}
    >
      {children}
    </RequesterContext.Provider>
  );
}

export function useRequester() {
  const context = useContext(RequesterContext);
  if (!context) {
    throw new Error("useRequester must be used within a RequesterProvider");
  }
  return context;
}
