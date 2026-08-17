import Link from "next/link";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="card" style={{ width: "100%", maxWidth: 380 }}>
      <div className="block">
        <h1 className="page-title" style={{ marginTop: 0 }}>
          ♠ ポーカー収支帳
        </h1>
        <p className="page-subtitle">メールアドレスとパスワードでログインしてください。</p>
        <LoginForm />
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 18 }}>
          アカウントをお持ちでない方は <Link href="/register">新規登録</Link>
        </p>
      </div>
    </div>
  );
}
