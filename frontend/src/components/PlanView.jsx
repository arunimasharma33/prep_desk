import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";

export default function PlanView() {
  const { id } = useParams();
  const [plan, setPlan] = useState(null);
  const [activeDay, setActiveDay] = useState(1);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    api.getPlan(id).then((p) => { setPlan(p); setActiveDay(p.plan[0]?.day || 1); })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load this plan."));
  }, [id]);

  async function toggleDay(day, completed) {
    setToggling(true);
    try {
      const updated = await api.updateProgress(id, day, completed);
      setPlan(updated);
    } catch { /* noop */ } finally {
      setToggling(false);
    }
  }

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!plan) return <div className="empty-state"><span className="spinner dark" /></div>;

  const done = Object.values(plan.progress || {}).filter(Boolean).length;
  const total = plan.plan.length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const current = plan.plan.find((d) => d.day === activeDay) || plan.plan[0];
  const isDone = !!plan.progress?.[String(current.day)];

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Your countdown</div>
      <h1 className="section-title">{total}-day preparation plan</h1>
      <p className="section-lede">Work through each day, check it off as you go, and watch your readiness climb.</p>

      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
          <span>Progress</span>
          <span style={{ fontWeight: 700 }}>{done} / {total} days</span>
        </div>
        <div style={{ height: 8, borderRadius: 999, background: "var(--line-soft)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "var(--teal)", transition: "width 0.4s ease" }} />
        </div>
      </div>

      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{
          display: "flex", flexDirection: "column", gap: 4, minWidth: 180,
          background: "var(--paper-raised)", border: "1px solid var(--line)", borderRadius: 12, padding: 8,
          maxHeight: 560, overflowY: "auto",
        }}>
          {plan.plan.map((d) => {
            const complete = !!plan.progress?.[String(d.day)];
            const active = d.day === activeDay;
            return (
              <button
                key={d.day}
                onClick={() => setActiveDay(d.day)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                  padding: "10px 12px", borderRadius: 8, border: "none", cursor: "pointer",
                  background: active ? "var(--ink)" : "transparent",
                  color: active ? "#fff" : "var(--ink)",
                }}
              >
                <span style={{
                  width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                  border: `1.5px solid ${active ? "#fff" : "var(--line)"}`,
                  background: complete ? "var(--teal)" : "transparent",
                  borderColor: complete ? "var(--teal)" : undefined,
                }} />
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>Day {d.day}</span>
                <span style={{
                  fontSize: 12, color: active ? "rgba(255,255,255,0.75)" : "var(--ink-faint)",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>{d.title}</span>
              </button>
            );
          })}
        </div>

        <div className="card" style={{ flex: 1, minWidth: 300 }}>
          <div className="eyebrow" style={{ marginBottom: 8 }}>Day {current.day}</div>
          <h2 style={{ fontSize: 22, marginBottom: 14 }}>{current.title}</h2>

          {current.topics?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Topics
              </div>
              <div className="tag-row">{current.topics.map((t, i) => <span key={i} className="tag">{t}</span>)}</div>
            </div>
          )}

          {current.tasks?.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--ink-soft)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Tasks
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 14, lineHeight: 1.8, color: "var(--ink-soft)" }}>
                {current.tasks.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </div>
          )}

          <div style={{ fontSize: 13, color: "var(--ink-faint)", marginBottom: 18 }}>
            Estimated: {current.estimated_hours} hour{current.estimated_hours === 1 ? "" : "s"}
          </div>

          <button
            className={`btn ${isDone ? "btn-secondary" : "btn-primary"}`}
            disabled={toggling}
            onClick={() => toggleDay(current.day, !isDone)}
          >
            {isDone ? "✓ Marked complete — undo" : "Mark day complete"}
          </button>
        </div>
      </div>
    </div>
  );
}
