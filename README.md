# ポーカー収支帳 (poker-ledger)

友達内で開くカジノポーカー(テキサスホールデム)の**収支・勝率を記録し、その場で精算まで済ませる**ための個人開発Webアプリ。

## これは何のリポジトリか

友達同士でポーカーをすると、「今日は誰が何点勝った/負けた」「リバイ(追加のチップ購入)を誰から何回買ったか」「最終的に誰が誰にいくら払えば清算できるか」を暗算やメモで済ませがちで、記録が残らず後から通算成績も追えない、という課題がある。このアプリはその課題を解決するために作られた、**幹事(その日の記録担当者)が対局のたびに参加者を選んで収支を記録し、最小送金数の精算案を自動で算出してくれる**個人〜少人数グループ向けのポーカー収支管理サービス。

「グループ」のような固定の入れ物は存在せず、LINEのID交換のような感覚で友達を追加し、対局のたびに幹事が自分の友達の中から参加者を招集する、という設計になっている(詳細な経緯は [docs/spec-friends.md](docs/spec-friends.md) を参照)。

想定ユーザーは、定期的に友達内でポーカーを打つ社会人・学生グループの「幹事役」と、その友達たち。スマホのホーム画面に追加して使うPWAとしての利用も想定している。

## 主な機能

- **アカウント / 友達機能**
  - メールアドレス+パスワードでの個別アカウント登録。登録すると自分専用の8桁ID(`friendCode`)が自動発行される
  - 自分のQRコード、またはIDを直接入力することで誰とでも友達になれる(承認フローなし、LINEのID交換に近い体験)
- **対局の記録・精算**
  - 対局の参加者は、幹事(記録した本人)の友達の中から選択
  - 参加者ごとに開始時/最後の持ち金額、リバイ(誰から買ったか、複数人からの購入も可)を入力
  - 入力中もリバイ分の暫定収支・最終収支・ゼロサム検証(収支の合計がゼロになっているか)をリアルタイムに表示
  - 対局を確定すると、送金回数が最小になるような精算案を自動算出し、通算収支・勝率・平均収支を更新
- **個人・友達の収支表**
  - 通算収支(生涯収支)、勝率、平均収支、参加回数、連勝/連敗、友達内での順位、収支推移グラフ、最大勝ち/最大負け、対局ごとの結果を、自分のページ(`/me`)だけでなく友達1人ずつのページ(`/members/[userId]`)でも閲覧可能
  - カレンダー表示で「何日にいくら勝った/負けたか」が月単位で一目でわかる
  - 期間フィルタ(全期間 / 今年 / 今月、日本時間基準)を個人成績・友達詳細・友達一覧の各ページで切り替え可能
- **友達一覧**(`/friends`): 追加した友達の収支・勝率などをまとめて一覧表示し、名前から個人ページへ遷移できる(旧グループランキング機能の役割を兼ねる)
- **対局履歴**: 過去の対局の一覧・詳細確認
- **勝率計算機**(`/equity`): 自分の手札・相手の手札・場のカード(0〜5枚、任意の枚数)を選ぶと、その時点での勝率(win/tie/lose)を計算できるテキサスホールデム用のエクイティ計算ツール
- ハンバーガーメニューでの画面遷移、PWA対応(ホーム画面に追加してアプリのように利用可能)

## 技術スタック

- **フレームワーク**: Next.js 16 (App Router) + React 19 + TypeScript
- **DB / ORM**: PostgreSQL(本番は [Neon](https://neon.tech))+ Prisma
- **認証**: Auth.js (NextAuth) の Credentials Provider(メールアドレス+パスワード、`bcryptjs`でハッシュ化)
- **その他ライブラリ**: `qrcode`(友達追加用QRコード生成)、`zod`(バリデーション)
- **スタイリング**: 素のCSSによる自前のデザインシステム(Tailwindは同梱のみで本体では未使用)
- **デプロイ**: Vercel(`main`ブランチから自動デプロイ)

## ディレクトリ構成

```
src/
  app/
    (app)/        # ログイン後の画面群(me, friends, sessions, equity など)。App Routerのルートグループ
    (auth)/       # ログイン・新規登録画面
    api/          # Route Handlers(認証、対局、友達、精算、勝率計算などのAPI)
  components/     # ページ共通のUIコンポーネント(カレンダー、グラフ、ダイアログなど)
  lib/            # ドメインロジック(収支計算、対局処理、友達関係、統計、ポーカーの役判定・勝率計算など)
prisma/
  schema.prisma   # DBスキーマ定義
  migrations/     # マイグレーション履歴
docs/             # 各機能の詳細仕様書(下記「仕様書」を参照)
```

## データベース構成(概要)

Prismaスキーマ(`prisma/schema.prisma`)の主なモデルは以下の通り。

- `User`: アカウント情報と`friendCode`(友達追加用の8桁ID)
- `Friendship`: 片方向の友達関係(承認フローなし)
- `Session`: 1回の対局。幹事(`createdBy`)と日時・場所・ステータス(`draft`/`confirmed`)を持つ。固定のグループには属さない
- `SessionEntry`: 対局ごとの各参加者の開始/終了持ち金額
- `Rebuy` / `RebuyShare`: リバイ(追加チップ購入)とその購入元(複数人から購入可能)
- `Settlement`: 対局確定後に算出される、誰が誰にいくら払うかの精算レコード

## 本番環境

https://poker-ledger-alpha.vercel.app (Vercel、`main`ブランチから自動デプロイ)

## 仕様書

- [docs/spec-member-profile.md](docs/spec-member-profile.md): 個人・メンバー収支詳細ページ、期間フィルタ、カレンダー
- [docs/spec-friends.md](docs/spec-friends.md): 友達機能(QR/ID)、対局参加者の制限、グループ機能廃止の経緯
- [docs/spec-ux-review.md](docs/spec-ux-review.md): UXレビュー

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
