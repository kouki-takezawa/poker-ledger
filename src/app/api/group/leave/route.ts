import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const user = await requireUser();

  const membership = await prisma.groupMember.findUnique({ where: { userId: user.id } });
  if (!membership) {
    return NextResponse.json({ error: "グループに所属していません。" }, { status: 400 });
  }

  await prisma.groupMember.delete({ where: { userId: user.id } });

  return NextResponse.json({ ok: true });
}
