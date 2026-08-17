import { requireUserWithGroup } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { profitOf } from "@/lib/ledger";
import { yen, formatDate } from "@/lib/format";
import { ProfitTrend } from "@/components/ProfitTrend";

export default async function MePage() {
  const { user, membership } = await requireUserWithGroup();

  const sessions = await prisma.session.findMany({
    where: {
      groupId: membership.groupId,
      status: "confirmed",
      entries: { some: { userId: user.id } },
    },
    orderBy: { sessionDate: "asc" },
    include: { entries: true, rebuys: { include: { shares: true } } },
  });

  const results = sessions.map((s) => {
    const rebuys = s.rebuys.map((r) => ({
      buyerId: r.buyerId,
      shares: r.shares.map((sh) => ({ sellerId: sh.sellerId, amount: sh.amount })),
    }));
    const myEntry = s.entries.find((e) => e.userId === user.id)!;
    const profit =
      profitOf({ userId: user.id, initialStake: myEntry.initialStake, cashOut: myEntry.cashOut }, rebuys) ?? 0;
    return { session: s, profit };
  });

  const participations = results.length;
  const totalProfit = results.reduce((s, r) => s + r.profit, 0);
  const wins = results.filter((r) => r.profit > 0).length;
  const winRatePct = participations > 0 ? (wins / participations) * 100 : 0;
  const avgProfit = participations > 0 ? Math.round(totalProfit / participations) : 0;
  const bestSession = results.reduce((best, r) => (r.profit > (best?.profit ?? -Infinity) ? r : best), null as (typeof results)[number] | null);
  const worstSession = results.reduce((worst, r) => (r.profit < (worst?.profit ?? Infinity) ? r : worst), null as (typeof results)[number] | null);

  let cumulative = 0;
  const trendPoints = results.map((r) => (cumulative += r.profit));

  return (
    <div className="page-shell">
      <h1 className="page-title">個人成績</h1>
      <p className="page-subtitle">{membership.group.name} での通算成績</p>

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
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              {formatDate(bestSession.session.sessionDate)}
            </div>
          )}
        </div>
        <div className="stat-tile">
          <div className="k">最大負け</div>
          <div className={`v ${worstSession && worstSession.profit >= 0 ? "amt-gain" : "amt-loss"}`}>
            {worstSession ? yen(worstSession.profit, true) : "—"}
          </div>
          {worstSession && (
            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
              {formatDate(worstSession.session.sessionDate)}
            </div>
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
            {[...results].reverse().map((r) => (
              <tr key={r.session.id}>
                <td>{formatDate(r.session.sessionDate)}</td>
                <td className={`num ${r.profit >= 0 ? "amt-gain" : "amt-loss"}`}>{yen(r.profit, true)}</td>
              </tr>
            ))}
            {results.length === 0 && (
              <tr>
                <td colSpan={2} style={{ color: "var(--muted)" }}>
                  まだ対局に参加した記録がありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
