"use client";

import { useRef, useState } from "react";
import { apiRequest } from "@/lib/api-client";

const RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const SUITS: { code: string; symbol: string; red: boolean }[] = [
  { code: "s", symbol: "♠", red: false },
  { code: "h", symbol: "♥", red: true },
  { code: "d", symbol: "♦", red: true },
  { code: "c", symbol: "♣", red: false },
];

type Group = "hero" | "villain" | "board";
type Hand = (string | null)[];

type EquityResponse = { win: number; tie: number; lose: number; exact: boolean; trials: number };

function CardChip({
  code,
  onClick,
  placeholder,
}: {
  code: string | null;
  onClick?: () => void;
  placeholder?: string;
}) {
  if (!code) {
    return (
      <button type="button" className="poker-card placeholder" disabled>
        {placeholder ?? ""}
      </button>
    );
  }
  const rank = code[0];
  const suit = SUITS.find((s) => s.code === code[1])!;
  return (
    <button type="button" className={`poker-card${suit.red ? " red" : ""}`} onClick={onClick}>
      {rank}
      {suit.symbol}
    </button>
  );
}

export function EquityCalculator() {
  const [hero, setHero] = useState<Hand>([null, null]);
  const [villain, setVillain] = useState<Hand>([null, null]);
  const [board, setBoard] = useState<Hand>([null, null, null, null, null]);
  const [result, setResult] = useState<EquityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reqId = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const usedCards = new Set([...hero, ...villain, ...board].filter((c): c is string => c !== null));
  const heroReady = hero.every((c) => c !== null);
  const villainReady = villain.every((c) => c !== null);

  // Triggered explicitly after every hand/board change (not from an effect):
  // debounces briefly, then asks the server for the win/tie/lose split.
  function scheduleCalc(nextHero: Hand, nextVillain: Hand, nextBoard: Hand) {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    const ready = nextHero.every((c) => c !== null) && nextVillain.every((c) => c !== null);
    if (!ready) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const myId = ++reqId.current;
    debounceTimer.current = setTimeout(async () => {
      const res = await apiRequest<EquityResponse>("/api/equity", {
        body: { hero: nextHero, villain: nextVillain, board: nextBoard.filter((c): c is string => c !== null) },
      });
      if (reqId.current !== myId) return;
      setLoading(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult(res.data);
    }, 200);
  }

  function nextEmptySlot(h: Hand, v: Hand, b: Hand): { group: Group; index: number } | null {
    const hi = h.findIndex((c) => c === null);
    if (hi !== -1) return { group: "hero", index: hi };
    const vi = v.findIndex((c) => c === null);
    if (vi !== -1) return { group: "villain", index: vi };
    const bi = b.findIndex((c) => c === null);
    if (bi !== -1) return { group: "board", index: bi };
    return null;
  }

  function applyChange(group: Group, index: number, value: string | null) {
    const nextHero = group === "hero" ? hero.map((c, i) => (i === index ? value : c)) : hero;
    const nextVillain = group === "villain" ? villain.map((c, i) => (i === index ? value : c)) : villain;
    const nextBoard = group === "board" ? board.map((c, i) => (i === index ? value : c)) : board;
    setHero(nextHero);
    setVillain(nextVillain);
    setBoard(nextBoard);
    scheduleCalc(nextHero, nextVillain, nextBoard);
  }

  function pickCard(code: string) {
    if (usedCards.has(code)) return;
    const slot = nextEmptySlot(hero, villain, board);
    if (!slot) return;
    applyChange(slot.group, slot.index, code);
  }

  function resetAll() {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    reqId.current++;
    setHero([null, null]);
    setVillain([null, null]);
    setBoard([null, null, null, null, null]);
    setResult(null);
    setError(null);
    setLoading(false);
  }

  return (
    <div>
      <div className="block-title" style={{ marginBottom: 8 }}>
        自分の手札
      </div>
      <div className="card-slots">
        {hero.map((code, i) => (
          <CardChip key={i} code={code} placeholder="?" onClick={() => applyChange("hero", i, null)} />
        ))}
      </div>

      <div className="block-title" style={{ margin: "16px 0 8px" }}>
        相手の手札
      </div>
      <div className="card-slots">
        {villain.map((code, i) => (
          <CardChip key={i} code={code} placeholder="?" onClick={() => applyChange("villain", i, null)} />
        ))}
      </div>

      <div className="block-title" style={{ margin: "16px 0 8px" }}>
        場のカード(0〜5枚、任意)
      </div>
      <div className="card-slots" style={{ marginBottom: 16 }}>
        {board.map((code, i) => (
          <CardChip key={i} code={code} placeholder="—" onClick={() => applyChange("board", i, null)} />
        ))}
      </div>

      <button type="button" className="ghost" onClick={resetAll} style={{ marginBottom: 16 }}>
        すべてクリア
      </button>

      {!heroReady || !villainReady ? (
        <div className="empty-state" style={{ marginBottom: 20 }}>
          自分と相手の手札(各2枚)を選ぶと勝率が表示されます。
        </div>
      ) : (
        <div className="stat-grid" style={{ marginBottom: 20, gridTemplateColumns: "1fr 1fr 1fr" }}>
          <div className="stat-tile">
            <div className="k">自分の勝率</div>
            <div className={`v ${result && result.win >= result.lose ? "amt-gain" : ""}`}>
              {loading || !result ? "…" : `${result.win.toFixed(1)}%`}
            </div>
          </div>
          <div className="stat-tile">
            <div className="k">引き分け</div>
            <div className="v">{loading || !result ? "…" : `${result.tie.toFixed(1)}%`}</div>
          </div>
          <div className="stat-tile">
            <div className="k">相手の勝率</div>
            <div className={`v ${result && result.lose > result.win ? "amt-loss" : ""}`}>
              {loading || !result ? "…" : `${result.lose.toFixed(1)}%`}
            </div>
          </div>
        </div>
      )}
      {heroReady && villainReady && error && <div className="form-error">{error}</div>}
      {heroReady && villainReady && result && (
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: -12, marginBottom: 20 }}>
          {result.exact
            ? `正確な確率(残り${result.trials.toLocaleString("ja-JP")}通りをすべて計算)`
            : `推定値(${result.trials.toLocaleString("ja-JP")}回のシミュレーション)`}
        </p>
      )}

      <div className="block-title" style={{ marginBottom: 8 }}>
        カードを選ぶ
      </div>
      <div className="poker-card-grid">
        {SUITS.map((suit) =>
          RANKS.map((rank) => {
            const code = rank + suit.code;
            const used = usedCards.has(code);
            return (
              <button
                key={code}
                type="button"
                className={`poker-card${suit.red ? " red" : ""}${used ? " used" : ""}`}
                disabled={used}
                onClick={() => pickCard(code)}
              >
                {rank}
                {suit.symbol}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
