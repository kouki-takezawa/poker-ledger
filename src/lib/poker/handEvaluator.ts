import type { Card } from "./cards";

// Hand categories, low to high.
export const HIGH_CARD = 0;
export const PAIR = 1;
export const TWO_PAIR = 2;
export const TRIPS = 3;
export const STRAIGHT = 4;
export const FLUSH = 5;
export const FULL_HOUSE = 6;
export const QUADS = 7;
export const STRAIGHT_FLUSH = 8;

export const CATEGORY_NAMES = [
  "ハイカード",
  "ワンペア",
  "ツーペア",
  "スリーカード",
  "ストレート",
  "フラッシュ",
  "フルハウス",
  "フォーカード",
  "ストレートフラッシュ",
];

function score(category: number, ranks: number[]): number {
  let tiebreak = 0;
  for (let i = 0; i < 5; i++) tiebreak = tiebreak * 16 + (ranks[i] ?? 0);
  return category * Math.pow(16, 5) + tiebreak;
}

// ranksDesc: sorted descending, unique ranks. Returns the straight's high
// card (5 for the wheel A-2-3-4-5), or null if there's no straight.
function straightHighFrom(ranksDesc: number[]): number | null {
  const withAceLow = ranksDesc.includes(14) ? [...ranksDesc, 1] : ranksDesc;
  for (let i = 0; i <= withAceLow.length - 5; i++) {
    if (withAceLow[i] - withAceLow[i + 4] === 4) return withAceLow[i];
  }
  return null;
}

// Evaluates the best 5-card hand out of exactly 7 cards. Returns a score
// where a strictly higher number always means a strictly better hand.
export function evaluate7(cards: Card[]): number {
  const rankCount = new Array(15).fill(0);
  const suitCount = [0, 0, 0, 0];
  const suitRanks: number[][] = [[], [], [], []];
  for (const c of cards) {
    rankCount[c.rank]++;
    suitCount[c.suit]++;
    suitRanks[c.suit].push(c.rank);
  }

  const flushSuit = suitCount.findIndex((n) => n >= 5);
  const uniqueRanksDesc: number[] = [];
  for (let r = 14; r >= 2; r--) if (rankCount[r] > 0) uniqueRanksDesc.push(r);

  if (flushSuit !== -1) {
    const flushRanksDesc = [...suitRanks[flushSuit]].sort((a, b) => b - a);
    const sfHigh = straightHighFrom(flushRanksDesc);
    if (sfHigh !== null) return score(STRAIGHT_FLUSH, [sfHigh]);
  }

  const byCount: [number, number][] = uniqueRanksDesc.map((r) => [r, rankCount[r]]);
  byCount.sort((a, b) => b[1] - a[1] || b[0] - a[0]);

  if (byCount[0][1] === 4) {
    const quad = byCount[0][0];
    const kicker = byCount.find(([r]) => r !== quad)![0];
    return score(QUADS, [quad, kicker]);
  }

  if (byCount[0][1] === 3) {
    const trips = byCount[0][0];
    const pairEntry = byCount.find(([r, c]) => r !== trips && c >= 2);
    if (pairEntry) return score(FULL_HOUSE, [trips, pairEntry[0]]);
  }

  if (flushSuit !== -1) {
    const top5 = [...suitRanks[flushSuit]].sort((a, b) => b - a).slice(0, 5);
    return score(FLUSH, top5);
  }

  const straightHigh = straightHighFrom(uniqueRanksDesc);
  if (straightHigh !== null) return score(STRAIGHT, [straightHigh]);

  if (byCount[0][1] === 3) {
    const trips = byCount[0][0];
    const kickers = byCount.filter(([r]) => r !== trips).map(([r]) => r).slice(0, 2);
    return score(TRIPS, [trips, ...kickers]);
  }

  const pairs = byCount.filter(([, c]) => c === 2).map(([r]) => r);
  if (pairs.length >= 2) {
    const topTwo = pairs.slice(0, 2);
    const kicker = uniqueRanksDesc.find((r) => !topTwo.includes(r)) ?? 0;
    return score(TWO_PAIR, [...topTwo, kicker]);
  }
  if (pairs.length === 1) {
    const pairRank = pairs[0];
    const kickers = uniqueRanksDesc.filter((r) => r !== pairRank).slice(0, 3);
    return score(PAIR, [pairRank, ...kickers]);
  }

  return score(HIGH_CARD, uniqueRanksDesc.slice(0, 5));
}

export function categoryOf(scoreValue: number): number {
  return Math.floor(scoreValue / Math.pow(16, 5));
}
