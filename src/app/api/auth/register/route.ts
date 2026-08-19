import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateFriendCode } from "@/lib/auth-helpers";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().email("メールアドレスの形式が正しくありません"),
  password: z.string().min(8, "パスワードは8文字以上にしてください"),
  displayName: z.string().trim().min(1, "表示名を入力してください").max(20),
});

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { email, password, displayName } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "このメールアドレスは既に登録されています。" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  let friendCode = generateFriendCode();
  for (let i = 0; i < 5; i++) {
    const clash = await prisma.user.findUnique({ where: { friendCode } });
    if (!clash) break;
    friendCode = generateFriendCode();
  }

  await prisma.user.create({ data: { email, passwordHash, displayName, friendCode } });

  return NextResponse.json({ ok: true });
}
