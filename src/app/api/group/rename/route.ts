import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  name: z.string().trim().min(1, "グループ名を入力してください").max(40),
});

export async function POST(request: Request) {
  const user = await requireUser();

  const membership = await prisma.groupMember.findUnique({ where: { userId: user.id } });
  if (!membership || membership.role !== "admin") {
    return NextResponse.json({ error: "グループ管理者のみ操作できます。" }, { status: 403 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  await prisma.group.update({ where: { id: membership.groupId }, data: { name: parsed.data.name } });

  return NextResponse.json({ ok: true });
}
