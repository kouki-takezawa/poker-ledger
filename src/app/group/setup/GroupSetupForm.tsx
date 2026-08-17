"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GroupSetupForm() {
  const router = useRouter();
  const [tab, setTab] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch(tab === "create" ? "/api/group/create" : "/api/group/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tab === "create" ? { name } : { inviteCode }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "エラーが発生しました。");
        setBusy(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。");
      setBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <button
          type="button"
          className="chip"
          aria-pressed={tab === "create"}
          onClick={() => {
            setTab("create");
            setError(null);
          }}
        >
          新しく作る
        </button>
        <button
          type="button"
          className="chip"
          aria-pressed={tab === "join"}
          onClick={() => {
            setTab("join");
            setError(null);
          }}
        >
          招待コードで参加
        </button>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit}>
        {tab === "create" ? (
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="group-name">グループ名</label>
            <input
              id="group-name"
              type="text"
              placeholder="例: 月イチポーカー部"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={40}
            />
          </div>
        ) : (
          <div className="field" style={{ marginBottom: 16 }}>
            <label htmlFor="invite-code">招待コード</label>
            <input
              id="invite-code"
              type="text"
              placeholder="例: A2B4C6"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              required
              style={{ textTransform: "uppercase" }}
            />
          </div>
        )}
        <button type="submit" className="primary" disabled={busy} style={{ width: "100%" }}>
          {busy ? "処理中…" : tab === "create" ? "グループを作成する" : "グループに参加する"}
        </button>
      </form>
    </div>
  );
}
