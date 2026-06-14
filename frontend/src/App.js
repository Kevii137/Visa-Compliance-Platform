import "@/App.css";
import "@/index.css";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "./components/ui/sonner";

// Pages
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Regulations from "./pages/Regulations";
import Controls from "./pages/Controls";
import Monitoring from "./pages/Monitoring";
import Incidents from "./pages/Incidents";
import Alerts from "./pages/Alerts";
import Agents from "./pages/Agents";
import Assistant from "./pages/Assistant";
import Evidence from "./pages/Evidence";
import Settings from "./pages/Settings";
import Conflicts from "./pages/Conflicts";
import Insights from "./pages/Insights";

// Layout
import Layout from "./components/Layout";

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Public Route Component (redirect to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={
        <PublicRoute>
          <Login />
        </PublicRoute>
      } />
      <Route path="/register" element={
        <PublicRoute>
          <Register />
        </PublicRoute>
      } />
      
      {/* Protected Routes */}
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="regulations" element={<Regulations />} />
        <Route path="controls" element={<Controls />} />
        <Route path="monitoring" element={<Monitoring />} />
        <Route path="incidents" element={<Incidents />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="agents" element={<Agents />} />
        <Route path="assistant" element={<Assistant />} />
        <Route path="evidence" element={<Evidence />} />
        <Route path="conflicts" element={<Conflicts />} />
        <Route path="insights" element={<Insights />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App dark">
      <AuthProvider>
        <HashRouter>
          <AppRoutes />
        </HashRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
