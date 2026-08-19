import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { totalBuyIn, profitOf } from "@/lib/ledger";
import { yen, formatDate } from "@/lib/format";
import { canEditSession, formatTimeUTC, durationMinutes } from "@/lib/sessions";
import { SettlementToggle } from "@/components/SettlementToggle";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      entries: { include: { user: true } },
      rebuys: { include: { shares: { include: { seller: true } }, buyer: true } },
      settlements: { include: { fromUser: true, toUser: true } },
      createdBy: true,
    },
  });

  const viewerInSession =
    session && (session.createdById === user.id || session.entries.some((e) => e.userId === user.id));
  if (!session || !viewerInSession) notFound();

  const rebuys = session.rebuys.map((r) => ({
    buyerId: r.buyerId,
    shares: r.shares.map((s) => ({ sellerId: s.sellerId, amount: s.amount })),
  }));

  const minutes = durationMinutes(session.startedAt, session.endedAt);
  const editable = canEditSession(session, user.id);

  return (
    <div className="page-shell">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <h1 className="page-title">{formatDate(session.sessionDate)}の対局</h1>
          <p className="page-subtitle">
            {session.location ? `${session.location} ・ ` : ""}幹事: {session.createdBy.displayName}
            {session.startedAt && session.endedAt && (
              <>
                {" "}
                ・ {formatTimeUTC(session.startedAt)}〜{formatTimeUTC(session.endedAt)}
                {minutes !== null && ` (${Math.floor(minutes / 60)}時間${minutes % 60}分)`}
              </>
            )}
          </p>
        </div>
        {editable && (
          <Link href={`/sessions/${session.id}/edit`} className="ghost" style={{ textDecoration: "none", flexShrink: 0 }}>
            編集する
          </Link>
        )}
      </div>

      <div className="block-title" style={{ marginBottom: 10 }}>
        収支
      </div>
      <div className="table-scroll" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>参加者</th>
              <th className="num">開始時の持ち金額</th>
              <th className="num">総バイイン</th>
              <th className="num">最後の持ち金額</th>
              <th className="num">収支</th>
            </tr>
          </thead>
          <tbody>
            {session.entries.map((e) => {
              const entryInput = { userId: e.userId, initialStake: e.initialStake, cashOut: e.cashOut };
              const profit = profitOf(entryInput, rebuys) ?? 0;
              return (
                <tr key={e.id}>
                  <td>{e.user.displayName}</td>
                  <td className="num">{yen(e.initialStake)}</td>
                  <td className="num">{yen(totalBuyIn(entryInput, rebuys))}</td>
                  <td className="num">{e.cashOut !== null ? yen(e.cashOut) : "—"}</td>
                  <td className={`num ${profit >= 0 ? "amt-gain" : "amt-loss"}`}>{yen(profit, true)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="block-title" style={{ marginBottom: 10 }}>
        リバイ
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 24 }}>
        {session.rebuys.length === 0 && <div className="empty-state">リバイの記録はありません。</div>}
        {session.rebuys.map((r) => {
          const total = r.shares.reduce((s, sh) => s + sh.amount, 0);
          return (
            <div key={r.id} className="rebuy-item" style={{ paddingLeft: 12 }}>
              <div>
                <strong>{r.buyer.displayName}</strong>が購入 ←{" "}
                {r.shares.map((s) => `${s.seller.displayName} ${s.amount.toLocaleString("ja-JP")}円`).join("・")}{" "}
                <span className="hint">(計{total.toLocaleString("ja-JP")}円)</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="block-title" style={{ marginBottom: 10 }}>
        精算内訳
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {session.settlements.length === 0 ? (
          <div className="empty-state">全員±0円のため、送金の必要はありませんでした。</div>
        ) : (
          session.settlements.map((s) => (
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
                {s.fromUser.displayName} <span className="arrow">→</span> {s.toUser.displayName}{" "}
                <strong className="num">{yen(s.amount)}</strong>
              </div>
              <SettlementToggle
                id={s.id}
                settled={s.settled}
                canToggle={s.fromUserId === user.id || s.toUserId === user.id}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
