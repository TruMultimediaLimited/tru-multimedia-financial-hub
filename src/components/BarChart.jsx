// Minimal hand-rolled SVG bar chart — income vs expense per period is
// just two bars per category, not worth a charting library dependency
// (CLAUDE.md: keep bundle small, no heavy component libraries).
export default function BarChart({ data, xKey, series, height = 160 }) {
  if (data.length === 0) return <p className="text-sm text-gray-500">No data for this range.</p>;

  const max = Math.max(1, ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0)));
  const barGroupWidth = 100 / data.length;

  return (
    <div>
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full" style={{ height }}>
        {data.map((d, i) => (
          <g key={d[xKey]} transform={`translate(${i * barGroupWidth}, 0)`}>
            {series.map((s, si) => {
              const value = Number(d[s.key]) || 0;
              const barW = barGroupWidth / (series.length + 1);
              const barH = (value / max) * (height - 20);
              return (
                <rect
                  key={s.key}
                  x={barW * (si + 0.5)}
                  y={height - 20 - barH}
                  width={barW * 0.8}
                  height={barH}
                  fill={s.color}
                />
              );
            })}
          </g>
        ))}
      </svg>
      <div className="flex justify-between text-[10px] text-gray-500 mt-1">
        {data.map((d) => (
          <span key={d[xKey]}>{d[xKey]}</span>
        ))}
      </div>
      <div className="flex gap-3 mt-2">
        {series.map((s) => (
          <div key={s.key} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: s.color }} />
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}
