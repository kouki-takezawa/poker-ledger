import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { checkZeroSum, computeSettlements, profitOf, type RebuyInput } from "@/lib/ledger";
import { getGroupStats } from "@/lib/stats";

const bodySchema = z.object({
  sessionDate: z.string().min(1),
  location: z.string().trim().max(60).optional(),
  entries: z
    .array(
      z.object({
        userId: z.string().min(1),
        initialStake: z.number().int().min(0),
        cashOut: z.number().int().min(0),
      })
    )
    .min(1, "参加者を選んでください"),
  rebuys: z.array(
    z.object({
      buyerId: z.string().min(1),
      shares: z
        .array(z.object({ sellerId: z.string().min(1), amount: z.number().int().positive() }))
        .min(1),
    })
  ),
});

export async function POST(request: Request) {
  const user = await requireUser();

  const membership = await prisma.groupMember.findUnique({ where: { userId: user.id } });
  if (!membership) {
    return NextResponse.json({ error: "グループに参加してください。" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }
  const { sessionDate, location, entries, rebuys } = parsed.data;

  const groupId = membership.groupId;
  const participantIds = new Set(entries.map((e) => e.userId));

  const groupMembers = await prisma.groupMember.findMany({
    where: { groupId, userId: { in: [...participantIds] } },
  });
  if (groupMembers.length !== participantIds.size) {
    return NextResponse.json(
      { error: "参加者にこのグループのメンバーではない人が含まれています。" },
      { status: 400 }
    );
  }

  for (const r of rebuys) {
    if (!participantIds.has(r.buyerId)) {
      return NextResponse.json({ error: "リバイの買い手が参加者に含まれていません。" }, { status: 400 });
    }
    for (const s of r.shares) {
      if (!participantIds.has(s.sellerId)) {
        return NextResponse.json({ error: "リバイの売り手が参加者に含まれていません。" }, { status: 400 });
      }
      if (s.sellerId === r.buyerId) {
        return NextResponse.json({ error: "買い手と売り手が同じ人になっています。" }, { status: 400 });
      }
    }
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

  const beforeStats = await getGroupStats(groupId);

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

  const session = await prisma.$transaction(async (tx) => {
    const created = await tx.session.create({
      data: {
        groupId,
        sessionDate: new Date(sessionDate),
        location: location || null,
        status: "confirmed",
        createdById: user.id,
        confirmedAt: new Date(),
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
          sessionId: created.id,
          buyerId: r.buyerId,
          shares: { create: r.shares.map((s) => ({ sellerId: s.sellerId, amount: s.amount })) },
        },
      });
    }

    if (settlementLines.length > 0) {
      await tx.settlement.createMany({
        data: settlementLines.map((s) => ({
          sessionId: created.id,
          fromUserId: s.fromUserId,
          toUserId: s.toUserId,
          amount: s.amount,
        })),
      });
    }

    return created;
  });

  const users = await prisma.user.findMany({ where: { id: { in: [...participantIds] } } });
  const nameOf = (id: string) => users.find((u) => u.id === id)?.displayName ?? "?";

  const statUpdates = entries.map((e) => {
    const before = beforeStats.get(e.userId) ?? {
      participations: 0,
      totalProfit: 0,
      wins: 0,
      avgProfit: 0,
      winRatePct: 0,
    };
    const profit = profitByUser.get(e.userId) ?? 0;
    const afterParticipations = before.participations + 1;
    const afterProfit = before.totalProfit + profit;
    const afterWins = before.wins + (profit > 0 ? 1 : 0);
    return {
      userId: e.userId,
      name: nameOf(e.userId),
      profit,
      before,
      after: {
        participations: afterParticipations,
        totalProfit: afterProfit,
        wins: afterWins,
        avgProfit: Math.round(afterProfit / afterParticipations),
        winRatePct: (afterWins / afterParticipations) * 100,
      },
    };
  });

  return NextResponse.json({
    sessionId: session.id,
    settlements: settlementLines.map((s) => ({
      fromName: nameOf(s.fromUserId),
      toName: nameOf(s.toUserId),
      amount: s.amount,
    })),
    statUpdates,
  });
}
