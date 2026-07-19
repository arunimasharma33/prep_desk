import { useEffect, useState } from "react";
import { api } from "../lib/api";

export default function TemplatePreview({ templateId, resumeJson }) {
  const [html, setHtml] = useState("");

  useEffect(() => {
    let cancelled = false;
    api.previewResume({ resume_json: resumeJson, template: templateId })
      .then((res) => { if (!cancelled) setHtml(res.html); })
      .catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, JSON.stringify(resumeJson)]);

  return (
    <div className="template-frame-wrap">
      {html ? (
        <iframe title={`${templateId}-preview`} srcDoc={html} tabIndex={-1} />
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <span className="spinner dark" />
        </div>
      )}
    </div>
  );
}
