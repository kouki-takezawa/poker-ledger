import Link from "next/link";
import { requireUserWithGroup } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { profitOf } from "@/lib/ledger";
import { yen, formatDate } from "@/lib/format";

export default async function SessionsHistoryPage() {
  const { membership } = await requireUserWithGroup();

  const sessions = await prisma.session.findMany({
    where: { groupId: membership.groupId, status: "confirmed" },
    orderBy: { sessionDate: "desc" },
    include: {
      entries: { include: { user: true } },
      rebuys: { include: { shares: true } },
      createdBy: true,
    },
  });

  return (
    <div className="page-shell">
      <h1 className="page-title">対局履歴</h1>
      <p className="page-subtitle">確定済みの対局が新しい順に並びます。</p>

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
          <div className="empty-state">まだ確定した対局がありません。</div>
        )}
      </div>
    </div>
  );
}
