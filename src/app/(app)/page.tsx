import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getUsersStats } from "@/lib/stats";
import { getFriendIds } from "@/lib/friends";
import { yen, formatDate } from "@/lib/format";
import { IconPlay } from "@/components/icons";
import { SettlementToggle } from "@/components/SettlementToggle";

export default async function HomePage() {
  const user = await requireUser();

  const friendIds = await getFriendIds(user.id);
  const memberIds = [user.id, ...friendIds];

  const [statsMap, users, recentSessions, pendingSettlements] = await Promise.all([
    getUsersStats(memberIds),
    prisma.user.findMany({ where: { id: { in: memberIds } } }),
    prisma.session.findMany({
      where: {
        status: "confirmed",
        OR: [{ createdById: user.id }, { entries: { some: { userId: user.id } } }],
      },
      orderBy: { sessionDate: "desc" },
      take: 5,
      include: { entries: true },
    }),
    prisma.settlement.findMany({
      where: { settled: false, OR: [{ fromUserId: user.id }, { toUserId: user.id }] },
      include: { fromUser: true, toUser: true, session: true },
      orderBy: { session: { sessionDate: "desc" } },
    }),
  ]);

  const myStats = statsMap.get(user.id) ?? {
    participations: 0,
    totalProfit: 0,
    wins: 0,
    avgProfit: 0,
    winRatePct: 0,
  };

  const nameOf = new Map(users.map((u) => [u.id, u.displayName]));
  const ranking = memberIds
    .map((id) => ({ userId: id, name: nameOf.get(id) ?? "?", stats: statsMap.get(id) }))
    .filter((r) => r.stats)
    .sort((a, b) => (b.stats!.totalProfit ?? 0) - (a.stats!.totalProfit ?? 0))
    .slice(0, 3);

  return (
    <div className="page-shell">
      <h1 className="page-title">ホーム</h1>
      <p className="page-subtitle">あなたと友達の最新状況</p>

      <Link
        href="/sessions/new"
        className="primary"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          textDecoration: "none",
          marginBottom: 24,
        }}
      >
        <IconPlay size={18} />
        対局を記録する
      </Link>

      {pendingSettlements.length > 0 && (
        <>
          <div className="block-title" style={{ marginBottom: 10 }}>
            未精算({pendingSettlements.length}件)
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
            {pendingSettlements.map((s) => {
              const iPay = s.fromUserId === user.id;
              return (
                <div
                  key={s.id}
                  className="card"
                  style={{
                    padding: "12px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ fontSize: 13.5 }}>
                    <span style={{ color: "var(--muted)", fontSize: 11.5 }}>{formatDate(s.session.sessionDate)}</span>
                    <br />
                    {iPay ? (
                      <>
                        <strong>{s.toUser.displayName}</strong>に <span className="amt-loss">{yen(s.amount)}</span> 支払う
                      </>
                    ) : (
                      <>
                        <strong>{s.fromUser.displayName}</strong>から <span className="amt-gain">{yen(s.amount)}</span> 受け取る
                      </>
                    )}
                  </div>
                  <SettlementToggle id={s.id} settled={false} canToggle />
                </div>
              );
            })}
          </div>
        </>
      )}

      <div className="block-title" style={{ marginBottom: 10 }}>
        あなたの通算成績
      </div>
      <div className="stat-grid" style={{ marginBottom: 28 }}>
        <div className="stat-tile">
          <div className="k">通算収支</div>
          <div className={`v ${myStats.totalProfit >= 0 ? "amt-gain" : "amt-loss"}`}>
            {yen(myStats.totalProfit, true)}
          </div>
        </div>
        <div className="stat-tile">
          <div className="k">勝率</div>
          <div className="v">{myStats.winRatePct.toFixed(1)}%</div>
        </div>
        <div className="stat-tile">
          <div className="k">平均収支</div>
          <div className={`v ${myStats.avgProfit >= 0 ? "amt-gain" : "amt-loss"}`}>
            {yen(myStats.avgProfit, true)}
          </div>
        </div>
        <div className="stat-tile">
          <div className="k">参加回数</div>
          <div className="v">{myStats.participations}回</div>
        </div>
      </div>

      <div className="block-title" style={{ marginBottom: 10 }}>
        友達ランキング(上位3人)
        <Link href="/friends" className="hint">
          全体を見る →
        </Link>
      </div>
      <div className="table-scroll" style={{ marginBottom: 28 }}>
        <table>
          <thead>
            <tr>
              <th>順位</th>
              <th>名前</th>
              <th className="num">通算収支</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r, i) => (
              <tr key={r.userId}>
                <td>{i + 1}</td>
                <td>{r.userId === user.id ? `${r.name}(あなた)` : r.name}</td>
                <td className={`num ${r.stats!.totalProfit >= 0 ? "amt-gain" : "amt-loss"}`}>
                  {yen(r.stats!.totalProfit, true)}
                </td>
              </tr>
            ))}
            {ranking.length === 0 && (
              <tr>
                <td colSpan={3} style={{ color: "var(--muted)" }}>
                  まだ確定した対局がありません。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="block-title" style={{ marginBottom: 10 }}>
        直近の対局
        <Link href="/sessions" className="hint">
          履歴を見る →
        </Link>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {recentSessions.map((s) => (
          <Link
            key={s.id}
            href={`/sessions/${s.id}`}
            className="table-scroll"
            style={{
              display: "block",
              padding: "12px 14px",
              textDecoration: "none",
              color: "var(--ink)",
              fontSize: 13.5,
            }}
          >
            {formatDate(s.sessionDate)}
            {s.location ? ` ・ ${s.location}` : ""} ・ {s.entries.length}人参加
          </Link>
        ))}
        {recentSessions.length === 0 && (
          <div className="empty-state">まだ対局の記録がありません。最初の対局を記録してみましょう。</div>
        )}
      </div>
    </div>
  );
}
