import { notFound } from "next/navigation";
import { requireUserWithGroup } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { totalBuyIn, profitOf } from "@/lib/ledger";
import { yen, formatDate } from "@/lib/format";

export default async function SessionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { membership } = await requireUserWithGroup();

  const session = await prisma.session.findUnique({
    where: { id },
    include: {
      entries: { include: { user: true } },
      rebuys: { include: { shares: { include: { seller: true } }, buyer: true } },
      settlements: { include: { fromUser: true, toUser: true } },
      createdBy: true,
    },
  });

  if (!session || session.groupId !== membership.groupId) notFound();

  const rebuys = session.rebuys.map((r) => ({
    buyerId: r.buyerId,
    shares: r.shares.map((s) => ({ sellerId: s.sellerId, amount: s.amount })),
  }));

  return (
    <div className="page-shell">
      <h1 className="page-title">{formatDate(session.sessionDate)}の対局</h1>
      <p className="page-subtitle">
        {session.location ? `${session.location} ・ ` : ""}幹事: {session.createdBy.displayName}
      </p>

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
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>支払う人</th>
              <th></th>
              <th>受け取る人</th>
              <th className="num">金額</th>
            </tr>
          </thead>
          <tbody>
            {session.settlements.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ color: "var(--muted)" }}>
                  全員±0円のため、送金の必要はありませんでした。
                </td>
              </tr>
            ) : (
              session.settlements.map((s) => (
                <tr key={s.id}>
                  <td>{s.fromUser.displayName}</td>
                  <td className="arrow">→</td>
                  <td>{s.toUser.displayName}</td>
                  <td className="num">{yen(s.amount)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
