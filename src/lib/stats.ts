import { prisma } from "@/lib/prisma";
import { profitOf, type RebuyInput } from "@/lib/ledger";

export type UserStats = {
  participations: number;
  totalProfit: number;
  wins: number;
  avgProfit: number;
  winRatePct: number;
};

const ZERO_STATS: UserStats = { participations: 0, totalProfit: 0, wins: 0, avgProfit: 0, winRatePct: 0 };

export async function getGroupStats(groupId: string): Promise<Map<string, UserStats>> {
  const sessions = await prisma.session.findMany({
    where: { groupId, status: "confirmed" },
    include: {
      entries: true,
      rebuys: { include: { shares: true } },
    },
  });

  const acc = new Map<string, { participations: number; totalProfit: number; wins: number }>();

  for (const session of sessions) {
    const rebuys: RebuyInput[] = session.rebuys.map((r) => ({
      buyerId: r.buyerId,
      shares: r.shares.map((s) => ({ sellerId: s.sellerId, amount: s.amount })),
    }));

    for (const entry of session.entries) {
      const profit =
        profitOf({ userId: entry.userId, initialStake: entry.initialStake, cashOut: entry.cashOut }, rebuys) ?? 0;
      const cur = acc.get(entry.userId) ?? { participations: 0, totalProfit: 0, wins: 0 };
      cur.participations += 1;
      cur.totalProfit += profit;
      if (profit > 0) cur.wins += 1;
      acc.set(entry.userId, cur);
    }
  }

  const result = new Map<string, UserStats>();
  for (const [userId, v] of acc) {
    result.set(userId, {
      participations: v.participations,
      totalProfit: v.totalProfit,
      wins: v.wins,
      avgProfit: v.participations > 0 ? Math.round(v.totalProfit / v.participations) : 0,
      winRatePct: v.participations > 0 ? (v.wins / v.participations) * 100 : 0,
    });
  }
  return result;
}

export async function getUserStats(userId: string, groupId: string): Promise<UserStats> {
  const map = await getGroupStats(groupId);
  return map.get(userId) ?? ZERO_STATS;
}
