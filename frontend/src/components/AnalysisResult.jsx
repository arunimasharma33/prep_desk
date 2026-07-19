import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import ScoreGauge from "./ScoreGauge";

export default function AnalysisResult() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("technical");

  useEffect(() => {
    setData(null);
    setError("");
    api.getAnalysis(id).then(setData).catch((err) => {
      setError(err instanceof ApiError ? err.message : "Could not load this analysis.");
    });
  }, [id]);

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }
  if (!data) {
    return (
      <div className="empty-state">
        <span className="spinner dark" />
        <p style={{ marginTop: 10 }}>Loading analysis…</p>
      </div>
    );
  }

  const r = data.result;
  const questions = tab === "technical" ? r.technical_questions : r.behavioral_questions;

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Step 2 of 3 · Readiness report</div>
      <h1 className="section-title">{data.job_title}</h1>
      <p className="section-lede">{r.score_explanation || "Full breakdown of the role and your fit."}</p>

      <div className="card" style={{ display: "flex", gap: 32, flexWrap: "wrap", alignItems: "center" }}>
        <ScoreGauge score={data.match_score} />
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ marginBottom: 16 }}>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Matched skills</div>
            <div className="tag-row">
              {r.matched_skills?.length ? r.matched_skills.map((s) => (
                <span key={s} className="tag">{s}</span>
              )) : <span style={{ color: "var(--ink-faint)", fontSize: 13 }}>None detected yet.</span>}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ marginBottom: 8 }}>Skill gaps</div>
            <div className="tag-row">
              {r.missing_skills?.length ? r.missing_skills.map((s) => (
                <span key={s} className="tag missing">{s}</span>
              )) : <span style={{ color: "var(--ink-faint)", fontSize: 13 }}>None found — nice.</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: 20 }}>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Strengths</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7, color: "var(--ink-soft)" }}>
            {r.strengths?.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
        <div className="card">
          <div className="eyebrow" style={{ marginBottom: 10 }}>Focus areas</div>
          <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.7, color: "var(--ink-soft)" }}>
            {r.improvement_areas?.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div className="eyebrow">Likely interview questions</div>
          <div className="nav-tabs">
            <button
              className={`nav-tab ${tab === "technical" ? "active" : ""}`}
              style={{ border: "none", cursor: "pointer" }}
              onClick={() => setTab("technical")}
            >
              Technical ({r.technical_questions?.length || 0})
            </button>
            <button
              className={`nav-tab ${tab === "behavioral" ? "active" : ""}`}
              style={{ border: "none", cursor: "pointer" }}
              onClick={() => setTab("behavioral")}
            >
              Behavioral ({r.behavioral_questions?.length || 0})
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {questions?.map((q, i) => (
            <div key={i} style={{
              padding: "12px 14px", borderRadius: 10, background: "var(--paper)",
              border: "1px solid var(--line-soft)", fontSize: 14, lineHeight: 1.5,
              display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12,
            }}>
              <div>
                <div style={{ marginBottom: 6 }}>{q.question}</div>
                <span className="tag gold">{tab === "technical" ? (q.topic || "General") : (q.competency || "General")}</span>
                {tab === "technical" && q.difficulty && (
                  <span className="tag" style={{ marginLeft: 6 }}>{q.difficulty}</span>
                )}
              </div>
              <CopyButton text={q.question} />
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 24, flexWrap: "wrap" }}>
        <button className="btn btn-primary" onClick={() => navigate(`/plan/new?analysis=${id}`)}>
          Build my study plan →
        </button>
        <button className="btn btn-secondary" onClick={() => navigate(`/resume/new?analysis=${id}`)}>
          Improve my resume →
        </button>
        <Link to="/new" className="btn btn-ghost">Analyze another role</Link>
      </div>
    </div>
  );
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard not available - fail silently */
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy question"
      className="btn btn-ghost btn-sm"
      style={{ flexShrink: 0, padding: "6px 10px" }}
    >
      {copied ? "Copied ✓" : "Copy"}
    </button>
  );
}
