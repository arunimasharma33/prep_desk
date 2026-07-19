export default function PreviewModal({ html, onClose }) {
  if (!html) return null;
  return (
    <div className="preview-modal-backdrop" onClick={onClose}>
      <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
        <div className="preview-modal-header">
          <strong style={{ fontSize: 14.5 }}>Resume preview</strong>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Close ✕</button>
        </div>
        <iframe title="resume-full-preview" srcDoc={html} />
      </div>
    </div>
  );
}
