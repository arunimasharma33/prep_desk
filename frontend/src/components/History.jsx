import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";

function fmtDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export default function History() {
  const [tab, setTab] = useState("analyses");
  const [analyses, setAnalyses] = useState(null);
  const [plans, setPlans] = useState(null);
  const [resumes, setResumes] = useState(null);

  function refresh() {
    api.listAnalyses().then(setAnalyses).catch(() => setAnalyses([]));
    api.listPlans().then(setPlans).catch(() => setPlans([]));
    api.listResumes().then(setResumes).catch(() => setResumes([]));
  }

  useEffect(refresh, []);

  async function del(kind, id) {
    if (kind === "analyses") await api.deleteAnalysis(id);
    if (kind === "plans") await api.deletePlan(id);
    if (kind === "resumes") await api.deleteResume(id);
    refresh();
  }

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Your history</div>
      <h1 className="section-title">Everything you've prepared</h1>
      <p className="section-lede">Every analysis, plan, and resume version is saved to your account automatically.</p>

      <div className="nav-tabs" style={{ marginBottom: 20, width: "fit-content" }}>
        <button className={`nav-tab ${tab === "analyses" ? "active" : ""}`} style={{ border: "none", cursor: "pointer" }} onClick={() => setTab("analyses")}>
          Analyses {analyses ? `(${analyses.length})` : ""}
        </button>
        <button className={`nav-tab ${tab === "plans" ? "active" : ""}`} style={{ border: "none", cursor: "pointer" }} onClick={() => setTab("plans")}>
          Study plans {plans ? `(${plans.length})` : ""}
        </button>
        <button className={`nav-tab ${tab === "resumes" ? "active" : ""}`} style={{ border: "none", cursor: "pointer" }} onClick={() => setTab("resumes")}>
          Resumes {resumes ? `(${resumes.length})` : ""}
        </button>
      </div>

      {tab === "analyses" && (
        <ListBlock
          items={analyses}
          empty="No analyses yet — run your first job match."
          renderRow={(a) => (
            <Row key={a.id}
              title={a.job_title}
              subtitle={`${a.company ? a.company + " · " : ""}${fmtDate(a.created_at)}`}
              badge={a.match_score !== null && a.match_score !== undefined ? `${Math.round(a.match_score)}% match` : "No score"}
              to={`/analysis/${a.id}`}
              onDelete={() => del("analyses", a.id)}
            />
          )}
        />
      )}

      {tab === "plans" && (
        <ListBlock
          items={plans}
          empty="No study plans yet."
          renderRow={(p) => {
            const done = Object.values(p.progress || {}).filter(Boolean).length;
            return (
              <Row key={p.id}
                title={`${p.days}-day plan`}
                subtitle={fmtDate(p.created_at)}
                badge={`${done}/${p.days} complete`}
                to={`/plan/${p.id}`}
                onDelete={() => del("plans", p.id)}
              />
            );
          }}
        />
      )}

      {tab === "resumes" && (
        <ListBlock
          items={resumes}
          empty="No saved resumes yet."
          renderRow={(r) => (
            <Row key={r.id}
              title={r.title}
              subtitle={`${r.template} · ${fmtDate(r.created_at)}`}
              badge="View"
              to={`/resume/saved/${r.id}`}
              onDelete={() => del("resumes", r.id)}
            />
          )}
        />
      )}
    </div>
  );
}

function ListBlock({ items, empty, renderRow }) {
  if (items === null) return <div className="empty-state"><span className="spinner dark" /></div>;
  if (items.length === 0) return <div className="empty-state"><div className="icon">—</div><p>{empty}</p></div>;
  return <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{items.map(renderRow)}</div>;
}

function Row({ title, subtitle, badge, to, onDelete }) {
  return (
    <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px" }}>
      <Link to={to} style={{ textDecoration: "none", color: "var(--ink)", flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15 }}>{title}</div>
        <div style={{ fontSize: 12.5, color: "var(--ink-faint)", marginTop: 2 }}>{subtitle}</div>
      </Link>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span className="tag gold">{badge}</span>
        <button className="btn btn-ghost btn-sm" onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
