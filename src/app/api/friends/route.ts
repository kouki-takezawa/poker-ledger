import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({ friendCode: z.string().trim().min(1) });

export async function POST(request: Request) {
  const user = await requireUser();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "リクエストが不正です。" }, { status: 400 });
  }
  const friendCode = parsed.data.friendCode.toUpperCase();

  const target = await prisma.user.findUnique({ where: { friendCode } });
  if (!target) {
    return NextResponse.json({ error: "そのIDのユーザーが見つかりません。" }, { status: 404 });
  }
  if (target.id === user.id) {
    return NextResponse.json({ error: "自分自身は友達に追加できません。" }, { status: 400 });
  }

  const existing = await prisma.friendship.findUnique({
    where: { userId_friendId: { userId: user.id, friendId: target.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "すでに友達に追加されています。" }, { status: 400 });
  }

  await prisma.friendship.create({ data: { userId: user.id, friendId: target.id } });

  return NextResponse.json({ ok: true, friendId: target.id, name: target.displayName });
}
