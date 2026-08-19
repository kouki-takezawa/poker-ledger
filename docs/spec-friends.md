# 仕様書: 友達機能(グループ廃止版)

- 作成日: 2026-08-19(v2: 同日、グループ機能の全廃に伴い全面改訂)
- 対象: 友達追加機能(QRコード / ID)、「幹事の友達のみが対局に参加できる」制限、グループ機能の廃止
- 関連: [[docs/spec-member-profile.md]] で追加した個人・メンバー収支ページを流用する

## 1. 目的・背景

初期実装では1グループ(最大10人、招待コードで参加)に所属していれば誰でも対局の参加者として選べた。だが実際の使い方は「グループ」という長期間固定のメンバーシップではなく、**対局のたびにその場の友達を誘う**というもので、グループという単位はその場限り(その日のメンバー構成)でしかない。

そこで、持続的な入れ物である「グループ」を廃止し、**ユーザー同士の「友達」関係**(個人間の永続的なつながり)だけをベースにする方式に変更した。対局はその都度、幹事が自分の友達の中から参加者を選ぶだけで成立する。ランキングなどの成績閲覧も、友達に追加した相手だけが対象になる。

## 2. グループ機能の廃止

### 2.1 廃止したもの

- `Group` / `GroupMember` モデル(Prismaスキーマから削除)
- グループの作成・招待コード参加・改名・メンバー管理・脱退の全画面/API(`/group/setup`, `/settings`, `/api/group/*`)
- 「1人1グループまで」という制約、および `requireUserWithGroup()` ヘルパー
- グループ全員を対象にした `/ranking` ページ(→友達だけを対象にした `/friends` の一覧に統合)

### 2.2 何が変わったか

- `Session` は `groupId` を持たない。対局は単に「作成者(幹事) + 参加者(`SessionEntry`)」で完結する。
- 対局履歴・対局詳細の閲覧は「グループが同じか」ではなく「自分がその対局の幹事または参加者か」で判定する。
- 個人の通算成績(`/me`, `/members/[userId]`)は元々ユーザー単位の集計だったため、グループの有無に関係なく成立する(`groupId`引数を削除しただけ)。
- 「グループ内順位」だった表示は「友達内順位」(自分 + 自分の友達、`getUsersStats([自分, ...友達])`)に置き換えた。

### 2.3 マイグレーションへの影響(要注意)

`prisma/migrations/20260819010000_remove_groups_add_friend_code/migration.sql` で `Group` / `GroupMember` テーブルを削除し、`Session.groupId` 列を削除する。**`Session`・`SessionEntry`・`Rebuy`・`RebuyShare`・`Settlement`(=対局の収支データそのもの)は削除されない**が、破壊的な変更であることに変わりはないため、本番DBに real data がある場合は適用前にバックアップを取ること。

## 3. 友達関係の設計

### 3.1 設計上の決定事項

| 論点 | 採用した仕様 | 理由 |
|---|---|---|
| 友達関係の方向性 | **一方向**。相手の承認は不要で、追加した側にだけ「友達」として現れる | このアプリに承認フローが存在せず、一貫性を優先。実装・UIともに最小限で済む |
| 友達を見つける方法 | **QRコード + 個人ID(friendCode)**。LINEのID/QR交換に近い、グループという共有の場がなくても誰とでも友達になれる仕組み(ユーザー確認済み) | グループ廃止に伴い、共有の名簿を経由した「グループメンバーから選ぶ」方式が使えなくなったため |
| 参加制限の対象 | 幹事(`createdById`)自身は制限を受けない。幹事以外の参加者は、全員「幹事の友達」である必要がある | ユーザー要望をそのまま反映 |
| 友達解除の影響 | 友達を解除しても過去の対局記録・収支には影響しない | 履歴データの整合性を優先 |

### 3.2 データモデル

```prisma
model User {
  ...
  friendCode String @unique // 8桁の個人ID。登録時に自動発行
}

model Friendship {
  id        String   @id @default(cuid())
  userId    String   // 追加した人
  friendId  String   // 追加された人
  createdAt DateTime @default(now())

  @@unique([userId, friendId])
}
```

- `friendCode` は登録時に `generateFriendCode()`(8文字、英大文字+数字、`0/O/1/I`を除く)で発行し、衝突時は再生成。
- `friendCode` はQRコードのURL(`{origin}/friends/add/{code}`)にもそのままエンコードされる。総当たりでの友達追加(=他人の全対局データの閲覧)を防ぐため、6桁ではなく8桁にして推測困難性を確保している。

## 4. API仕様

| メソッド・パス | 内容 |
|---|---|
| `POST /api/friends` | body: `{ friendCode }`。IDから対象ユーザーを検索して友達に追加。自分自身・存在しないID・既存の友達はエラー |
| `DELETE /api/friends/[friendId]` | 友達を解除(実際のuserIdで指定)。冪等 |

`POST /api/sessions` のバリデーション:

- 参加者(`entries[].userId`)のうち幹事本人を除く全員が、幹事の友達(`Friendship.userId = 幹事`)であることを確認。含まれない場合は400エラー。

## 5. 画面仕様

### 5.1 友達ページ `/friends`

- 自分のQRコード(`qrcode`パッケージでサーバー側生成)と8桁のID(コピー可能)を表示。
- 「IDで友達を追加」フォーム(相手のIDを直接入力)。
- 友達一覧: 通算収支・勝率・平均収支・参加数、収支順/勝率順ソート、名前から `/members/[userId]` へ遷移。旧`/ranking`の役割を兼ねる。

### 5.2 QR経由の追加ページ `/friends/add/[code]`(新規、`(app)`グループ外)

- QRコードを他アプリのカメラで読み取ると開くディープリンクURL。あえて `(app)` の認証必須レイアウトの外に置き、未ログイン時は「ログイン/新規登録してください(コールバック先を保持)」という案内を出せるようにしている。
- ログイン済みなら対象ユーザー名を表示し、確認ボタンで追加。既に友達、自分自身、コードが存在しない場合はそれぞれ専用メッセージ。
- ログイン/登録フォームは `?callbackUrl=` を尊重し、追加後にこのページへ戻ってこられる(オープンリダイレクト対策として`/`始まりのパスのみ許可)。

### 5.3 対局記録ページ `/sessions/new`

- 参加者ピッカーは「自分自身 + 自分の友達」のみ(`getFriendIds`)。グループという概念が無くなったため、以前あった「グループメンバーであること」の追加チェックは不要になった。
- 友達が0人の場合、「友達を追加する」への案内リンクを表示。

## 6. 実装対象ファイル一覧(v2差分)

| ファイル | 変更種別 |
|---|---|
| `prisma/schema.prisma` | 変更(`Group`/`GroupMember`削除、`User.friendCode`追加) |
| `prisma/migrations/20260819010000_remove_groups_add_friend_code/migration.sql` | 新規 |
| `src/lib/auth-helpers.ts` | 変更(`requireUserWithGroup`削除、`generateFriendCode`追加) |
| `src/lib/stats.ts` | 変更(`getGroupStats`→`getUsersStats`、全関数から`groupId`引数を削除) |
| `src/lib/qrcode.ts` | 新規(QR生成、絶対URL組み立て) |
| `src/app/api/friends/route.ts` | 変更(`friendCode`ベースに変更、グループ制約を撤廃) |
| `src/app/(app)/friends/page.tsx` / `FriendsPanel.tsx` / `FriendsList.tsx` | 変更・新規(QR/ID表示、友達一覧) |
| `src/app/friends/add/[code]/page.tsx` / `AddFriendButton.tsx` | 新規 |
| `src/app/api/auth/register/route.ts` | 変更(`friendCode`発行) |
| `src/app/(auth)/login/LoginForm.tsx` / `register/RegisterForm.tsx` | 変更(`callbackUrl`対応、登録後の遷移先を`/`に変更) |
| `src/app/(app)/layout.tsx`, `page.tsx`, `sessions/*`, `me/page.tsx`, `members/[userId]/page.tsx` | 変更(`groupId`依存を除去) |
| `src/app/group/`, `src/app/api/group/`, `src/app/(app)/ranking/`, `src/app/(app)/settings/` | 削除 |

## 7. 受け入れ基準

- [ ] `/friends` で自分のQR/IDを確認でき、IDを直接入力して友達を追加できる。
- [ ] QRコードを別デバイスで読み取ると `/friends/add/[code]` が開き、ログイン後に友達追加できる。
- [ ] 友達一覧に通算収支・勝率・平均収支・参加数が表示され、名前から個人の詳細ページに遷移できる。
- [ ] 自分が友達に追加していない相手は、自分が幹事の対局記録画面の参加者候補に出てこない。
- [ ] 友達登録していない相手のIDをAPIに直接送っても、400エラーで拒否される。
- [ ] 自分自身やコードの一致しない相手は友達に追加できない。
- [ ] グループ関連の画面・APIにアクセスすると404になる(すべて削除済み)。
