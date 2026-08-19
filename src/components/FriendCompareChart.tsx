"use client";

import { useState } from "react";

export type CompareSeries = {
  id: string;
  name: string;
  points: { date: string; cumulative: number }[]; // date: ISO string, chronological
};

const COLORS = ["#2E8B57", "#C1553D", "#3B6EA5", "#8B5CB5", "#2C8C99", "#B98B2E"];

export function FriendCompareChart({ series }: { series: CompareSeries[] }) {
  const [visible, setVisible] = useState<string[]>(series.slice(0, 3).map((s) => s.id));

  function toggle(id: string) {
    setVisible((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  const colorOf = (id: string) => {
    const i = series.findIndex((s) => s.id === id);
    return COLORS[i % COLORS.length];
  };

  const active = series.filter((s) => visible.includes(s.id) && s.points.length > 0);

  const width = 640;
  const height = 220;
  const padX = 10;
  const padY = 16;

  const chart = (() => {
    if (active.length === 0) return null;
    const allDates = active.flatMap((s) => s.points.map((p) => new Date(p.date).getTime()));
    const minDate = Math.min(...allDates);
    const maxDate = Math.max(...allDates);
    const dateRange = maxDate - minDate || 1;
    const allValues = active.flatMap((s) => s.points.map((p) => p.cumulative)).concat([0]);
    const minV = Math.min(...allValues);
    const maxV = Math.max(...allValues);
    const vRange = maxV - minV || 1;
    const xAt = (t: number) => padX + ((t - minDate) / dateRange) * (width - padX * 2);
    const yAt = (v: number) => padY + (1 - (v - minV) / vRange) * (height - padY * 2);
    return { xAt, yAt, zeroY: yAt(0) };
  })();

  return (
    <div>
      <div className="member-picker" style={{ marginBottom: 14, paddingLeft: 0 }}>
        {series.map((s) => (
          <button
            key={s.id}
            type="button"
            className="chip small"
            aria-pressed={visible.includes(s.id)}
            onClick={() => toggle(s.id)}
          >
            {s.name}
          </button>
        ))}
      </div>

      {!chart ? (
        <div className="empty-state">比較する友達を選んでください。</div>
      ) : (
        <>
          <svg
            viewBox={`0 0 ${width} ${height}`}
            role="img"
            aria-label="友達との収支推移の比較グラフ"
            style={{ width: "100%", height: "auto", display: "block" }}
          >
            <line
              x1={padX}
              y1={chart.zeroY}
              x2={width - padX}
              y2={chart.zeroY}
              stroke="var(--line)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            {active.map((s) => {
              const color = colorOf(s.id);
              const pts = s.points.map((p) => `${chart.xAt(new Date(p.date).getTime())},${chart.yAt(p.cumulative)}`).join(" ");
              const last = s.points[s.points.length - 1];
              return (
                <g key={s.id}>
                  <polyline points={pts} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  <circle cx={chart.xAt(new Date(last.date).getTime())} cy={chart.yAt(last.cumulative)} r={3.5} fill={color} />
                </g>
              );
            })}
          </svg>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
            {active.map((s) => (
              <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--muted)" }}>
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: colorOf(s.id),
                    display: "inline-block",
                  }}
                />
                {s.name}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
