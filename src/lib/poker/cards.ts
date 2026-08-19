export type Card = { rank: number; suit: number }; // rank: 2-14 (14=Ace), suit: 0-3

const RANK_CHARS = "23456789TJQKA";
const SUIT_CHARS = "shdc"; // spades, hearts, diamonds, clubs

export const CARD_CODE_RE = /^[2-9TJQKA][shdc]$/;

export function parseCard(code: string): Card {
  const rank = RANK_CHARS.indexOf(code[0]) + 2;
  const suit = SUIT_CHARS.indexOf(code[1]);
  return { rank, suit };
}

export function cardCode(c: Card): string {
  return RANK_CHARS[c.rank - 2] + SUIT_CHARS[c.suit];
}

export function cardKey(c: Card): number {
  return c.rank * 4 + c.suit;
}

export function fullDeck(): Card[] {
  const deck: Card[] = [];
  for (let suit = 0; suit < 4; suit++) {
    for (let rank = 2; rank <= 14; rank++) deck.push({ rank, suit });
  }
  return deck;
}
