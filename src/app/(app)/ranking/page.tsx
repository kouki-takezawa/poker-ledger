import { requireUserWithGroup } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getGroupStats } from "@/lib/stats";
import { RankingTable } from "./RankingTable";

export default async function RankingPage() {
  const { user, membership } = await requireUserWithGroup();

  const [members, statsMap] = await Promise.all([
    prisma.groupMember.findMany({ where: { groupId: membership.groupId }, include: { user: true } }),
    getGroupStats(membership.groupId),
  ]);

  const rows = members.map((m) => {
    const s = statsMap.get(m.userId) ?? {
      participations: 0,
      totalProfit: 0,
      wins: 0,
      avgProfit: 0,
      winRatePct: 0,
    };
    return {
      userId: m.userId,
      name: m.user.displayName,
      totalProfit: s.totalProfit,
      winRatePct: s.winRatePct,
      avgProfit: s.avgProfit,
      participations: s.participations,
    };
  });

  return (
    <div className="page-shell">
      <h1 className="page-title">グループランキング</h1>
      <p className="page-subtitle">{membership.group.name} のメンバー全員の通算成績</p>
      <RankingTable rows={rows} meId={user.id} />
    </div>
  );
}
