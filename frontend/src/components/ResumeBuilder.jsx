import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import TemplatePreview from "./TemplatePreview";
import PreviewModal from "./PreviewModal";

const TEMPLATE_META = {
  classic: { name: "ATS Classic", blurb: "Black & white serif. Maximum ATS compatibility." },
  modern: { name: "Modern Minimal", blurb: "Clean sans-serif with a teal accent." },
  compact: { name: "Compact", blurb: "Dense single page for longer histories." },
};

const emptyResume = {
  name: "", title: "", contact: { email: "", phone: "", location: "", linkedin: "", portfolio: "" },
  summary: "", skills: [], experience: [], projects: [], education: [], certifications: [],
};

const SAMPLE_RESUME = {
  name: "Jordan Rivera", title: "Senior Backend Engineer",
  contact: { email: "jordan@email.com", phone: "(555) 012-3456", location: "Austin, TX", linkedin: "linkedin.com/in/jordanrivera" },
  summary: "Backend engineer with 6+ years building high-throughput APIs and distributed systems in Python and Go.",
  skills: ["Python", "FastAPI", "PostgreSQL", "AWS", "Docker", "Kubernetes"],
  experience: [
    { company: "Nimbus Data", role: "Senior Backend Engineer", duration: "2022 — Present",
      bullets: ["Led migration to a microservices architecture, cutting p95 latency by 40%", "Mentored 3 junior engineers on system design"] },
    { company: "Fieldstone Labs", role: "Backend Engineer", duration: "2019 — 2022",
      bullets: ["Built a billing pipeline processing 2M+ transactions/month"] },
  ],
  projects: [{ name: "Open-source rate limiter", bullets: ["Published a Redis-backed rate limiter used by 400+ repos"] }],
  education: [{ school: "University of Texas", degree: "B.S. Computer Science", duration: "2015 — 2019" }],
  certifications: ["AWS Certified Solutions Architect"],
};

export default function ResumeBuilder() {
  const [params] = useSearchParams();
  const analysisId = params.get("analysis");

  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [missingSkills, setMissingSkills] = useState([]);
  const [sourceLabel, setSourceLabel] = useState(null); // e.g. "Backend Engineer at Acme"
  const [showSourceForm, setShowSourceForm] = useState(!analysisId);

  const [resume, setResume] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [template, setTemplate] = useState("classic");

  const [loadingSource, setLoadingSource] = useState(!!analysisId);
  const [improving, setImproving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState("");
  const [savedMsg, setSavedMsg] = useState("");

  // Load prior analysis (job + resume already on file) and auto-run the rewrite -
  // the whole point is not making the person paste everything in again.
  useEffect(() => {
    if (!analysisId) return;
    let cancelled = false;
    api.getAnalysis(analysisId).then(async (data) => {
      if (cancelled) return;
      setJobTitle(data.job_title || "");
      setJobDescription(data.job_description || "");
      setResumeText(data.resume_text || "");
      setMissingSkills(data.result.missing_skills || []);
      setSourceLabel(`${data.job_title}${data.company ? " at " + data.company : ""}`);
      setLoadingSource(false);

      if (data.resume_text) {
        await runImprove({
          job_title: data.job_title,
          job_description: data.job_description,
          resume_text: data.resume_text,
          missing_skills: data.result.missing_skills || [],
        });
      } else {
        // No resume on file for this analysis - need the person to provide one.
        setShowSourceForm(true);
      }
    }).catch(() => setLoadingSource(false));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisId]);

  async function runImprove(fields) {
    setError("");
    setImproving(true);
    try {
      const result = await api.improveResume({
        analysis_id: analysisId ? Number(analysisId) : null,
        resume_text: fields.resume_text || null,
        job_title: fields.job_title,
        job_description: fields.job_description,
        missing_skills: fields.missing_skills || [],
      });
      const { suggestions: sugg, keywords_incorporated, ...resumeFields } = result;
      setResume({ ...emptyResume, ...resumeFields, contact: { ...emptyResume.contact, ...resumeFields.contact } });
      setSuggestions(sugg || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setImproving(false);
    }
  }

  function handleImproveSubmit(e) {
    e.preventDefault();
    runImprove({ job_title: jobTitle, job_description: jobDescription, resume_text: resumeText, missing_skills: missingSkills });
  }

  function updateField(path, value) {
    setResume((prev) => {
      const next = structuredClone(prev);
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]];
      obj[path[path.length - 1]] = value;
      return next;
    });
  }

  function updateListEntry(listKey, index, field, value) {
    setResume((prev) => {
      const next = structuredClone(prev);
      next[listKey][index][field] = value;
      return next;
    });
  }

  function addEntry(listKey, tpl) {
    setResume((prev) => ({ ...prev, [listKey]: [...(prev[listKey] || []), tpl] }));
  }

  function removeEntry(listKey, index) {
    setResume((prev) => ({ ...prev, [listKey]: prev[listKey].filter((_, i) => i !== index) }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    setSavedMsg("");
    try {
      const saved = await api.saveResume({
        analysis_id: analysisId ? Number(analysisId) : null,
        title: `${resume.name || "My"} — ${jobTitle || "Resume"}`,
        template,
        resume_json: resume,
        suggestions,
      });
      setSavedMsg(`Saved to your history (#${saved.id}).`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview() {
    setPreviewLoading(true);
    setError("");
    try {
      const res = await api.previewResume({ resume_json: resume, template });
      setPreviewHtml(res.html);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not build the preview.");
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setError("");
    try {
      const res = await api.downloadResumePdf({ resume_json: resume, template });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(resume.name || "resume").replace(/\s+/g, "_")}_resume.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not generate the PDF.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Resume builder</div>
      <h1 className="section-title">Rewrite your resume for this role</h1>
      <p className="section-lede">
        Our AI restructures your resume around the job description and your skill gaps, then you
        can fine-tune every section before exporting a clean ATS-friendly PDF.
      </p>

      {loadingSource && (
        <div className="card empty-state" style={{ marginBottom: 20 }}>
          <span className="spinner dark" />
          <p style={{ marginTop: 10 }}>Loading your saved resume and job details…</p>
        </div>
      )}

      {!loadingSource && sourceLabel && !showSourceForm && (
        <div className="alert alert-info" style={{ marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <span>Building on your existing resume from the <strong>{sourceLabel}</strong> analysis — no need to paste anything again.</span>
          <button className="btn btn-secondary btn-sm" onClick={() => setShowSourceForm(true)} style={{ flexShrink: 0 }}>
            Edit source details
          </button>
        </div>
      )}

      {!loadingSource && showSourceForm && (
        <form className="card" onSubmit={handleImproveSubmit} style={{ marginBottom: 24 }}>
          <div className="field">
            <label htmlFor="jobTitle">Target job title</label>
            <input id="jobTitle" type="text" required value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="jd">Job description</label>
            <textarea id="jd" rows={5} required value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="resumeText">Your current resume / background <span className="hint">(paste text — the more detail, the better)</span></label>
            <textarea id="resumeText" rows={8} value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
          </div>
          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}
          <div style={{ display: "flex", gap: 10 }}>
            <button className="btn btn-primary" disabled={improving}>
              {improving && <span className="spinner" />}
              {improving ? "Rewriting your resume…" : resume ? "Regenerate" : "Improve with AI"}
            </button>
            {sourceLabel && (
              <button type="button" className="btn btn-ghost" onClick={() => setShowSourceForm(false)}>Cancel</button>
            )}
          </div>
        </form>
      )}

      {!loadingSource && improving && !showSourceForm && (
        <div className="card empty-state" style={{ marginBottom: 20 }}>
          <span className="spinner dark" />
          <p style={{ marginTop: 10 }}>Rewriting your resume around this role's skill gaps…</p>
        </div>
      )}

      {error && !showSourceForm && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {!loadingSource && (
        <>
          <div className="card" style={{ marginBottom: 20 }}>
            <div className="eyebrow" style={{ marginBottom: 4 }}>Choose a template</div>
            <p style={{ fontSize: 13, color: "var(--ink-soft)", marginBottom: 16 }}>
              Live previews below use {resume ? "your rewritten resume" : "sample content"} so you know exactly what you'll get.
            </p>
            <div className="grid-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
              {Object.keys(TEMPLATE_META).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTemplate(id)}
                  className="btn"
                  style={{
                    flexDirection: "column", alignItems: "stretch", gap: 10, textAlign: "left",
                    padding: 12, borderRadius: 12, height: "auto",
                    background: template === id ? "var(--teal-tint)" : "var(--paper-raised)",
                    border: `1.5px solid ${template === id ? "var(--teal)" : "var(--line)"}`,
                  }}
                >
                  <TemplatePreview templateId={id} resumeJson={resume || SAMPLE_RESUME} />
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5 }}>{TEMPLATE_META[id].name}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-soft)", fontWeight: 400 }}>{TEMPLATE_META[id].blurb}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {resume && (
            <>
              {suggestions.length > 0 && (
                <div className="alert alert-info" style={{ marginBottom: 20 }}>
                  <strong>Suggestions to close the gap further:</strong>
                  <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                    {suggestions.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              <div className="card">
                <div className="eyebrow" style={{ marginBottom: 16 }}>Edit your resume</div>

                <div className="grid-2">
                  <div className="field">
                    <label>Full name</label>
                    <input type="text" value={resume.name} onChange={(e) => updateField(["name"], e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Headline</label>
                    <input type="text" value={resume.title} onChange={(e) => updateField(["title"], e.target.value)} />
                  </div>
                </div>

                <div className="grid-2">
                  <div className="field">
                    <label>Email</label>
                    <input type="text" value={resume.contact.email} onChange={(e) => updateField(["contact", "email"], e.target.value)} />
                  </div>
                  <div className="field">
                    <label>Phone</label>
                    <input type="text" value={resume.contact.phone} onChange={(e) => updateField(["contact", "phone"], e.target.value)} />
                  </div>
                </div>
                <div className="grid-2">
                  <div className="field">
                    <label>Location</label>
                    <input type="text" value={resume.contact.location} onChange={(e) => updateField(["contact", "location"], e.target.value)} />
                  </div>
                  <div className="field">
                    <label>LinkedIn</label>
                    <input type="text" value={resume.contact.linkedin} onChange={(e) => updateField(["contact", "linkedin"], e.target.value)} />
                  </div>
                </div>

                <div className="field">
                  <label>Summary</label>
                  <textarea rows={4} value={resume.summary} onChange={(e) => updateField(["summary"], e.target.value)} />
                </div>

                <div className="field">
                  <label>Skills <span className="hint">(comma separated)</span></label>
                  <textarea rows={2} value={resume.skills.join(", ")}
                    onChange={(e) => updateField(["skills"], e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
                </div>

                <hr className="divider" />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-soft)" }}>Experience</label>
                  <button type="button" className="btn btn-ghost btn-sm"
                    onClick={() => addEntry("experience", { company: "", role: "", duration: "", bullets: [] })}>
                    + Add role
                  </button>
                </div>
                {resume.experience.map((exp, i) => (
                  <div key={i} className="card" style={{ marginBottom: 12, background: "var(--paper)" }}>
                    <div className="grid-2">
                      <div className="field"><label>Role</label>
                        <input type="text" value={exp.role} onChange={(e) => updateListEntry("experience", i, "role", e.target.value)} /></div>
                      <div className="field"><label>Company</label>
                        <input type="text" value={exp.company} onChange={(e) => updateListEntry("experience", i, "company", e.target.value)} /></div>
                    </div>
                    <div className="field"><label>Duration</label>
                      <input type="text" value={exp.duration} onChange={(e) => updateListEntry("experience", i, "duration", e.target.value)} /></div>
                    <div className="field"><label>Bullets <span className="hint">(one per line)</span></label>
                      <textarea rows={4} value={(exp.bullets || []).join("\n")}
                        onChange={(e) => updateListEntry("experience", i, "bullets", e.target.value.split("\n").filter((l) => l.trim()))} /></div>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeEntry("experience", i)}>Remove</button>
                  </div>
                ))}

                <hr className="divider" />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-soft)" }}>Projects</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => addEntry("projects", { name: "", bullets: [] })}>+ Add project</button>
                </div>
                {resume.projects.map((p, i) => (
                  <div key={i} className="card" style={{ marginBottom: 12, background: "var(--paper)" }}>
                    <div className="field"><label>Name</label>
                      <input type="text" value={p.name} onChange={(e) => updateListEntry("projects", i, "name", e.target.value)} /></div>
                    <div className="field"><label>Bullets <span className="hint">(one per line)</span></label>
                      <textarea rows={3} value={(p.bullets || []).join("\n")}
                        onChange={(e) => updateListEntry("projects", i, "bullets", e.target.value.split("\n").filter((l) => l.trim()))} /></div>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeEntry("projects", i)}>Remove</button>
                  </div>
                ))}

                <hr className="divider" />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--ink-soft)" }}>Education</label>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => addEntry("education", { school: "", degree: "", duration: "" })}>+ Add</button>
                </div>
                {resume.education.map((ed, i) => (
                  <div key={i} className="card" style={{ marginBottom: 12, background: "var(--paper)" }}>
                    <div className="grid-2">
                      <div className="field"><label>Degree</label>
                        <input type="text" value={ed.degree} onChange={(e) => updateListEntry("education", i, "degree", e.target.value)} /></div>
                      <div className="field"><label>School</label>
                        <input type="text" value={ed.school} onChange={(e) => updateListEntry("education", i, "school", e.target.value)} /></div>
                    </div>
                    <div className="field"><label>Duration</label>
                      <input type="text" value={ed.duration} onChange={(e) => updateListEntry("education", i, "duration", e.target.value)} /></div>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeEntry("education", i)}>Remove</button>
                  </div>
                ))}

                <div className="field" style={{ marginTop: 8 }}>
                  <label>Certifications <span className="hint">(comma separated)</span></label>
                  <textarea rows={2} value={(resume.certifications || []).join(", ")}
                    onChange={(e) => updateField(["certifications"], e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
                </div>
              </div>

              {savedMsg && <div className="alert alert-info" style={{ marginTop: 16 }}>{savedMsg}</div>}

              <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
                <button className="btn btn-secondary" onClick={handlePreview} disabled={previewLoading}>
                  {previewLoading && <span className="spinner dark" />}
                  {previewLoading ? "Building preview…" : "Preview resume"}
                </button>
                <button className="btn btn-secondary" onClick={handleSave} disabled={saving}>
                  {saving && <span className="spinner dark" />}
                  {saving ? "Saving…" : "Save to history"}
                </button>
                <button className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
                  {downloading && <span className="spinner" />}
                  {downloading ? "Generating PDF…" : "Download ATS PDF"}
                </button>
              </div>
            </>
          )}
        </>
      )}

      <PreviewModal html={previewHtml} onClose={() => setPreviewHtml(null)} />
    </div>
  );
}
