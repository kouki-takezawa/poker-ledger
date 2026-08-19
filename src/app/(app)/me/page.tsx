import {
  getUserProfile,
  getUsersStats,
  getUserSessionResults,
  rankOf,
  parsePeriod,
  parseMonthParam,
  monthlyBreakdown,
  currentJstMonth,
} from "@/lib/stats";
import { requireUser } from "@/lib/auth-helpers";
import { getFriendIds } from "@/lib/friends";
import { ProfileStats } from "@/components/ProfileStats";
import { PeriodTabs } from "@/components/PeriodTabs";
import { ProfitCalendar } from "@/components/ProfitCalendar";
import { MonthlyBreakdownTable } from "@/components/MonthlyBreakdownTable";

export default async function MePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string | string[]; month?: string | string[] }>;
}) {
  const { period: periodParam, month: monthParam } = await searchParams;
  const period = parsePeriod(periodParam);
  const { year, month } = parseMonthParam(monthParam);
  const user = await requireUser();

  const friendIds = await getFriendIds(user.id);

  const [profile, statsMap, allSessionResults] = await Promise.all([
    getUserProfile(user.id, period),
    getUsersStats([user.id, ...friendIds], period),
    getUserSessionResults(user.id, "all"),
  ]);
  const { rank, total } = rankOf(statsMap, user.id);

  return (
    <div className="page-shell">
      <h1 className="page-title">個人成績</h1>
      <p className="page-subtitle">
        {profile.participations > 0 && total > 1 ? `友達内 ${rank}位 / ${total}人` : "あなたの成績"}
      </p>
      <PeriodTabs current={period} />
      <ProfileStats profile={profile} />

      {period === "year" && (
        <>
          <div className="block-title" style={{ margin: "24px 0 10px" }}>
            月別収支({currentJstMonth().year}年)
          </div>
          <MonthlyBreakdownTable data={monthlyBreakdown(allSessionResults, currentJstMonth().year)} />
        </>
      )}

      <div className="block-title" style={{ margin: "24px 0 10px" }}>
        カレンダー
      </div>
      <div className="card" style={{ padding: 16, marginBottom: 24 }}>
        <ProfitCalendar sessionResults={allSessionResults} year={year} month={month} />
      </div>
    </div>
  );
}
