import Link from "next/link";
import { requireUserWithGroup } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getGroupStats } from "@/lib/stats";
import { yen } from "@/lib/format";
import { IconPlay } from "@/components/icons";

export default async function HomePage() {
  const { user, membership } = await requireUserWithGroup();
  const groupId = membership.groupId;

  const [statsMap, members, recentSessions] = await Promise.all([
    getGroupStats(groupId),
    prisma.groupMember.findMany({ where: { groupId }, include: { user: true } }),
    prisma.session.findMany({
      where: { groupId, status: "confirmed" },
      orderBy: { sessionDate: "desc" },
      take: 5,
      include: { entries: true },
    }),
  ]);

  const myStats = statsMap.get(user.id) ?? {
    participations: 0,
    totalProfit: 0,
    wins: 0,
    avgProfit: 0,
    winRatePct: 0,
  };

  const ranking = members
    .map((m) => ({ member: m, stats: statsMap.get(m.userId) ?? { totalProfit: 0, winRatePct: 0, participations: 0, wins: 0, avgProfit: 0 } }))
    .sort((a, b) => b.stats.totalProfit - a.stats.totalProfit)
    .slice(0, 3);

  return (
    <div className="page-shell">
      <h1 className="page-title">ホーム</h1>
      <p className="page-subtitle">{membership.group.name} の最新状況</p>

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
        グループランキング(上位3人)
        <Link href="/ranking" className="hint">
          全体を見る →
        </Link>
      </div>
      <div className="table-scroll" style={{ marginBottom: 28 }}>
        <table>
          <thead>
            <tr>
              <th>順位</th>
              <th>メンバー</th>
              <th className="num">通算収支</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((r, i) => (
              <tr key={r.member.userId}>
                <td>{i + 1}</td>
                <td>{r.member.user.displayName}</td>
                <td className={`num ${r.stats.totalProfit >= 0 ? "amt-gain" : "amt-loss"}`}>
                  {yen(r.stats.totalProfit, true)}
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
            {new Date(s.sessionDate).toLocaleDateString("ja-JP")}
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
