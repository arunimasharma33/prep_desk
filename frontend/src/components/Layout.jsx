import { NavLink, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import Logo from "./Logo";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="shell">
      <header className="topbar" style={{ borderBottom: "1px solid var(--line)" }}>
        <Link to="/" className="brand" style={{ textDecoration: "none" }}>
          <Logo size={30} />
          Prep Desk
        </Link>

        {user && (
          <nav className="nav-tabs">
            <NavLink to="/new" className={({ isActive }) => `nav-tab${isActive ? " active" : ""}`}>
              New Analysis
            </NavLink>
            <NavLink to="/resume/new" className={({ isActive }) => `nav-tab${isActive ? " active" : ""}`}>
              Resume Builder
            </NavLink>
            <NavLink to="/history" className={({ isActive }) => `nav-tab${isActive ? " active" : ""}`}>
              History
            </NavLink>
          </nav>
        )}

        {user ? (
          <div className="user-chip">
            <span>{user.name}</span>
            <button onClick={handleLogout}>Log out</button>
          </div>
        ) : (
          <div className="user-chip" />
        )}
      </header>
      <main>{children}</main>
    </div>
  );
}
