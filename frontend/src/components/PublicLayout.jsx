import { Link } from "react-router-dom";
import Logo from "./Logo";

export default function PublicLayout({ children }) {
  return (
    <div className="shell">
      <header className="topbar" style={{ borderBottom: "none", marginBottom: 12 }}>
        <Link to="/" className="brand" style={{ textDecoration: "none" }}>
          <Logo size={30} />
          Prep Desk
        </Link>
      </header>
      <main>{children}</main>
    </div>
  );
}
