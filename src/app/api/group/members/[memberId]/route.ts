import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ memberId: string }> }) {
  const { memberId } = await params;
  const user = await requireUser();

  const membership = await prisma.groupMember.findUnique({ where: { userId: user.id } });
  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "グループ管理者のみ操作できます。" }, { status: 403 });
  }

  const target = await prisma.groupMember.findUnique({ where: { id: memberId } });
  if (!target || target.groupId !== membership.groupId) {
    return NextResponse.json({ error: "対象のメンバーが見つかりません。" }, { status: 404 });
  }
  if (target.userId === user.id) {
    return NextResponse.json({ error: "自分自身は削除できません。「グループを退会」を利用してください。" }, { status: 400 });
  }

  await prisma.groupMember.delete({ where: { id: memberId } });

  return NextResponse.json({ ok: true });
}
