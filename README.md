# ポーカー収支帳

友達とのポーカーの収支・勝率を記録し、その日の精算まで行うWebアプリ。グループのような固定の入れ物はなく、対局のたびに幹事が自分の友達を誘って記録する。詳細仕様は [docs/](docs/) 以下の仕様書を参照。

## 本番環境

https://poker-ledger-alpha.vercel.app (Vercel、`main`ブランチから自動デプロイ)

## 機能

- メールアドレス+パスワードでの個別アカウント。登録すると自分専用のID(8桁のfriendCode)が自動で発行される
- **友達機能**: 自分のQRコード、またはIDを直接入力して誰とでも友達になれる(LINEのID交換に近いイメージ)。グループのような共有の場は不要 (詳細は [docs/spec-friends.md](docs/spec-friends.md))
- 対局の記録: 参加者は幹事(記録した本人)の友達の中から選ぶ。参加者ごとの開始時/最後の持ち金額、リバイ(誰から買ったか、複数人からでも可)を入力すると、その場でリバイ分の暫定収支と最終収支・ゼロサム検証がリアルタイムに表示される
- 確定すると最小送金数の精算提案と、通算収支・勝率・平均収支の更新を表示
- **個人・友達の収支表**: 通算収支(生涯収支)・勝率・平均収支・参加回数・連勝/連敗・友達内順位・収支推移グラフ・最大勝ち/最大負け・対局ごとの結果を、自分(`/me`)だけでなく友達1人ずつ(`/members/[userId]`)についても閲覧可能
- **カレンダー**: 月表示で「何日にいくら勝った/負けた」が一目でわかる(`/me`, `/members/[userId]`)
- **友達一覧**(`/friends`): 追加した友達の収支・勝率などをまとめて一覧表示。名前から個人ページへ遷移可能(旧グループランキングの役割を兼ねる)
- **期間フィルタ**: 個人成績・友達詳細・友達一覧の各ページで「全期間 / 今年 / 今月」を切り替え可能(日本時間基準)
- 対局履歴
- ハンバーガーメニューでの画面遷移、PWA対応(ホーム画面追加)

## 仕様書

- [docs/spec-member-profile.md](docs/spec-member-profile.md): 個人・メンバー収支詳細ページ、期間フィルタ、カレンダー
- [docs/spec-friends.md](docs/spec-friends.md): 友達機能(QR/ID)、対局参加者の制限、グループ機能廃止の経緯

## 技術スタック

Next.js(App Router)+ TypeScript、Prisma、Auth.js(NextAuth)Credentials Provider、`qrcode`(友達追加用QR生成)、素のCSSによるデザインシステム(Tailwindは同梱のみ)。データベースはPostgres(本番はNeon)。

## ローカル開発

DBはPostgresを使用する(Prismaのdatasourceが`postgresql`固定)。[Neon](https://neon.tech)の無料プランなどでローカル用のPostgresインスタンスを用意するのが手軽。

```bash
npm install
npx prisma migrate dev
npm run dev
```

`.env`(リポジトリには含まれないため各自作成):

```bash
DATABASE_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"
AUTH_SECRET="<openssl rand -base64 32 などで生成>"
NEXTAUTH_URL="http://localhost:3000"
```

## デプロイ(Vercel)

1. Vercel でこのGitHubリポジトリをインポートする
2. Storage タブから Postgres(Neon など)を追加、または既存のPostgresの接続文字列を`DATABASE_URL`に設定する
3. 環境変数に `AUTH_SECRET`(ランダムな文字列)と `NEXTAUTH_URL`(デプロイ後のURL)を設定
4. デプロイ後、初回および新しいマイグレーション追加時は `npx prisma migrate deploy` を本番DBに対して実行(Vercelのビルドコマンドに組み込むか、ローカルから本番の`DATABASE_URL`を指定して実行)

**⚠ 既存の本番DBがある場合**: `prisma/migrations/20260819010000_remove_groups_add_friend_code` はGroup/GroupMemberテーブルを削除する破壊的マイグレーション。対局そのものの記録(Session/SessionEntry/Rebuy/Settlement)は失われないが、適用前に本番DBのバックアップを取ること。
