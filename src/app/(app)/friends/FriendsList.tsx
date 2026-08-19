"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { yen } from "@/lib/format";

export type FriendRow = {
  userId: string;
  name: string;
  totalProfit: number;
  winRatePct: number;
  avgProfit: number;
  participations: number;
};

export function FriendsList({ friends }: { friends: FriendRow[] }) {
  const router = useRouter();
  const [sortKey, setSortKey] = useState<"totalProfit" | "winRatePct">("totalProfit");
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const sorted = useMemo(() => [...friends].sort((a, b) => b[sortKey] - a[sortKey]), [friends, sortKey]);

  async function handleRemove(friendId: string) {
    if (!window.confirm("この友達を削除しますか? 対局の参加者に選べなくなります。")) return;
    setError(null);
    setBusyId(friendId);
    const res = await fetch(`/api/friends/${friendId}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "削除に失敗しました。");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && <div className="form-error">{error}</div>}

      {friends.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <button
            type="button"
            className="chip"
            aria-pressed={sortKey === "totalProfit"}
            onClick={() => setSortKey("totalProfit")}
          >
            収支順
          </button>
          <button
            type="button"
            className="chip"
            aria-pressed={sortKey === "winRatePct"}
            onClick={() => setSortKey("winRatePct")}
          >
            勝率順
          </button>
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>友達</th>
              <th className="num">通算収支</th>
              <th className="num">勝率</th>
              <th className="num">平均収支</th>
              <th className="num">参加数</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((f) => (
              <tr key={f.userId}>
                <td>
                  <Link href={`/members/${f.userId}`}>{f.name}</Link>
                </td>
                <td className={`num ${f.totalProfit >= 0 ? "amt-gain" : "amt-loss"}`}>{yen(f.totalProfit, true)}</td>
                <td className="num">{f.winRatePct.toFixed(1)}%</td>
                <td className={`num ${f.avgProfit >= 0 ? "amt-gain" : "amt-loss"}`}>{yen(f.avgProfit, true)}</td>
                <td className="num">{f.participations}</td>
                <td className="num">
                  <button
                    type="button"
                    className="danger-ghost"
                    disabled={busyId === f.userId}
                    onClick={() => handleRemove(f.userId)}
                  >
                    削除
                  </button>
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={6} style={{ color: "var(--muted)" }}>
                  まだ友達が登録されていません。上のQRコードかIDで追加してください。
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
