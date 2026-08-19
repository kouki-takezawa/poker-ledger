import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const settlement = await prisma.settlement.findUnique({ where: { id } });
  if (!settlement) {
    return NextResponse.json({ error: "精算が見つかりません。" }, { status: 404 });
  }
  if (settlement.fromUserId !== user.id && settlement.toUserId !== user.id) {
    return NextResponse.json({ error: "この精算の当事者のみ操作できます。" }, { status: 403 });
  }

  const updated = await prisma.settlement.update({
    where: { id },
    data: { settled: !settlement.settled },
  });

  return NextResponse.json({ ok: true, settled: updated.settled });
}
