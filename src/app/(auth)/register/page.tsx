import Link from "next/link";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <div className="card" style={{ width: "100%", maxWidth: 380 }}>
      <div className="block">
        <h1 className="page-title" style={{ marginTop: 0 }}>
          新規登録
        </h1>
        <p className="page-subtitle">メールアドレスとパスワードでアカウントを作成します。</p>
        <RegisterForm />
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 18 }}>
          すでにアカウントをお持ちの方は <Link href="/login">ログイン</Link>
        </p>
      </div>
    </div>
  );
}
