import { NextResponse } from "next/server";
import { requireUser, generateInviteCode } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await requireUser();

  const membership = await prisma.groupMember.findUnique({ where: { userId: user.id } });
  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "グループ管理者のみ操作できます。" }, { status: 403 });
  }

  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.group.findUnique({ where: { inviteCode } });
    if (!clash) break;
    inviteCode = generateInviteCode();
  }

  await prisma.group.update({ where: { id: membership.groupId }, data: { inviteCode } });

  return NextResponse.json({ inviteCode });
}
