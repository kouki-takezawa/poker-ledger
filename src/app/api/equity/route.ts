import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { CARD_CODE_RE, parseCard } from "@/lib/poker/cards";
import { calculateEquity } from "@/lib/poker/equity";

const cardCode = z.string().regex(CARD_CODE_RE);

const bodySchema = z.object({
  hero: z.array(cardCode).length(2),
  villain: z.array(cardCode).length(2),
  board: z.array(cardCode).max(5),
});

export async function POST(request: Request) {
  await requireUser();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "カードの選択が不正です。" }, { status: 400 });
  }
  const { hero, villain, board } = parsed.data;

  const all = [...hero, ...villain, ...board];
  if (new Set(all).size !== all.length) {
    return NextResponse.json({ error: "同じカードが複数回選択されています。" }, { status: 400 });
  }

  const result = calculateEquity(
    [parseCard(hero[0]), parseCard(hero[1])],
    [parseCard(villain[0]), parseCard(villain[1])],
    board.map(parseCard)
  );

  return NextResponse.json(result);
}
