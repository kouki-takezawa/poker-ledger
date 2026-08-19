import Link from "next/link";
import { yen, formatDate } from "@/lib/format";
import type { UserProfile } from "@/lib/stats";
import { ProfitTrend } from "./ProfitTrend";
import { StreakBadge } from "./StreakBadge";

export function ProfileStats({ profile }: { profile: UserProfile }) {
  const {
    participations,
    totalProfit,
    winRatePct,
    avgProfit,
    bestSession,
    worstSession,
    currentStreak,
    trendPoints,
    sessionResults,
    hourlyRate,
  } = profile;

  return (
    <>
      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat-tile">
          <div className="k">通算収支</div>
          <div className={`v ${totalProfit >= 0 ? "amt-gain" : "amt-loss"}`}>{yen(totalProfit, true)}</div>
        </div>
        <div className="stat-tile">
          <div className="k">勝率</div>
          <div className="v">{winRatePct.toFixed(1)}%</div>
        </div>
        <div className="stat-tile">
          <div className="k">平均収支</div>
          <div className={`v ${avgProfit >= 0 ? "amt-gain" : "amt-loss"}`}>{yen(avgProfit, true)}</div>
        </div>
        <div className="stat-tile">
          <div className="k">参加回数</div>
          <div className="v">{participations}回</div>
        </div>
      </div>

      <StreakBadge streak={currentStreak} />

      {hourlyRate !== null && (
        <div className="stat-tile" style={{ marginBottom: 24 }}>
          <div className="k">時給換算(開始/終了時刻を記録した対局のみ)</div>
          <div className={`v ${hourlyRate >= 0 ? "amt-gain" : "amt-loss"}`}>{yen(hourlyRate, true)} / 時間</div>
        </div>
      )}

      <div className="block-title" style={{ marginBottom: 10 }}>
        通算収支の推移
      </div>
      <div className="card" style={{ padding: 18, marginBottom: 24 }}>
        <ProfitTrend points={trendPoints} />
      </div>

      <div className="stat-grid" style={{ marginBottom: 24, gridTemplateColumns: "1fr 1fr" }}>
        <div className="stat-tile">
          <div className="k">最大勝ち</div>
          <div className={`v ${bestSession && bestSession.profit < 0 ? "amt-loss" : "amt-gain"}`}>
            {bestSession ? yen(bestSession.profit, true) : "—"}
          </div>
          {bestSession && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{formatDate(bestSession.sessionDate)}</div>
          )}
        </div>
        <div className="stat-tile">
          <div className="k">最大負け</div>
          <div className={`v ${worstSession && worstSession.profit >= 0 ? "amt-gain" : "amt-loss"}`}>
            {worstSession ? yen(worstSession.profit, true) : "—"}
          </div>
          {worstSession && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>{formatDate(worstSession.sessionDate)}</div>
          )}
        </div>
      </div>

      <div className="block-title" style={{ marginBottom: 10 }}>
        対局ごとの結果
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>日付</th>
              <th className="num">収支</th>
            </tr>
          </thead>
          <tbody>
            {sessionResults.map((r) => (
              <tr key={r.sessionId}>
                <td>
                  <Link href={`/sessions/${r.sessionId}`}>{formatDate(r.sessionDate)}</Link>
                </td>
                <td className={`num ${r.profit >= 0 ? "amt-gain" : "amt-loss"}`}>{yen(r.profit, true)}</td>
              </tr>
            ))}
            {sessionResults.length === 0 && (
              <tr>
                <td colSpan={2} style={{ color: "var(--muted)" }}>
                  まだ対局に参加した記録がありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
