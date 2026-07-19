import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";

export default function NewAnalysis() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [jobTitle, setJobTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [resumeText, setResumeText] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setExtracting(true);
    try {
      const { resume_text } = await api.extractResume(file);
      setResumeText(resume_text);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not read that file.");
    } finally {
      setExtracting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const analysis = await api.analyze({
        job_title: jobTitle,
        company: company || null,
        job_description: jobDescription,
        resume_text: resumeText || null,
      });
      navigate(`/analysis/${analysis.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Step 1 of 3</div>
      <h1 className="section-title">Score your fit for the role</h1>
      <p className="section-lede">
        Paste the job description and, optionally, your resume or a short profile. Our AI reads both
        and returns a match score, skill gaps, and the questions you're most likely to face.
      </p>

      <form className="card" onSubmit={handleSubmit}>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="jobTitle">Job title</label>
            <input id="jobTitle" type="text" required placeholder="e.g. Senior Backend Engineer"
              value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="company">Company <span className="hint">(optional)</span></label>
            <input id="company" type="text" placeholder="e.g. Acme Corp"
              value={company} onChange={(e) => setCompany(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label htmlFor="jd">Job description</label>
          <textarea id="jd" required rows={8} placeholder="Paste the full job description here..."
            value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
        </div>

        <div className="field">
          <label htmlFor="resume">
            Resume or personal description <span className="hint">(optional, but needed for a match score)</span>
          </label>
          <textarea id="resume" rows={8}
            placeholder="Paste your resume text, or a short description of your background and skills..."
            value={resumeText} onChange={(e) => setResumeText(e.target.value)} />
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
            <label className="btn btn-secondary btn-sm" style={{ cursor: "pointer" }}>
              {extracting ? <span className="spinner dark" /> : "Upload .pdf / .docx / .txt"}
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt,.md" onChange={handleFile}
                style={{ display: "none" }} disabled={extracting} />
            </label>
            {resumeText && (
              <button type="button" className="btn-ghost btn-sm btn" onClick={() => setResumeText("")}>
                Clear
              </button>
            )}
          </div>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

        <button className="btn btn-primary" disabled={loading}>
          {loading && <span className="spinner" />}
          {loading ? "Analyzing…" : "Analyze fit"}
        </button>
      </form>
    </div>
  );
}
