import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { checkZeroSum, computeSettlements, profitOf, type RebuyInput } from "@/lib/ledger";
import { sessionBodySchema, validateSessionEntries, computeStartEnd, canEditSession } from "@/lib/sessions";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ error: "対局が見つかりません。" }, { status: 404 });
  }
  if (!canEditSession(session, user.id)) {
    return NextResponse.json(
      { error: "この対局は編集できません(幹事のみ、確定から7日以内が対象です)。" },
      { status: 403 }
    );
  }

  const parsed = sessionBodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { sessionDate, location, startTime, endTime, entries, rebuys } = parsed.data;

  const entryError = await validateSessionEntries(user.id, entries, rebuys);
  if (entryError) {
    return NextResponse.json({ error: entryError }, { status: 400 });
  }

  const rebuyInputs: RebuyInput[] = rebuys.map((r) => ({ buyerId: r.buyerId, shares: r.shares }));
  const zeroSum = checkZeroSum(
    entries.map((e) => ({ userId: e.userId, initialStake: e.initialStake, cashOut: e.cashOut })),
    rebuyInputs
  );
  if (zeroSum.status !== "ready") {
    return NextResponse.json(
      { error: "収支の合計が0円になっていません。持ち金額かリバイの記録を確認してください。" },
      { status: 400 }
    );
  }

  const profitByUser = new Map<string, number>();
  for (const e of entries) {
    profitByUser.set(
      e.userId,
      profitOf({ userId: e.userId, initialStake: e.initialStake, cashOut: e.cashOut }, rebuyInputs) ?? 0
    );
  }
  const settlementLines = computeSettlements(
    [...profitByUser.entries()].map(([userId, amount]) => ({ userId, amount }))
  );

  const { startedAt, endedAt } = computeStartEnd(sessionDate, startTime, endTime);

  await prisma.$transaction(async (tx) => {
    await tx.settlement.deleteMany({ where: { sessionId: id } });
    await tx.rebuy.deleteMany({ where: { sessionId: id } });
    await tx.sessionEntry.deleteMany({ where: { sessionId: id } });

    await tx.session.update({
      where: { id },
      data: {
        sessionDate: new Date(sessionDate),
        location: location || null,
        startedAt,
        endedAt,
        entries: {
          create: entries.map((e) => ({
            userId: e.userId,
            initialStake: e.initialStake,
            cashOut: e.cashOut,
          })),
        },
      },
    });

    for (const r of rebuys) {
      await tx.rebuy.create({
        data: {
          sessionId: id,
          buyerId: r.buyerId,
          shares: { create: r.shares.map((s) => ({ sellerId: s.sellerId, amount: s.amount })) },
        },
      });
    }

    if (settlementLines.length > 0) {
      await tx.settlement.createMany({
        data: settlementLines.map((s) => ({
          sessionId: id,
          fromUserId: s.fromUserId,
          toUserId: s.toUserId,
          amount: s.amount,
        })),
      });
    }
  });

  return NextResponse.json({ ok: true, sessionId: id });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();

  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) {
    return NextResponse.json({ ok: true }); // already gone
  }
  if (!canEditSession(session, user.id)) {
    return NextResponse.json(
      { error: "この対局は削除できません(幹事のみ、確定から7日以内が対象です)。" },
      { status: 403 }
    );
  }

  await prisma.session.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
