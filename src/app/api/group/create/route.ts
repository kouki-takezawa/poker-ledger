import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser, generateInviteCode } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  name: z.string().trim().min(1, "グループ名を入力してください").max(40),
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

  let inviteCode = generateInviteCode();
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.group.findUnique({ where: { inviteCode } });
    if (!clash) break;
    inviteCode = generateInviteCode();
  }

  const group = await prisma.group.create({
    data: {
      name: parsed.data.name,
      inviteCode,
      createdById: user.id,
      members: { create: { userId: user.id, role: "admin" } },
    },
  });

  return NextResponse.json({ groupId: group.id });
}
