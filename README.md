# ポーカー収支帳

仲間内(最大10人)でのポーカーの収支・勝率を記録し、その日の精算まで行うWebアプリ。仕様は同じチャットで作成した仕様書を参照。

## 機能

- メールアドレス+パスワードでの個別アカウント
- グループ作成・招待コードでの参加(1人につき同時に1グループまで)
- 対局の記録: 参加者ごとの開始時/最後の持ち金額、リバイ(誰から買ったか、複数人からでも可)を入力すると、その場でリバイ分の暫定収支と最終収支・ゼロサム検証がリアルタイムに表示される
- 確定すると最小送金数の精算提案と、通算収支・勝率・平均収支の更新を表示
- 対局履歴、個人成績(推移グラフ付き)、グループランキング、メンバー・グループ設定
- ハンバーガーメニューでの画面遷移、PWA対応(ホーム画面追加)

## 技術スタック

Next.js(App Router)+ TypeScript、Prisma、Auth.js(NextAuth)Credentials Provider、素のCSSによるデザインシステム(Tailwindは同梱のみ)。

## ローカル開発

```bash
npm install
npx prisma migrate dev
npm run dev
```

`.env` にローカル用のSQLite設定とAuthシークレットが入っています(リポジトリには含まれません)。ローカルで新規に用意する場合は以下を作成してください。

```bash
DATABASE_URL="file:./dev.db"
AUTH_SECRET="<openssl rand -base64 32 などで生成>"
NEXTAUTH_URL="http://localhost:3000"
```

## デプロイ(Vercel)

本番では SQLite ではなく Postgres が必要です(Vercel の Serverless Functions はローカルファイルを永続化できないため)。

1. Vercel でこのGitHubリポジトリをインポートする
2. Storage タブから Postgres(Vercel Postgres / Neon など)を追加すると `DATABASE_URL` が自動で設定される
3. `prisma/schema.prisma` の `datasource db` の `provider` を `sqlite` から `postgresql` に変更してコミット
4. 環境変数に `AUTH_SECRET`(ランダムな文字列)と `NEXTAUTH_URL`(デプロイ後のURL)を設定
5. デプロイ後、初回のみ `npx prisma migrate deploy` を本番DBに対して実行(Vercelのビルドコマンドに組み込むか、ローカルから本番の`DATABASE_URL`を指定して実行)
