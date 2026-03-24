import { useState, useEffect, useCallback } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

// Pages
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Transactions from "./pages/Transactions";
import Debts from "./pages/Debts";
import Savings from "./pages/Savings";
import Reports from "./pages/Reports";
import Survey from "./pages/Survey";
import Profile from "./pages/Profile";
import AuthCallback from "./pages/AuthCallback";
import Admin from "./pages/Admin";
import Community from "./pages/Community";

// Components
import Layout from "./components/Layout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
import { createContext, useContext } from "react";

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(() => sessionStorage.getItem('is_impersonating') === 'true');
  const [impersonatedUser, setImpersonatedUser] = useState(() => {
    const stored = sessionStorage.getItem('impersonated_user');
    return stored ? JSON.parse(stored) : null;
  });

  const checkAuth = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, {
        withCredentials: true,
      });
      setUser(response.data);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
    } catch (error) {
      console.error("Logout error:", error);
    }
    setUser(null);
  };

  const startImpersonation = async (userId) => {
    try {
      const response = await axios.post(`${API}/admin/impersonate/${userId}`, {}, { withCredentials: true });
      const { user: targetUser } = response.data;
      // Backend already set the new httponly cookie — just save state
      sessionStorage.setItem('admin_user', JSON.stringify(user));
      sessionStorage.setItem('is_impersonating', 'true');
      sessionStorage.setItem('impersonated_user', JSON.stringify(targetUser));
      // Fetch the impersonated user's full data using the new cookie
      const meResponse = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setImpersonatedUser(targetUser);
      setIsImpersonating(true);
      setUser(meResponse.data);
      return true;
    } catch (error) {
      console.error("Impersonation error:", error);
      return false;
    }
  };

  const stopImpersonation = async () => {
    try {
      // Backend restores admin cookie and deletes impersonation session
      await axios.post(`${API}/admin/stop-impersonation`, {}, { withCredentials: true });
      sessionStorage.removeItem('admin_user');
      sessionStorage.removeItem('is_impersonating');
      sessionStorage.removeItem('impersonated_user');
      setIsImpersonating(false);
      setImpersonatedUser(null);
      // Re-fetch admin user from restored cookie
      await checkAuth();
    } catch (error) {
      console.error("Stop impersonation error:", error);
      sessionStorage.removeItem('admin_user');
      sessionStorage.removeItem('is_impersonating');
      sessionStorage.removeItem('impersonated_user');
      setIsImpersonating(false);
      setImpersonatedUser(null);
      await checkAuth();
    }
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, checkAuth, isImpersonating, impersonatedUser, startImpersonation, stopImpersonation }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children }) => {
  const { user, loading, isImpersonating } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  // If user hasn't completed survey, redirect to survey (skip during impersonation)
  useEffect(() => {
    if (user && !user.has_completed_survey && location.pathname !== "/survey" && !isImpersonating) {
      navigate("/survey", { replace: true });
    }
  }, [user, location.pathname, navigate, isImpersonating]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
};

function AppRouter() {
  const location = useLocation();

  // Check URL fragment for session_id synchronously during render
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route
        path="/survey"
        element={
          <ProtectedRoute>
            <Survey />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/transactions"
        element={
          <ProtectedRoute>
            <Layout>
              <Transactions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/debts"
        element={
          <ProtectedRoute>
            <Layout>
              <Debts />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/savings"
        element={
          <ProtectedRoute>
            <Layout>
              <Savings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <Layout>
              <Admin />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/community"
        element={
          <ProtectedRoute>
            <Layout>
              <Community />
            </Layout>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <AppRouter />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
