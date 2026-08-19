import type { Card } from "./cards";
import { fullDeck, cardKey } from "./cards";
import { evaluate7 } from "./handEvaluator";

export type EquityResult = {
  win: number; // hero win %
  tie: number;
  lose: number; // villain win %
  exact: boolean;
  trials: number;
};

const MONTE_CARLO_SAMPLES = 50000;

function* combinations<T>(arr: T[], k: number): Generator<T[]> {
  const n = arr.length;
  if (k > n || k < 0) return;
  const idx = Array.from({ length: k }, (_, i) => i);
  while (true) {
    yield idx.map((i) => arr[i]);
    let i = k - 1;
    while (i >= 0 && idx[i] === n - k + i) i--;
    if (i < 0) return;
    idx[i]++;
    for (let j = i + 1; j < k; j++) idx[j] = idx[j - 1] + 1;
  }
}

// -1 = villain wins, 0 = tie, 1 = hero wins
function compare(hero: [Card, Card], villain: [Card, Card], board5: Card[]): -1 | 0 | 1 {
  const h = evaluate7([...hero, ...board5]);
  const v = evaluate7([...villain, ...board5]);
  if (h > v) return 1;
  if (h < v) return -1;
  return 0;
}

export function calculateEquity(hero: [Card, Card], villain: [Card, Card], board: Card[]): EquityResult {
  const usedKeys = new Set([...hero, ...villain, ...board].map(cardKey));
  const remainingDeck = fullDeck().filter((c) => !usedKeys.has(cardKey(c)));
  const need = 5 - board.length;

  let win = 0;
  let tie = 0;
  let lose = 0;
  let trials = 0;

  if (need === 0) {
    trials = 1;
    const r = compare(hero, villain, board);
    if (r === 1) win = 1;
    else if (r === -1) lose = 1;
    else tie = 1;
  } else if (board.length > 0) {
    // Known board cards keep the remaining-deck size small enough (<= C(47,4))
    // to enumerate exactly rather than estimate.
    for (const combo of combinations(remainingDeck, need)) {
      const r = compare(hero, villain, [...board, ...combo]);
      trials++;
      if (r === 1) win++;
      else if (r === -1) lose++;
      else tie++;
    }
  } else {
    // Preflop: C(48,5) ≈ 1.7M boards is too slow to enumerate on every
    // request, so estimate with Monte Carlo sampling instead.
    const deck = [...remainingDeck];
    for (let t = 0; t < MONTE_CARLO_SAMPLES; t++) {
      for (let i = 0; i < need; i++) {
        const j = i + Math.floor(Math.random() * (deck.length - i));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      const r = compare(hero, villain, deck.slice(0, need));
      trials++;
      if (r === 1) win++;
      else if (r === -1) lose++;
      else tie++;
    }
  }

  return {
    win: (win / trials) * 100,
    tie: (tie / trials) * 100,
    lose: (lose / trials) * 100,
    exact: board.length > 0,
    trials,
  };
}
