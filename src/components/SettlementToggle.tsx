"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

export function SettlementToggle({
  id,
  settled,
  canToggle,
}: {
  id: string;
  settled: boolean;
  canToggle: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle() {
    setBusy(true);
    setError(null);
    const result = await apiRequest(`/api/settlements/${id}/toggle`, { method: "POST" });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (!canToggle) {
    return settled ? (
      <span className="pill">精算済み</span>
    ) : (
      <span className="hint" style={{ marginLeft: 0 }}>
        未精算
      </span>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
      <button
        type="button"
        className={settled ? "ghost" : "record-btn"}
        disabled={busy}
        onClick={handleToggle}
        style={{ fontSize: 12.5, padding: "6px 12px" }}
      >
        {busy ? "処理中…" : settled ? "精算済み(取り消す)" : "精算済みにする"}
      </button>
      {error && <span style={{ fontSize: 11, color: "var(--loss)" }}>{error}</span>}
    </div>
  );
}
