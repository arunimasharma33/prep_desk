import { Link } from "react-router-dom";
import { useAuth } from "../lib/auth-context";
import Logo from "./Logo";

const FEATURES = [
  {
    icon: "◎",
    title: "Instant fit score",
    desc: "Paste a job description and your resume — get a 0–100 match score with a plain-English breakdown of why.",
  },
  {
    icon: "?",
    title: "Likely interview questions",
    desc: "Technical and behavioral questions generated from the actual JD and your specific skill gaps, not generic banks.",
  },
  {
    icon: "▤",
    title: "Day-by-day study plan",
    desc: "Tell it how many days you have left. Get a prioritized plan with a built-in progress tracker.",
  },
  {
    icon: "⟳",
    title: "ATS resume rewrite",
    desc: "Your existing resume, restructured and rephrased around the role's requirements — never fabricated.",
  },
  {
    icon: "▢",
    title: "3 resume templates",
    desc: "Preview each layout with your real content before you commit, then export a clean, ATS-ready PDF.",
  },
  {
    icon: "⌘",
    title: "Everything saved",
    desc: "Every analysis, plan, and resume version lives in your account history — pick up where you left off.",
  },
];

const STEPS = [
  { title: "Paste the JD", desc: "Add the job title, description, and your resume (or a short profile)." },
  { title: "Get your score", desc: "See your match score, skill gaps, and the questions you'll likely face." },
  { title: "Follow the plan", desc: "A day-by-day countdown plan tuned to how much time you have left." },
  { title: "Ship your resume", desc: "Preview, tweak, and download an ATS-friendly PDF tailored to the role." },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div>
      <header className="landing-header">
        <div className="brand">
          <Logo size={30} />
          Prep Desk
        </div>
        <div className="landing-header-actions">
          {user ? (
            <Link to="/new" className="btn btn-primary btn-sm">Go to dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Get started free</Link>
            </>
          )}
        </div>
      </header>

      <section className="hero">
        <div>
          <div className="hero-badge">● AI-Powered Interview Prep</div>
          <h1>
            Walk into every interview <span className="accent">already prepared.</span>
          </h1>
          <p className="hero-lede">
            Paste any job description and your resume. Get a match score, the exact questions you're
            likely to face, a day-by-day study plan, and a rewritten ATS-ready resume — all in one place.
          </p>
          <div className="hero-ctas">
            <Link to={user ? "/new" : "/register"} className="btn btn-primary">
              {user ? "Start a new analysis" : "Get started free"} →
            </Link>
            <Link to={user ? "/history" : "/login"} className="btn btn-secondary">
              {user ? "View my history" : "Sign in"}
            </Link>
          </div>
          <div className="hero-trust">
            <span className="hero-trust-item">✓ No credit card</span>
            <span className="hero-trust-item">✓ Your data stays in your account</span>
            <span className="hero-trust-item">✓ ATS-ready resume export</span>
          </div>
        </div>

        <div className="hero-visual">
          <MockScoreCard />
        </div>
      </section>

      <section className="section">
        <div className="section-header">
          <div className="eyebrow">What you get</div>
          <h2>One workflow, from job post to offer</h2>
          <p>No more juggling five tabs — scoring, prep, and your resume all update together.</p>
        </div>
        <div className="feature-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="section-header">
          <div className="eyebrow">How it works</div>
          <h2>From job description to ready in four steps</h2>
        </div>
        <div className="steps-row">
          {STEPS.map((s, i) => (
            <div className="step-item" key={s.title}>
              <div className="step-number">{i + 1}</div>
              <h4>{s.title}</h4>
              <p>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="cta-band">
        <h2>Ready to see your match score?</h2>
        <p>It takes about two minutes to get your first readiness report.</p>
        <Link to={user ? "/new" : "/register"} className="btn btn-primary">
          {user ? "Start a new analysis" : "Create your free account"} →
        </Link>
      </div>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Prep Desk</span>
        <span>Made with ❤️ by Arunima</span>
      </footer>
    </div>
  );
}

function MockScoreCard() {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <div className="eyebrow">Readiness report</div>
        <span className="tag">Senior Backend Engineer</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 22 }}>
        <div style={{
          width: 88, height: 88, borderRadius: "50%",
          background: `conic-gradient(var(--teal) 0deg 295deg, var(--line) 295deg 360deg)`,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <div style={{
            width: 68, height: 68, borderRadius: "50%", background: "#fff",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <span style={{ fontSize: 22, fontWeight: 800 }}>82</span>
            <span style={{ fontSize: 9, color: "var(--ink-faint)", fontWeight: 700 }}>MATCH</span>
          </div>
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4, color: "var(--teal-deep)" }}>Strong match</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-soft)", lineHeight: 1.5 }}>
            Solid overlap on core backend and infra skills, with a couple of cloud gaps to close.
          </div>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
          Skill gaps
        </div>
        <div className="tag-row">
          <span className="tag missing">Kubernetes</span>
          <span className="tag missing">Terraform</span>
        </div>
      </div>
      <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--paper)", border: "1px solid var(--line-soft)", fontSize: 13 }}>
        "Explain how you'd design a rate limiter for a public API." <span className="tag gold" style={{ marginLeft: 6 }}>System Design</span>
      </div>
    </div>
  );
}
