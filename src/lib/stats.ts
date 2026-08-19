import { prisma } from "@/lib/prisma";
import { profitOf, type RebuyInput } from "@/lib/ledger";

export type Period = "all" | "year" | "month";

export const PERIOD_LABELS: Record<Period, string> = {
  all: "全期間",
  year: "今年",
  month: "今月",
};

export function parsePeriod(value: string | string[] | undefined): Period {
  const v = Array.isArray(value) ? value[0] : value;
  return v === "year" || v === "month" ? v : "all";
}

const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

// Computes the [from, to) UTC instant range for the given period, anchored to
// the current wall-clock date in JST (this app's users are all in Japan),
// regardless of the server's own timezone (Vercel runs UTC).
export function periodRange(period: Period): { from: Date; to: Date } | null {
  if (period === "all") return null;
  const jstNow = new Date(Date.now() + JST_OFFSET_MS);
  const y = jstNow.getUTCFullYear();
  const m = jstNow.getUTCMonth();
  if (period === "month") {
    return {
      from: new Date(Date.UTC(y, m, 1) - JST_OFFSET_MS),
      to: new Date(Date.UTC(y, m + 1, 1) - JST_OFFSET_MS),
    };
  }
  return {
    from: new Date(Date.UTC(y, 0, 1) - JST_OFFSET_MS),
    to: new Date(Date.UTC(y + 1, 0, 1) - JST_OFFSET_MS),
  };
}

export function currentJstMonth(): { year: number; month: number } {
  const jstNow = new Date(Date.now() + JST_OFFSET_MS);
  return { year: jstNow.getUTCFullYear(), month: jstNow.getUTCMonth() };
}

export function currentJstDateKey(): string {
  return new Date(Date.now() + JST_OFFSET_MS).toISOString().slice(0, 10);
}

export function parseMonthParam(value: string | string[] | undefined): { year: number; month: number } {
  const v = Array.isArray(value) ? value[0] : value;
  const match = v?.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    if (month >= 0 && month <= 11) return { year, month };
  }
  return currentJstMonth();
}

export function monthParam(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export type UserStats = {
  participations: number;
  totalProfit: number;
  wins: number;
  avgProfit: number;
  winRatePct: number;
};

// Each user's own global stats (all their confirmed sessions, regardless of
// who else played). Used to build a stats map for an arbitrary set of people
// (e.g. "me + my friends") now that there's no shared Group to scope by.
export async function getUsersStats(userIds: string[], period: Period = "all"): Promise<Map<string, UserStats>> {
  if (userIds.length === 0) return new Map();
  const range = periodRange(period);
  const sessions = await prisma.session.findMany({
    where: {
      status: "confirmed",
      entries: { some: { userId: { in: userIds } } },
      ...(range ? { sessionDate: { gte: range.from, lt: range.to } } : {}),
    },
    include: {
      entries: true,
      rebuys: { include: { shares: true } },
    },
  });

  const idSet = new Set(userIds);
  const acc = new Map<string, { participations: number; totalProfit: number; wins: number }>();

  for (const session of sessions) {
    const rebuys: RebuyInput[] = session.rebuys.map((r) => ({
      buyerId: r.buyerId,
      shares: r.shares.map((s) => ({ sellerId: s.sellerId, amount: s.amount })),
    }));

    for (const entry of session.entries) {
      if (!idSet.has(entry.userId)) continue;
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
  for (const userId of userIds) {
    const v = acc.get(userId) ?? { participations: 0, totalProfit: 0, wins: 0 };
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

export function rankOf(statsMap: Map<string, UserStats>, userId: string): { rank: number; total: number } {
  const sorted = [...statsMap.entries()].sort((a, b) => b[1].totalProfit - a[1].totalProfit);
  const index = sorted.findIndex(([id]) => id === userId);
  return { rank: index === -1 ? sorted.length + 1 : index + 1, total: sorted.length };
}

export type SessionResult = {
  sessionId: string;
  sessionDate: Date;
  location: string | null;
  profit: number;
};

export type UserProfile = UserStats & {
  bestSession: SessionResult | null;
  worstSession: SessionResult | null;
  currentStreak: number; // positive = win streak, negative = loss streak, 0 = none
  trendPoints: number[]; // cumulative profit after each session, chronological
  sessionResults: SessionResult[]; // most recent first
};

export async function getUserSessionResults(userId: string, period: Period = "all"): Promise<SessionResult[]> {
  const range = periodRange(period);
  const sessions = await prisma.session.findMany({
    where: {
      status: "confirmed",
      entries: { some: { userId } },
      ...(range ? { sessionDate: { gte: range.from, lt: range.to } } : {}),
    },
    orderBy: { sessionDate: "asc" },
    include: { entries: true, rebuys: { include: { shares: true } } },
  });

  return sessions.map((s) => {
    const rebuys: RebuyInput[] = s.rebuys.map((r) => ({
      buyerId: r.buyerId,
      shares: r.shares.map((sh) => ({ sellerId: sh.sellerId, amount: sh.amount })),
    }));
    const myEntry = s.entries.find((e) => e.userId === userId)!;
    const profit =
      profitOf({ userId, initialStake: myEntry.initialStake, cashOut: myEntry.cashOut }, rebuys) ?? 0;
    return { sessionId: s.id, sessionDate: s.sessionDate, location: s.location, profit };
  });
}

export async function getUserProfile(userId: string, period: Period = "all"): Promise<UserProfile> {
  const chronological = await getUserSessionResults(userId, period);

  const participations = chronological.length;
  const totalProfit = chronological.reduce((sum, r) => sum + r.profit, 0);
  const wins = chronological.filter((r) => r.profit > 0).length;

  const bestSession = chronological.reduce(
    (best, r) => (best === null || r.profit > best.profit ? r : best),
    null as SessionResult | null
  );
  const worstSession = chronological.reduce(
    (worst, r) => (worst === null || r.profit < worst.profit ? r : worst),
    null as SessionResult | null
  );

  let cumulative = 0;
  const trendPoints = chronological.map((r) => (cumulative += r.profit));

  const sessionResults = [...chronological].reverse();
  let currentStreak = 0;
  for (const r of sessionResults) {
    if (r.profit > 0) {
      if (currentStreak < 0) break;
      currentStreak += 1;
    } else if (r.profit < 0) {
      if (currentStreak > 0) break;
      currentStreak -= 1;
    } else {
      break;
    }
  }

  return {
    participations,
    totalProfit,
    wins,
    avgProfit: participations > 0 ? Math.round(totalProfit / participations) : 0,
    winRatePct: participations > 0 ? (wins / participations) * 100 : 0,
    bestSession,
    worstSession,
    currentStreak,
    trendPoints,
    sessionResults,
  };
}
