import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { getFriendIds } from "@/lib/friends";
import { profitOf } from "@/lib/ledger";
import { yen, formatDate } from "@/lib/format";
import type { Prisma } from "@prisma/client";

export default async function SessionsHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ participant?: string; location?: string }>;
}) {
  const { participant, location } = await searchParams;
  const user = await requireUser();

  const friendIds = await getFriendIds(user.id);
  const [friends] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: friendIds } }, select: { id: true, displayName: true } }),
  ]);

  const filters: Prisma.SessionWhereInput[] = [
    { OR: [{ createdById: user.id }, { entries: { some: { userId: user.id } } }] },
  ];
  if (participant) filters.push({ entries: { some: { userId: participant } } });
  if (location) filters.push({ location: { contains: location, mode: "insensitive" } });

  const sessions = await prisma.session.findMany({
    where: { status: "confirmed", AND: filters },
    orderBy: { sessionDate: "desc" },
    include: {
      entries: { include: { user: true } },
      rebuys: { include: { shares: true } },
      createdBy: true,
    },
  });

  const hasFilter = Boolean(participant || location);

  return (
    <div className="page-shell">
      <h1 className="page-title">対局履歴</h1>
      <p className="page-subtitle">確定済みの対局が新しい順に並びます。</p>

      <form method="get" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        <select
          name="participant"
          defaultValue={participant ?? ""}
          style={{
            font: "inherit",
            fontSize: 13.5,
            padding: "9px 10px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink)",
          }}
        >
          <option value="">参加者で絞り込み(全員)</option>
          {friends.map((f) => (
            <option key={f.id} value={f.id}>
              {f.displayName}
            </option>
          ))}
        </select>
        <input
          type="text"
          name="location"
          placeholder="場所で絞り込み"
          defaultValue={location ?? ""}
          style={{
            font: "inherit",
            fontSize: 13.5,
            padding: "9px 10px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink)",
            flex: 1,
            minWidth: 140,
          }}
        />
        <button type="submit" className="ghost">
          絞り込む
        </button>
        {hasFilter && (
          <Link href="/sessions" className="ghost" style={{ textDecoration: "none" }}>
            クリア
          </Link>
        )}
      </form>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {sessions.map((s) => {
          const rebuys = s.rebuys.map((r) => ({
            buyerId: r.buyerId,
            shares: r.shares.map((sh) => ({ sellerId: sh.sellerId, amount: sh.amount })),
          }));
          const results = s.entries
            .map((e) => ({
              name: e.user.displayName,
              profit:
                profitOf({ userId: e.userId, initialStake: e.initialStake, cashOut: e.cashOut }, rebuys) ?? 0,
            }))
            .sort((a, b) => b.profit - a.profit);
          const top = results[0];

          return (
            <Link
              key={s.id}
              href={`/sessions/${s.id}`}
              className="card"
              style={{ display: "block", padding: "14px 16px", textDecoration: "none", color: "var(--ink)" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <strong style={{ fontSize: 14.5 }}>{formatDate(s.sessionDate)}</strong>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>幹事: {s.createdBy.displayName}</span>
              </div>
              <div style={{ fontSize: 13, color: "var(--muted)", marginBottom: 8 }}>
                {s.location ? `${s.location} ・ ` : ""}
                {s.entries.length}人参加
              </div>
              {top && (
                <div style={{ fontSize: 13 }}>
                  トップ: {top.name}{" "}
                  <span className={top.profit >= 0 ? "amt-gain" : "amt-loss"}>{yen(top.profit, true)}</span>
                </div>
              )}
            </Link>
          );
        })}
        {sessions.length === 0 && (
          <div className="empty-state">{hasFilter ? "条件に合う対局がありません。" : "まだ確定した対局がありません。"}</div>
        )}
      </div>
    </div>
  );
}
