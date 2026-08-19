import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AddFriendButton } from "./AddFriendButton";

export default async function AddFriendPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const friendCode = decodeURIComponent(code).toUpperCase();
  const session = await auth();

  const callbackUrl = `/friends/add/${friendCode}`;

  if (!session?.user?.id) {
    return (
      <div className="centered-shell">
        <div className="card" style={{ width: "100%", maxWidth: 380 }}>
          <div className="block">
            <h1 className="page-title" style={{ marginTop: 0 }}>
              友達を追加
            </h1>
            <p className="page-subtitle">友達に追加するには、ログイン(または新規登録)してください。</p>
            <div style={{ display: "flex", gap: 8 }}>
              <Link href={`/login?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="primary" style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>
                ログイン
              </Link>
              <Link href={`/register?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="ghost" style={{ flex: 1, textAlign: "center", textDecoration: "none" }}>
                新規登録
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const target = await prisma.user.findUnique({ where: { friendCode } });

  let body: React.ReactNode;
  if (!target) {
    body = <p className="page-subtitle">そのIDのユーザーが見つかりませんでした。QRコードやIDを確認してください。</p>;
  } else if (target.id === session.user.id) {
    body = <p className="page-subtitle">これはあなた自身のQRコードです。相手に読み取ってもらってください。</p>;
  } else {
    const existing = await prisma.friendship.findUnique({
      where: { userId_friendId: { userId: session.user.id, friendId: target.id } },
    });
    if (existing) {
      body = (
        <div>
          <p className="page-subtitle">{target.displayName}さんはすでに友達です。</p>
          <Link href={`/members/${target.id}`} className="primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
            プロフィールを見る
          </Link>
        </div>
      );
    } else {
      body = (
        <div>
          <p className="page-subtitle">{target.displayName}さんを友達に追加しますか?</p>
          <AddFriendButton friendCode={friendCode} name={target.displayName} />
        </div>
      );
    }
  }

  return (
    <div className="centered-shell">
      <div className="card" style={{ width: "100%", maxWidth: 380 }}>
        <div className="block">
          <h1 className="page-title" style={{ marginTop: 0 }}>
            友達を追加
          </h1>
          {body}
        </div>
      </div>
    </div>
  );
}
