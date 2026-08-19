import { redirect, notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import {
  getUserProfile,
  getUsersStats,
  getUserSessionResults,
  rankOf,
  parsePeriod,
  parseMonthParam,
} from "@/lib/stats";
import { getFriendIds } from "@/lib/friends";
import { ProfileStats } from "@/components/ProfileStats";
import { PeriodTabs } from "@/components/PeriodTabs";
import { ProfitCalendar } from "@/components/ProfitCalendar";

export default async function MemberProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ period?: string | string[]; month?: string | string[] }>;
}) {
  const { userId } = await params;
  const { period: periodParam, month: monthParam } = await searchParams;
  const period = parsePeriod(periodParam);
  const { year, month } = parseMonthParam(monthParam);
  const user = await requireUser();

  if (userId === user.id) redirect("/me");

  const friendship = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: user.id, friendId: userId } },
  });
  if (!friendship) notFound();

  const target = await prisma.user.findUnique({ where: { id: userId } });
  if (!target) notFound();

  const friendIds = await getFriendIds(user.id);

  const [profile, statsMap, allSessionResults] = await Promise.all([
    getUserProfile(userId, period),
    getUsersStats([user.id, ...friendIds], period),
    getUserSessionResults(userId, "all"),
  ]);
  const { rank, total } = rankOf(statsMap, userId);

  return (
    <div className="page-shell">
      <h1 className="page-title">{target.displayName} の収支</h1>
      <p className="page-subtitle">{profile.participations > 0 && total > 1 ? `友達内 ${rank}位 / ${total}人` : ""}</p>
      <PeriodTabs current={period} />
      <ProfileStats profile={profile} />

      <div className="block-title" style={{ margin: "24px 0 10px" }}>
        カレンダー
      </div>
      <div className="card" style={{ padding: 16, marginBottom: 24 }}>
        <ProfitCalendar sessionResults={allSessionResults} year={year} month={month} />
      </div>
    </div>
  );
}
