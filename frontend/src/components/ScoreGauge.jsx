const SIZE = 180;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const CIRC = Math.PI * R; // half circumference (semicircle)

function scoreColor(score) {
  if (score === null || score === undefined) return "var(--ink-faint)";
  if (score >= 75) return "var(--teal)";
  if (score >= 50) return "var(--amber)";
  return "var(--coral)";
}

function scoreLabel(score) {
  if (score === null || score === undefined) return "Add a resume for a score";
  if (score >= 85) return "Strong match";
  if (score >= 70) return "Good match";
  if (score >= 50) return "Partial match";
  return "Needs work";
}

export default function ScoreGauge({ score }) {
  const pct = score === null || score === undefined ? 0 : Math.max(0, Math.min(100, score));
  const offset = CIRC - (pct / 100) * CIRC;
  const color = scoreColor(score);
  const cx = SIZE / 2;
  const cy = SIZE / 2 + 6;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={SIZE} height={SIZE / 2 + 30} viewBox={`0 0 ${SIZE} ${SIZE / 2 + 30}`}>
        <path
          d={`M ${STROKE / 2} ${cy} A ${R} ${R} 0 0 1 ${SIZE - STROKE / 2} ${cy}`}
          fill="none" stroke="var(--line)" strokeWidth={STROKE} strokeLinecap="round"
        />
        <path
          d={`M ${STROKE / 2} ${cy} A ${R} ${R} 0 0 1 ${SIZE - STROKE / 2} ${cy}`}
          fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round"
          strokeDasharray={CIRC} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
        <text x={cx} y={cy - 14} textAnchor="middle" fontFamily="var(--font-body)" fontSize="34" fontWeight="800" fill="var(--ink)">
          {score === null || score === undefined ? "—" : Math.round(score)}
        </text>
        {score !== null && score !== undefined && (
          <text x={cx} y={cy + 6} textAnchor="middle" fontFamily="var(--font-body)" fontSize="11" fontWeight="600" fill="var(--ink-faint)">
            OUT OF 100
          </text>
        )}
      </svg>
      <div style={{ fontSize: 13, fontWeight: 600, color }}>{scoreLabel(score)}</div>
    </div>
  );
}
