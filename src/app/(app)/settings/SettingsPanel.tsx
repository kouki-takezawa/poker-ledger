"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type MemberRow = { id: string; userId: string; displayName: string; role: string };

export function SettingsPanel({
  initialName,
  initialInviteCode,
  members,
  isAdmin,
  currentUserId,
}: {
  initialName: string;
  initialInviteCode: string;
  members: MemberRow[];
  isAdmin: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const res = await fetch("/api/group/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    router.refresh();
  }

  async function handleRegenerate() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/group/invite-code", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    setInviteCode(data.inviteCode);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!window.confirm("このメンバーをグループから削除しますか?")) return;
    setError(null);
    const res = await fetch(`/api/group/members/${memberId}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    router.refresh();
  }

  async function handleLeave() {
    if (!window.confirm("グループを退会しますか? 再度参加するには招待コードが必要です。")) return;
    setError(null);
    const res = await fetch("/api/group/leave", { method: "POST" });
    const data = await res.json();
    if (!res.ok) return setError(data.error);
    router.push("/group/setup");
    router.refresh();
  }

  return (
    <div>
      {error && <div className="form-error">{error}</div>}

      <div className="block-title" style={{ marginBottom: 10 }}>
        グループ名
      </div>
      <form onSubmit={handleRename} style={{ display: "flex", gap: 8, marginBottom: 24, maxWidth: 420 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isAdmin || busy}
          maxLength={40}
          style={{
            flex: 1,
            font: "inherit",
            fontSize: 14,
            padding: "9px 10px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink)",
          }}
        />
        {isAdmin && (
          <button type="submit" className="ghost" disabled={busy}>
            保存
          </button>
        )}
      </form>

      <div className="block-title" style={{ marginBottom: 10 }}>
        招待コード
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 24 }}>
        <code
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 20,
            letterSpacing: "0.08em",
            background: "var(--surface-2)",
            padding: "8px 14px",
            borderRadius: 8,
          }}
        >
          {inviteCode}
        </code>
        <button type="button" className="ghost" onClick={handleCopy}>
          {copied ? "コピーしました" : "コピー"}
        </button>
        {isAdmin && (
          <button type="button" className="ghost" onClick={handleRegenerate} disabled={busy}>
            再発行
          </button>
        )}
      </div>

      <div className="block-title" style={{ marginBottom: 10 }}>
        メンバー ({members.length} / 10人)
      </div>
      <div className="table-scroll" style={{ marginBottom: 24 }}>
        <table>
          <thead>
            <tr>
              <th>名前</th>
              <th>役割</th>
              {isAdmin && <th></th>}
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>
                  {m.displayName}
                  {m.userId === currentUserId && <span className="hint"> (あなた)</span>}
                </td>
                <td>{m.role === "admin" ? "管理者" : "メンバー"}</td>
                {isAdmin && (
                  <td className="num">
                    {m.userId !== currentUserId && (
                      <button type="button" className="danger-ghost" onClick={() => handleRemoveMember(m.id)}>
                        削除
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button type="button" className="danger-ghost" onClick={handleLeave}>
        グループを退会する
      </button>
    </div>
  );
}
