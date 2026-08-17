export type EntryInput = {
  userId: string;
  initialStake: number;
  cashOut: number | null;
};

export type RebuyShareInput = {
  sellerId: string;
  amount: number;
};

export type RebuyInput = {
  buyerId: string;
  shares: RebuyShareInput[];
};

export function boughtBy(rebuys: RebuyInput[], userId: string): number {
  return rebuys
    .filter((r) => r.buyerId === userId)
    .reduce((sum, r) => sum + r.shares.reduce((s, sh) => s + sh.amount, 0), 0);
}

export function soldBy(rebuys: RebuyInput[], userId: string): number {
  return rebuys.reduce(
    (sum, r) =>
      sum + r.shares.filter((sh) => sh.sellerId === userId).reduce((s, sh) => s + sh.amount, 0),
    0
  );
}

// Net buy-in after rebuys: initial stake + bought as buyer - sold as seller.
// See spec section 5.1. Rebuys move cash between players, so this figure
// stays conserved in aggregate: what one buyer pays, sellers receive in total.
export function totalBuyIn(entry: EntryInput, rebuys: RebuyInput[]): number {
  return entry.initialStake + boughtBy(rebuys, entry.userId) - soldBy(rebuys, entry.userId);
}

export function profitOf(entry: EntryInput, rebuys: RebuyInput[]): number | null {
  if (entry.cashOut === null || entry.cashOut === undefined) return null;
  return entry.cashOut - totalBuyIn(entry, rebuys);
}

// Live "in-progress" position from rebuys alone, before cash-out is known.
export function interimRebuyNet(rebuys: RebuyInput[], userId: string): number {
  return soldBy(rebuys, userId) - boughtBy(rebuys, userId);
}

export type ZeroSumCheck =
  | { status: "incomplete"; missingUserIds: string[] }
  | { status: "mismatch"; sum: number }
  | { status: "ready"; sum: 0 };

export function checkZeroSum(entries: EntryInput[], rebuys: RebuyInput[]): ZeroSumCheck {
  const missing = entries.filter((e) => e.cashOut === null || e.cashOut === undefined);
  if (missing.length > 0) {
    return { status: "incomplete", missingUserIds: missing.map((e) => e.userId) };
  }
  const sum = entries.reduce((s, e) => s + (profitOf(e, rebuys) ?? 0), 0);
  if (sum !== 0) return { status: "mismatch", sum };
  return { status: "ready", sum: 0 };
}

export type SettlementLine = {
  fromUserId: string;
  toUserId: string;
  amount: number;
};

// Greedy min-transaction settlement: match the largest debtor against the
// largest creditor repeatedly. See spec section 5.3.
export function computeSettlements(
  profits: { userId: string; amount: number }[]
): SettlementLine[] {
  const creditors = profits
    .filter((p) => p.amount > 0)
    .map((p) => ({ userId: p.userId, amount: p.amount }))
    .sort((a, b) => b.amount - a.amount);
  const debtors = profits
    .filter((p) => p.amount < 0)
    .map((p) => ({ userId: p.userId, amount: -p.amount }))
    .sort((a, b) => b.amount - a.amount);

  const result: SettlementLine[] = [];
  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i].amount, creditors[j].amount);
    result.push({ fromUserId: debtors[i].userId, toUserId: creditors[j].userId, amount: pay });
    debtors[i].amount -= pay;
    creditors[j].amount -= pay;
    if (debtors[i].amount === 0) i++;
    if (creditors[j].amount === 0) j++;
  }
  return result;
}
