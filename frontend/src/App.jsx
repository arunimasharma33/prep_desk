import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./lib/auth-context";
import Layout from "./components/Layout";
import PublicLayout from "./components/PublicLayout";
import Landing from "./components/Landing";
import AuthPage from "./components/AuthPage";
import ForgotPassword from "./components/ForgotPassword";
import NewAnalysis from "./components/NewAnalysis";
import AnalysisResult from "./components/AnalysisResult";
import PlanNew from "./components/PlanNew";
import PlanView from "./components/PlanView";
import ResumeBuilder from "./components/ResumeBuilder";
import ResumeDetail from "./components/ResumeDetail";
import History from "./components/History";

function Protected({ children }) {
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="shell">
        <div className="empty-state">
          <span className="spinner dark" />
        </div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<PublicLayout><AuthPage mode="login" /></PublicLayout>} />
      <Route path="/register" element={<PublicLayout><AuthPage mode="register" /></PublicLayout>} />
      <Route path="/forgot-password" element={<PublicLayout><ForgotPassword /></PublicLayout>} />

      <Route path="/new" element={<Protected><NewAnalysis /></Protected>} />
      <Route path="/analysis/:id" element={<Protected><AnalysisResult /></Protected>} />

      <Route path="/plan/new" element={<Protected><PlanNew /></Protected>} />
      <Route path="/plan/:id" element={<Protected><PlanView /></Protected>} />

      <Route path="/resume/new" element={<Protected><ResumeBuilder /></Protected>} />
      <Route path="/resume/saved/:id" element={<Protected><ResumeDetail /></Protected>} />

      <Route path="/history" element={<Protected><History /></Protected>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
