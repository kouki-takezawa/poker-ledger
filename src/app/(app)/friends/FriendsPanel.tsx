"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api-client";

export function FriendsPanel({
  friendCode,
  qrSrc,
  shareUrl,
}: {
  friendCode: string;
  qrSrc: string;
  shareUrl: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(friendCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard unavailable; ignore
    }
  }

  async function handleShare() {
    try {
      await navigator.share({ title: "ポーカー収支帳で友達に追加", text: `友達に追加してください: ${friendCode}`, url: shareUrl });
    } catch {
      // user cancelled the share sheet, or share unavailable; ignore
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    const result = await apiRequest<{ name: string }>("/api/friends", { body: { friendCode: code } });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCode("");
    setNotice(`${result.data.name}さんを友達に追加しました。`);
    router.refresh();
  }

  return (
    <div>
      <div className="block-title" style={{ marginBottom: 10 }}>
        自分のQRコード / ID
      </div>
      <div className="card" style={{ padding: 18, marginBottom: 20, display: "flex", gap: 16, alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={qrSrc} alt="友達追加用QRコード" width={110} height={110} style={{ borderRadius: 8, flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>
            相手にこのQRを読み取ってもらうか、下のIDを伝えてください。
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <code
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 18,
                letterSpacing: "0.06em",
                background: "var(--surface-2)",
                padding: "6px 10px",
                borderRadius: 8,
              }}
            >
              {friendCode}
            </code>
            <button type="button" className="ghost" onClick={handleCopy} style={{ padding: "6px 10px", fontSize: 12.5 }}>
              {copied ? "コピーしました" : "コピー"}
            </button>
            {canShare && (
              <button type="button" className="ghost" onClick={handleShare} style={{ padding: "6px 10px", fontSize: 12.5 }}>
                共有
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="block-title" style={{ marginBottom: 10 }}>
        IDで友達を追加
      </div>
      {error && <div className="form-error">{error}</div>}
      {notice && !error && (
        <div className="status-banner ready" style={{ marginBottom: 14 }}>
          {notice}
        </div>
      )}
      <form onSubmit={handleAdd} style={{ display: "flex", gap: 8, marginBottom: 8, maxWidth: 360 }}>
        <input
          type="text"
          placeholder="例: A2B4C6D8"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          style={{
            flex: 1,
            font: "inherit",
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            textTransform: "uppercase",
            padding: "9px 10px",
            borderRadius: 8,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink)",
          }}
        />
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "追加中…" : "追加する"}
        </button>
      </form>
    </div>
  );
}
