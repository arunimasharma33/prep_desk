import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";

export default function ResumeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [resume, setResume] = useState(null);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    api.getResume(id).then(setResume).catch((err) => setError(err instanceof ApiError ? err.message : "Not found."));
  }, [id]);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await api.downloadSavedResumePdf(id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${resume.resume_json.name?.replace(/\s+/g, "_") || "resume"}_resume.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate PDF.");
    } finally {
      setDownloading(false);
    }
  }

  async function handleDelete() {
    await api.deleteResume(id);
    navigate("/history");
  }

  if (error) return <div className="alert alert-error">{error}</div>;
  if (!resume) return <div className="empty-state"><span className="spinner dark" /></div>;

  const r = resume.resume_json;

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Saved resume · {resume.template}</div>
      <h1 className="section-title">{resume.title}</h1>

      <div className="card" style={{ marginTop: 20 }}>
        <h2 style={{ fontSize: 20 }}>{r.name}</h2>
        <p style={{ color: "var(--ink-soft)", marginTop: 4 }}>{r.title}</p>
        <p style={{ fontSize: 13.5, color: "var(--ink-faint)", marginTop: 8 }}>
          {[r.contact?.email, r.contact?.phone, r.contact?.location].filter(Boolean).join(" · ")}
        </p>

        {r.summary && <p style={{ marginTop: 16, fontSize: 14, lineHeight: 1.6 }}>{r.summary}</p>}

        {r.skills?.length > 0 && (
          <div className="tag-row" style={{ marginTop: 16 }}>
            {r.skills.map((s) => <span key={s} className="tag">{s}</span>)}
          </div>
        )}

        {r.experience?.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 10 }}>Experience</div>
            {r.experience.map((e, i) => (
              <div key={i} style={{ marginBottom: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{e.role} — {e.company}</div>
                <div style={{ fontSize: 12.5, color: "var(--ink-faint)" }}>{e.duration}</div>
              </div>
            ))}
          </div>
        )}

        {resume.suggestions_json?.length > 0 && (
          <div className="alert alert-info" style={{ marginTop: 16 }}>
            <strong>Suggestions:</strong>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {resume.suggestions_json.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
        <button className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
          {downloading && <span className="spinner" />}
          {downloading ? "Generating…" : "Download PDF"}
        </button>
        <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
      </div>
    </div>
  );
}
