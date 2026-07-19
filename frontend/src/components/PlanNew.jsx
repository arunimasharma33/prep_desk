import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";

export default function PlanNew() {
  const [params] = useSearchParams();
  const analysisId = params.get("analysis");
  const navigate = useNavigate();

  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [matchedSkills, setMatchedSkills] = useState([]);
  const [missingSkills, setMissingSkills] = useState([]);
  const [days, setDays] = useState(14);
  const [hours, setHours] = useState(3);
  const [loading, setLoading] = useState(false);
  const [prefillLoading, setPrefillLoading] = useState(!!analysisId);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!analysisId) return;
    api.getAnalysis(analysisId)
      .then((data) => {
        setJobTitle(data.job_title || "");
        setJobDescription(data.job_description || "");
        setMatchedSkills(data.result.matched_skills || []);
        setMissingSkills(data.result.missing_skills || []);
      })
      .catch(() => {})
      .finally(() => setPrefillLoading(false));
  }, [analysisId]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const plan = await api.createPlan({
        analysis_id: analysisId ? Number(analysisId) : null,
        job_title: jobTitle,
        job_description: jobDescription,
        days: Number(days),
        hours_per_day: Number(hours),
        matched_skills: matchedSkills,
        missing_skills: missingSkills,
      });
      navigate(`/plan/${plan.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="eyebrow" style={{ marginBottom: 10 }}>Step 3 of 3</div>
      <h1 className="section-title">Build your countdown plan</h1>
      <p className="section-lede">
        Tell us how many days you have left. Our AI lays out a day-by-day plan that front-loads your
        biggest skill gaps and ends with a mock interview and revision day.
      </p>

      {prefillLoading ? (
        <div className="empty-state"><span className="spinner dark" /></div>
      ) : (
        <form className="card" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="jobTitle">Job title</label>
            <input id="jobTitle" type="text" required value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)} placeholder="e.g. Senior Backend Engineer" />
          </div>

          {!analysisId && (
            <div className="field">
              <label htmlFor="jd">Job description <span className="hint">(optional, improves relevance)</span></label>
              <textarea id="jd" rows={5} value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} />
            </div>
          )}

          <div className="grid-2">
            <div className="field">
              <label htmlFor="days">Days until interview</label>
              <input id="days" type="number" min={1} max={180} required value={days}
                onChange={(e) => setDays(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="hours">Study hours per day</label>
              <input id="hours" type="number" min={0.5} max={16} step={0.5} value={hours}
                onChange={(e) => setHours(e.target.value)} />
            </div>
          </div>

          {(matchedSkills.length > 0 || missingSkills.length > 0) && (
            <div className="field">
              <label>Skills carried over from your analysis</label>
              <div className="tag-row">
                {missingSkills.map((s) => <span key={s} className="tag missing">{s}</span>)}
                {matchedSkills.map((s) => <span key={s} className="tag">{s}</span>)}
              </div>
            </div>
          )}

          {error && <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>}

          <button className="btn btn-primary" disabled={loading}>
            {loading && <span className="spinner" />}
            {loading ? "Building your plan…" : "Generate plan"}
          </button>
        </form>
      )}
    </div>
  );
}
