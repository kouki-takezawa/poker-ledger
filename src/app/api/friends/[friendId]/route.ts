import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function DELETE(request: Request, { params }: { params: Promise<{ friendId: string }> }) {
  const { friendId } = await params;
  const user = await requireUser();

  await prisma.friendship.deleteMany({ where: { userId: user.id, friendId } });

  return NextResponse.json({ ok: true });
}
