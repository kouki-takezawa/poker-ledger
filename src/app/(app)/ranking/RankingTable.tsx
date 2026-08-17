"use client";

import { useMemo, useState } from "react";
import { yen } from "@/lib/format";

export type RankingRow = {
  userId: string;
  name: string;
  totalProfit: number;
  winRatePct: number;
  avgProfit: number;
  participations: number;
};

export function RankingTable({ rows, meId }: { rows: RankingRow[]; meId: string }) {
  const [sortKey, setSortKey] = useState<"totalProfit" | "winRatePct">("totalProfit");

  const sorted = useMemo(() => [...rows].sort((a, b) => b[sortKey] - a[sortKey]), [rows, sortKey]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        <button type="button" className="chip" aria-pressed={sortKey === "totalProfit"} onClick={() => setSortKey("totalProfit")}>
          収支順
        </button>
        <button type="button" className="chip" aria-pressed={sortKey === "winRatePct"} onClick={() => setSortKey("winRatePct")}>
          勝率順
        </button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>順位</th>
              <th>メンバー</th>
              <th className="num">通算収支</th>
              <th className="num">勝率</th>
              <th className="num">平均収支</th>
              <th className="num">参加数</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r, i) => (
              <tr key={r.userId} style={r.userId === meId ? { background: "var(--accent-soft)" } : undefined}>
                <td>{i + 1}</td>
                <td>{r.name}</td>
                <td className={`num ${r.totalProfit >= 0 ? "amt-gain" : "amt-loss"}`}>{yen(r.totalProfit, true)}</td>
                <td className="num">{r.winRatePct.toFixed(1)}%</td>
                <td className={`num ${r.avgProfit >= 0 ? "amt-gain" : "amt-loss"}`}>{yen(r.avgProfit, true)}</td>
                <td className="num">{r.participations}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)" }}>
                  まだ確定した対局がありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
