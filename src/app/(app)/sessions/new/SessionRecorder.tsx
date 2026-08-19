"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  checkZeroSum,
  totalBuyIn,
  profitOf,
  interimRebuyNet,
  type EntryInput,
  type RebuyInput,
} from "@/lib/ledger";
import { yen, formatDate } from "@/lib/format";
import { IconCheck, IconAlert, IconInfo, IconX, IconPlus } from "@/components/icons";

type Member = { id: string; name: string };
type EntryState = { initial: number; cashOut: number | null };
type RebuyState = { id: string; buyerId: string; shares: { sellerId: string; amount: number }[] };

type ConfirmResult = {
  sessionId: string;
  settlements: { fromName: string; toName: string; amount: number }[];
  statUpdates: {
    userId: string;
    name: string;
    profit: number;
    before: { participations: number; totalProfit: number; winRatePct: number; avgProfit: number };
    after: { participations: number; totalProfit: number; winRatePct: number; avgProfit: number };
  }[];
};

export type EditInitial = {
  id: string;
  sessionDate: string;
  location: string;
  startTime: string;
  endTime: string;
  selected: string[];
  entries: Record<string, EntryState>;
  rebuys: RebuyState[];
};

export type QuickFillOption = {
  sessionDate: string;
  selected: string[];
  entries: Record<string, EntryState>;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function SessionRecorder({
  members,
  edit,
  quickFill,
}: {
  members: Member[];
  edit?: EditInitial;
  quickFill?: QuickFillOption;
}) {
  const router = useRouter();
  const byId = useMemo(() => new Map(members.map((m) => [m.id, m])), [members]);

  const [sessionDate, setSessionDate] = useState(edit?.sessionDate ?? todayISO());
  const [location, setLocation] = useState(edit?.location ?? "");
  const [startTime, setStartTime] = useState(edit?.startTime ?? "");
  const [endTime, setEndTime] = useState(edit?.endTime ?? "");
  const [selected, setSelected] = useState<string[]>(edit?.selected ?? []);
  const [entries, setEntries] = useState<Record<string, EntryState>>(edit?.entries ?? {});
  const [rebuys, setRebuys] = useState<RebuyState[]>(edit?.rebuys ?? []);
  const [rebuyCounter, setRebuyCounter] = useState((edit?.rebuys.length ?? 0) + 1);
  const [formBuyer, setFormBuyer] = useState<string | null>(null);
  const [sellerAmounts, setSellerAmounts] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [result, setResult] = useState<ConfirmResult | null>(null);

  const confirmed = result !== null;

  function entryOf(id: string): EntryState {
    return entries[id] ?? { initial: 10000, cashOut: null };
  }

  function setEntry(id: string, patch: Partial<EntryState>) {
    setEntries((prev) => ({ ...prev, [id]: { ...entryOf(id), ...patch } }));
  }

  const rebuyInputs: RebuyInput[] = rebuys.map((r) => ({ buyerId: r.buyerId, shares: r.shares }));

  function toggleMember(id: string) {
    if (confirmed) return;
    setSelected((prev) => {
      if (prev.includes(id)) {
        setRebuys((rs) =>
          rs.filter((r) => r.buyerId !== id && !r.shares.some((s) => s.sellerId === id))
        );
        if (formBuyer === id) setFormBuyer(null);
        return prev.filter((x) => x !== id);
      }
      return [...prev, id];
    });
  }

  function applyQuickFill() {
    if (!quickFill) return;
    setSelected(quickFill.selected);
    setEntries(quickFill.entries);
  }

  const entryList: EntryInput[] = selected.map((id) => ({
    userId: id,
    initialStake: entryOf(id).initial,
    cashOut: entryOf(id).cashOut,
  }));

  const zeroSum = checkZeroSum(entryList, rebuyInputs);
  const filledCount = entryList.filter((e) => e.cashOut !== null).length;

  const currentFormBuyer = formBuyer && selected.includes(formBuyer) ? formBuyer : selected[0] ?? null;

  function addRebuy() {
    if (!currentFormBuyer) return;
    const shares = selected
      .filter((id) => id !== currentFormBuyer)
      .map((id) => ({ sellerId: id, amount: Number(sellerAmounts[id] || 0) }))
      .filter((s) => s.amount > 0);
    if (shares.length === 0) {
      setSubmitError("少なくとも1人分の金額を入力してください。");
      return;
    }
    setSubmitError(null);
    setRebuys((prev) => [...prev, { id: `r${rebuyCounter}`, buyerId: currentFormBuyer, shares }]);
    setRebuyCounter((n) => n + 1);
    setSellerAmounts({});
  }

  function removeRebuy(id: string) {
    setRebuys((prev) => prev.filter((r) => r.id !== id));
  }

  async function handleConfirm() {
    if (zeroSum.status !== "ready") return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch(edit ? `/api/sessions/${edit.id}` : "/api/sessions", {
        method: edit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionDate,
          location: location || undefined,
          startTime: startTime || undefined,
          endTime: endTime || undefined,
          entries: entryList.map((e) => ({
            userId: e.userId,
            initialStake: e.initialStake,
            cashOut: e.cashOut,
          })),
          rebuys: rebuys.map((r) => ({ buyerId: r.buyerId, shares: r.shares })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSubmitError(data.error ?? "保存に失敗しました。");
        setSubmitting(false);
        return;
      }
      if (edit) {
        router.push(`/sessions/${edit.id}`);
        router.refresh();
        return;
      }
      setResult(data as ConfirmResult);
    } catch {
      setSubmitError("通信エラーが発生しました。もう一度お試しください。");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!edit) return;
    if (!window.confirm("この対局を削除しますか? 元に戻せません。")) return;
    setDeleting(true);
    setSubmitError(null);
    try {
      const res = await fetch(`/api/sessions/${edit.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setSubmitError(data?.error ?? "削除に失敗しました。");
        setDeleting(false);
        return;
      }
      router.push("/sessions");
      router.refresh();
    } catch {
      setSubmitError("通信エラーが発生しました。もう一度お試しください。");
      setDeleting(false);
    }
  }

  if (result) {
    return (
      <div className="page-shell">
        <div className="confirmed-badge">
          <IconCheck size={14} />
          <span>確定しました</span>
        </div>
        <h1 className="page-title">対局を保存しました</h1>
        <p className="page-subtitle">
          {new Date(sessionDate).toLocaleDateString("ja-JP")}
          {location ? ` ・ ${location}` : ""}
        </p>

        <div className="block-title" style={{ marginBottom: 10 }}>
          精算提案
        </div>
        <div className="table-scroll" style={{ marginBottom: 24 }}>
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
              {result.settlements.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ color: "var(--muted)" }}>
                    全員±0円のため、送金の必要はありません。
                  </td>
                </tr>
              ) : (
                result.settlements.map((s, i) => (
                  <tr key={i}>
                    <td>{s.fromName}</td>
                    <td className="arrow">→</td>
                    <td>{s.toName}</td>
                    <td className="num">{yen(s.amount)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="block-title" style={{ marginBottom: 10 }}>
          通算成績の更新
        </div>
        <div className="table-scroll" style={{ marginBottom: 24 }}>
          <table>
            <thead>
              <tr>
                <th>参加者</th>
                <th className="num">通算収支</th>
                <th className="num">勝率</th>
                <th className="num">平均収支</th>
              </tr>
            </thead>
            <tbody>
              {result.statUpdates.map((u) => (
                <tr key={u.userId}>
                  <td>{u.name}</td>
                  <td className="num">
                    <span className={u.before.totalProfit >= 0 ? "amt-gain" : "amt-loss"}>
                      {yen(u.before.totalProfit, true)}
                    </span>
                    <span className="arrow">→</span>
                    <span className={u.after.totalProfit >= 0 ? "amt-gain" : "amt-loss"}>
                      {yen(u.after.totalProfit, true)}
                    </span>
                  </td>
                  <td className="num">
                    {u.before.winRatePct.toFixed(1)}% <span className="arrow">→</span>{" "}
                    {u.after.winRatePct.toFixed(1)}%
                  </td>
                  <td className="num">
                    <span className={u.before.avgProfit >= 0 ? "amt-gain" : "amt-loss"}>
                      {yen(u.before.avgProfit, true)}
                    </span>
                    <span className="arrow">→</span>
                    <span className={u.after.avgProfit >= 0 ? "amt-gain" : "amt-loss"}>
                      {yen(u.after.avgProfit, true)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Link href="/" className="ghost" style={{ textDecoration: "none", textAlign: "center" }}>
            ホームに戻る
          </Link>
          <Link
            href={`/sessions/${result.sessionId}`}
            className="primary"
            style={{ textDecoration: "none", textAlign: "center", flex: 1 }}
          >
            対局の詳細を見る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell" style={{ paddingLeft: 0, paddingRight: 0 }}>
      <div className="card" style={{ borderRadius: 0, border: "none", borderBottom: "1px solid var(--line)" }}>
        <div className="app-header" style={{ position: "static" }}>
          <div>
            <div className="app-header-brand">{edit ? "対局を編集" : "対局を記録"}</div>
            <div style={{ fontSize: 11.5, color: "var(--muted)" }}>その日の収支計算</div>
          </div>
          <input
            type="date"
            value={sessionDate}
            onChange={(e) => setSessionDate(e.target.value)}
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              color: "var(--ink)",
              background: "var(--surface-2)",
              border: "1px solid var(--line)",
              borderRadius: 8,
              padding: "7px 9px",
            }}
          />
        </div>
      </div>

      <div className="block">
        <div className="field" style={{ maxWidth: 320, marginBottom: 14 }}>
          <label htmlFor="location">場所(任意)</label>
          <input
            id="location"
            type="text"
            placeholder="例: Aさん宅"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <div className="field" style={{ maxWidth: 160 }}>
            <label htmlFor="startTime">開始時刻(任意)</label>
            <input id="startTime" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="field" style={{ maxWidth: 160 }}>
            <label htmlFor="endTime">終了時刻(任意)</label>
            <input id="endTime" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
        </div>
        <p className="block-desc" style={{ marginTop: 8, marginBottom: 0 }}>
          開始・終了時刻を入力すると、個人成績に時給換算の収支が表示されます。
        </p>
      </div>

      <div className="block">
        <div className="block-title">
          <span className="step-num">1</span>
          <span>参加者を選ぶ</span>
          <span className="hint">{selected.length} / 10人 選択中</span>
        </div>
        {!edit && quickFill && selected.length === 0 && (
          <button
            type="button"
            className="ghost"
            style={{ marginBottom: 12 }}
            onClick={applyQuickFill}
          >
            前回({formatDate(quickFill.sessionDate)})と同じ参加者で始める
          </button>
        )}
        <div className="member-picker">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              className="chip"
              aria-pressed={selected.includes(m.id)}
              disabled={confirmed}
              onClick={() => toggleMember(m.id)}
            >
              {m.name}
            </button>
          ))}
        </div>
        {members.length <= 1 && (
          <p className="block-desc" style={{ paddingLeft: 27, marginTop: 10, marginBottom: 0 }}>
            参加者として選べるのは自分の友達のみです。
            <Link href="/friends">友達を追加する</Link>
          </p>
        )}
      </div>

      <div className="block">
        <div className="block-title">
          <span className="step-num">2</span>
          <span>持ち金額を入力</span>
          <span className="hint">
            {filledCount} / {selected.length}人 最後の持ち金額を入力済み
          </span>
        </div>
        <div className="entries">
          {selected.map((id) => {
            const entry = entryOf(id);
            const profit = profitOf(
              { userId: id, initialStake: entry.initial, cashOut: entry.cashOut },
              rebuyInputs
            );
            const net = interimRebuyNet(rebuyInputs, id);
            return (
              <div className="entry-row" key={id}>
                <div className="entry-top">
                  <div className="entry-name">{byId.get(id)?.name}</div>
                  {profit !== null ? (
                    <div className={`status-pill final ${profit >= 0 ? "gain" : "loss"}`}>
                      収支 {yen(profit, true)}
                    </div>
                  ) : net === 0 ? (
                    <div className="status-pill pending">暫定 リバイなし</div>
                  ) : (
                    <div className={`status-pill pending ${net >= 0 ? "gain" : "loss"}`}>
                      暫定(リバイのみ) {yen(net, true)}
                    </div>
                  )}
                </div>
                <div className="entry-meta">
                  総バイイン(リバイ反映後){" "}
                  {yen(
                    totalBuyIn({ userId: id, initialStake: entry.initial, cashOut: entry.cashOut }, rebuyInputs)
                  )}
                </div>
                <div className="entry-fields">
                  <div className="field">
                    <label>開始時の持ち金額</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      value={entry.initial}
                      disabled={confirmed}
                      onChange={(e) => setEntry(id, { initial: Number(e.target.value || 0) })}
                    />
                  </div>
                  <div className="field">
                    <label>最後の持ち金額</label>
                    <input
                      type="number"
                      min={0}
                      step={1000}
                      placeholder="対局後に入力"
                      value={entry.cashOut ?? ""}
                      disabled={confirmed}
                      onChange={(e) =>
                        setEntry(id, { cashOut: e.target.value === "" ? null : Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
          {selected.length === 0 && (
            <div className="rebuy-empty" style={{ paddingLeft: 0 }}>
              まず参加者を選んでください。
            </div>
          )}
        </div>
      </div>

      <div className="block">
        <div className="block-title">
          <span className="step-num">3</span>
          <span>リバイを記録</span>
        </div>
        <p className="block-desc" style={{ paddingLeft: 27 }}>
          リバイは他の参加者から持ち金額を買います。1人からのときも、複数人から少しずつ(例:
          3人から1,000円ずつ)のときもあります。対局中はメモとして記録しておき、最後にまとめて収支に反映します。
        </p>

        {selected.length < 2 || confirmed ? (
          <div className="rebuy-empty">
            {confirmed ? "確定済みのため記録できません。" : "参加者を2人以上選ぶとリバイを記録できます。"}
          </div>
        ) : (
          <div className="rebuy-form">
            <div className="rebuy-form-label">買い手(誰が買ったか)</div>
            <div className="rebuy-buyer-picker">
              {selected.map((id) => (
                <button
                  key={id}
                  type="button"
                  className="chip small"
                  aria-pressed={id === currentFormBuyer}
                  onClick={() => setFormBuyer(id)}
                >
                  {byId.get(id)?.name}
                </button>
              ))}
            </div>
            <div className="rebuy-form-label">売り手ごとの金額(買った相手だけ入力)</div>
            <div className="rebuy-seller-rows">
              {selected
                .filter((id) => id !== currentFormBuyer)
                .map((id) => (
                  <div className="rebuy-row" key={id}>
                    <span>{byId.get(id)?.name}から</span>
                    <input
                      type="number"
                      min={0}
                      step={500}
                      placeholder="0円"
                      value={sellerAmounts[id] ?? ""}
                      onChange={(e) =>
                        setSellerAmounts((prev) => ({ ...prev, [id]: e.target.value }))
                      }
                    />
                  </div>
                ))}
            </div>
            <button type="button" className="record-btn" onClick={addRebuy}>
              <IconPlus />
              この内容を記録する
            </button>
          </div>
        )}

        <div className="rebuy-list">
          {rebuys.length === 0 && <div className="rebuy-empty">まだリバイの記録はありません。</div>}
          {rebuys.map((r) => {
            const total = r.shares.reduce((s, sh) => s + sh.amount, 0);
            return (
              <div className="rebuy-item" key={r.id}>
                <div>
                  <strong>{byId.get(r.buyerId)?.name}</strong>が購入 ←{" "}
                  {r.shares.map((s) => `${byId.get(s.sellerId)?.name} ${s.amount.toLocaleString("ja-JP")}円`).join("・")}{" "}
                  <span className="hint">(計{total.toLocaleString("ja-JP")}円)</span>
                </div>
                <button
                  type="button"
                  className="rebuy-del"
                  aria-label="このリバイ記録を削除"
                  disabled={confirmed}
                  onClick={() => removeRebuy(r.id)}
                >
                  <IconX />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="footer-actions">
        <div style={{ padding: "14px 20px 0" }}>
          {submitError && <div className="form-error" style={{ marginBottom: 0 }}>{submitError}</div>}
          {!submitError && (
            <div
              className={`status-banner ${
                zeroSum.status === "ready"
                  ? "ready"
                  : zeroSum.status === "mismatch"
                  ? "mismatch"
                  : "incomplete"
              }`}
            >
              {zeroSum.status === "ready" && (
                <>
                  <IconCheck />
                  <span>収支の合計が0円です。確定できます。</span>
                </>
              )}
              {zeroSum.status === "mismatch" && (
                <>
                  <IconAlert />
                  <span>収支の合計が {yen(zeroSum.sum, true)} ズレています。持ち金額かリバイの記録を確認してください。</span>
                </>
              )}
              {zeroSum.status === "incomplete" && (
                <>
                  <IconInfo />
                  <span>
                    {selected.length === 0
                      ? "参加者を選んでください。"
                      : `${zeroSum.missingUserIds.length}人の最後の持ち金額が未入力です。`}
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="action-bar">
          {edit && (
            <button type="button" className="danger-ghost" disabled={deleting || submitting} onClick={handleDelete}>
              {deleting ? "削除中…" : "削除する"}
            </button>
          )}
          <button
            type="button"
            className="primary"
            disabled={zeroSum.status !== "ready" || submitting || deleting}
            onClick={handleConfirm}
            style={{ flex: 1 }}
          >
            {submitting ? "保存中…" : edit ? "更新する" : "この内容で確定する"}
          </button>
        </div>
      </div>
    </div>
  );
}
