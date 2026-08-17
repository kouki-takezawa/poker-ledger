type Props = {
  points: number[]; // cumulative profit after each session, chronological
};

export function ProfitTrend({ points }: Props) {
  if (points.length < 2) {
    return <div className="empty-state">対局が2回以上たまるとグラフが表示されます。</div>;
  }

  const width = 600;
  const height = 140;
  const padX = 8;
  const padY = 14;

  const min = Math.min(0, ...points);
  const max = Math.max(0, ...points);
  const range = max - min || 1;

  const xAt = (i: number) => padX + (i / (points.length - 1)) * (width - padX * 2);
  const yAt = (v: number) => padY + (1 - (v - min) / range) * (height - padY * 2);
  const zeroY = yAt(0);

  const linePoints = points.map((v, i) => `${xAt(i)},${yAt(v)}`).join(" ");
  const areaPoints = `${xAt(0)},${zeroY} ${linePoints} ${xAt(points.length - 1)},${zeroY}`;

  const last = points[points.length - 1];
  const positive = last >= 0;
  const color = positive ? "var(--accent)" : "var(--loss)";

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`直近${points.length}回の通算収支の推移。現在の通算収支は${last.toLocaleString(
          "ja-JP"
        )}円。`}
        style={{ width: "100%", height: "auto", display: "block" }}
      >
        <line
          x1={padX}
          y1={zeroY}
          x2={width - padX}
          y2={zeroY}
          stroke="var(--line)"
          strokeWidth={1}
          strokeDasharray="3 3"
        />
        <polygon points={areaPoints} fill={color} opacity={0.12} stroke="none" />
        <polyline points={linePoints} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={xAt(points.length - 1)} cy={yAt(last)} r={4} fill={color} />
      </svg>
    </figure>
  );
}
