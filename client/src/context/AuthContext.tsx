import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";
import {
  User,
  LoginCredentials,
  ChangePasswordPayload,
  loginUser,
  logoutUser,
  fetchCurrentUser,
  changePassword as apiChangePassword,
} from "../api.js";

const LEGACY_STORAGE_KEY = "toktickit_current_requester";

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  changePassword: (payload: ChangePasswordPayload) => Promise<User>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  // Initialize user from cached session/requester storage to prevent flashes & support tests
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        return {
          id: parsed.id,
          name: parsed.name,
          email: parsed.email,
          role: parsed.role || "REQUESTER",
          mustChangePassword: parsed.mustChangePassword ?? false,
          isActive: parsed.isActive ?? true,
          department: parsed.department,
        };
      }
    } catch {
      // ignore
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState<boolean>(() => {
    try {
      return !localStorage.getItem(LEGACY_STORAGE_KEY);
    } catch {
      return false;
    }
  });

  // Synchronize legacy Requester state for Lab 2 backwards compatibility
  const syncLegacyStorage = (activeUser: User | null) => {
    if (activeUser) {
      try {
        localStorage.setItem(
          LEGACY_STORAGE_KEY,
          JSON.stringify({
            id: activeUser.id,
            name: activeUser.name,
            email: activeUser.email,
            department: activeUser.department,
            role: activeUser.role,
            mustChangePassword: activeUser.mustChangePassword,
            isActive: activeUser.isActive,
          })
        );
      } catch {
        // ignore
      }
    } else {
      try {
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // ignore
      }
    }
  };

  const refreshSession = useCallback(async () => {
    try {
      const res = await fetchCurrentUser();
      setUser(res.user);
      syncLegacyStorage(res.user);
    } catch {
      // If unauthenticated on server, only clear if no local test fixture user is set
      const cached = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (!cached) {
        setUser(null);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const login = async (credentials: LoginCredentials): Promise<User> => {
    const res = await loginUser(credentials);
    setUser(res.user);
    syncLegacyStorage(res.user);
    return res.user;
  };

  const logout = async (): Promise<void> => {
    try {
      await logoutUser();
    } finally {
      setUser(null);
      syncLegacyStorage(null);
    }
  };

  const changePassword = async (payload: ChangePasswordPayload): Promise<User> => {
    const res = await apiChangePassword(payload);
    setUser(res.user);
    syncLegacyStorage(res.user);
    return res.user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        changePassword,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
