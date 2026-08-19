import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getUsersStats, parsePeriod } from "@/lib/stats";
import { absoluteOrigin, qrDataUrl } from "@/lib/qrcode";
import { PeriodTabs } from "@/components/PeriodTabs";
import { FriendsPanel } from "./FriendsPanel";
import { FriendsList } from "./FriendsList";

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[] }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = parsePeriod(periodParam);
  const user = await requireUser();

  const [me, friendRows] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: { friendCode: true } }),
    prisma.friendship.findMany({ where: { userId: user.id }, include: { friend: true } }),
  ]);

  const friendIds = friendRows.map((f) => f.friendId);
  const statsMap = await getUsersStats(friendIds, period);

  const friends = friendRows.map((f) => {
    const s = statsMap.get(f.friendId) ?? { participations: 0, totalProfit: 0, wins: 0, avgProfit: 0, winRatePct: 0 };
    return {
      userId: f.friendId,
      name: f.friend.displayName,
      totalProfit: s.totalProfit,
      winRatePct: s.winRatePct,
      avgProfit: s.avgProfit,
      participations: s.participations,
    };
  });

  const origin = await absoluteOrigin();
  const addUrl = `${origin}/friends/add/${me.friendCode}`;
  const qrSrc = await qrDataUrl(addUrl);

  return (
    <div className="page-shell">
      <h1 className="page-title">友達</h1>
      <p className="page-subtitle">
        友達だけが対局の参加者に選べます。対局のたびに、幹事(記録した人)がその場の友達を招待するイメージです。
      </p>

      <FriendsPanel friendCode={me.friendCode} qrSrc={qrSrc} />

      <div className="block-title" style={{ margin: "24px 0 10px" }}>
        友達({friends.length}人)
      </div>
      <PeriodTabs current={period} />
      <FriendsList friends={friends} />
    </div>
  );
}
