import Link from "next/link";
import { currentJstMonth, currentJstDateKey, monthParam, type SessionResult } from "@/lib/stats";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

function compactYen(amount: number): string {
  return (amount > 0 ? "+" : "") + amount.toLocaleString("ja-JP");
}

export function ProfitCalendar({
  sessionResults,
  year,
  month, // 0-11
}: {
  sessionResults: SessionResult[];
  year: number;
  month: number;
}) {
  const byDate = new Map<string, number>();
  for (const r of sessionResults) {
    const key = r.sessionDate.toISOString().slice(0, 10);
    byDate.set(key, (byDate.get(key) ?? 0) + r.profit);
  }

  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const startWeekday = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;

  const cells: (number | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const monthTotal = [...byDate.entries()]
    .filter(([key]) => key.startsWith(prefix))
    .reduce((sum, [, v]) => sum + v, 0);

  const prev = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const next = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };
  const today = currentJstMonth();
  const todayKey = currentJstDateKey();
  const isCurrentMonth = today.year === year && today.month === month;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <Link href={`?month=${monthParam(prev.year, prev.month)}`} className="ghost" style={{ padding: "6px 12px", textDecoration: "none" }}>
          ← 前月
        </Link>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 700, fontFamily: "var(--font-mono)", fontSize: 14.5 }}>
            {year}年{month + 1}月
          </div>
          <div className={monthTotal >= 0 ? "amt-gain" : "amt-loss"} style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>
            {compactYen(monthTotal)}円
          </div>
        </div>
        {isCurrentMonth ? (
          <span style={{ width: 68 }} />
        ) : (
          <Link href={`?month=${monthParam(next.year, next.month)}`} className="ghost" style={{ padding: "6px 12px", textDecoration: "none" }}>
            翌月 →
          </Link>
        )}
      </div>
      <div className="calendar-grid">
        {WEEKDAYS.map((w) => (
          <div key={w} className="calendar-weekday">
            {w}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} className="calendar-cell empty" />;
          const key = `${prefix}-${String(day).padStart(2, "0")}`;
          const profit = byDate.get(key);
          const cls = profit === undefined ? "" : profit >= 0 ? "gain" : "loss";
          return (
            <div key={i} className={`calendar-cell ${cls}${key === todayKey ? " today" : ""}`}>
              <div className="calendar-day">{day}</div>
              {profit !== undefined && <div className="calendar-profit">{compactYen(profit)}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
