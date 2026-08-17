"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, displayName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "登録に失敗しました。");
      setBusy(false);
      return;
    }

    const signInResult = await signIn("credentials", { email, password, redirect: false });
    if (!signInResult || signInResult.error) {
      setError("登録は完了しましたが、自動ログインに失敗しました。ログイン画面からお試しください。");
      setBusy(false);
      return;
    }
    router.push("/group/setup");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <div className="form-error">{error}</div>}

      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="displayName">表示名</label>
        <input
          id="displayName"
          type="text"
          placeholder="例: たけちん"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          required
          maxLength={20}
        />
      </div>
      <div className="field" style={{ marginBottom: 14 }}>
        <label htmlFor="email">メールアドレス</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="field" style={{ marginBottom: 18 }}>
        <label htmlFor="password">パスワード(8文字以上)</label>
        <input
          id="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <button type="submit" className="primary" disabled={busy} style={{ width: "100%" }}>
        {busy ? "登録中…" : "登録する"}
      </button>
    </form>
  );
}
