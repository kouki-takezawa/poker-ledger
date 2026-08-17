import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  inviteCode: z.string().trim().min(1, "招待コードを入力してください"),
});

export async function POST(request: Request) {
  const user = await requireUser();

  const existing = await prisma.groupMember.findUnique({ where: { userId: user.id } });
  if (existing) {
    return NextResponse.json({ error: "既に別のグループに所属しています。" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const group = await prisma.group.findUnique({
    where: { inviteCode: parsed.data.inviteCode.trim().toUpperCase() },
    include: { _count: { select: { members: true } } },
  });
  if (!group) {
    return NextResponse.json({ error: "招待コードが見つかりません。" }, { status: 404 });
  }
  if (group._count.members >= 10) {
    return NextResponse.json(
      { error: "このグループは既に定員(10人)に達しています。" },
      { status: 400 }
    );
  }

  await prisma.groupMember.create({
    data: { groupId: group.id, userId: user.id, role: "member" },
  });

  return NextResponse.json({ groupId: group.id });
}
