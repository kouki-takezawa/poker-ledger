"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AddFriendButton({ friendCode, name }: { friendCode: string; name: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    setError(null);
    setBusy(true);
    const res = await fetch("/api/friends", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ friendCode }),
    });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setError(data.error ?? "追加に失敗しました。");
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div>
        <div className="status-banner ready" style={{ marginBottom: 16 }}>
          {name}さんを友達に追加しました。
        </div>
        <button type="button" className="primary" style={{ width: "100%" }} onClick={() => router.push("/friends")}>
          友達一覧へ
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && <div className="form-error">{error}</div>}
      <button type="button" className="primary" style={{ width: "100%" }} disabled={busy} onClick={handleAdd}>
        {busy ? "追加中…" : `${name}さんを友達に追加する`}
      </button>
    </div>
  );
}
