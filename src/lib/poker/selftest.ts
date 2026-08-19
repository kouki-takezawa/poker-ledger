import { parseCard, type Card } from "./cards";
import { evaluate7, categoryOf, HIGH_CARD, PAIR, TWO_PAIR, TRIPS, STRAIGHT, FLUSH, FULL_HOUSE, QUADS, STRAIGHT_FLUSH } from "./handEvaluator";
import { calculateEquity } from "./equity";

let failures = 0;
function check(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error("FAIL:", msg);
  } else {
    console.log("ok:", msg);
  }
}

function c(codes: string): Card[] {
  return codes.split(" ").map(parseCard);
}

// --- Category detection ---
check(categoryOf(evaluate7(c("As Ks Qs Js Ts 2h 3d"))) === STRAIGHT_FLUSH, "royal flush detected");
check(categoryOf(evaluate7(c("9s 8s 7s 6s 5s 2h 3d"))) === STRAIGHT_FLUSH, "9-high straight flush detected");
check(categoryOf(evaluate7(c("5s 4s 3s 2s As 9h Kd"))) === STRAIGHT_FLUSH, "wheel straight flush detected");
check(categoryOf(evaluate7(c("Ah Ad As Ac Kh 2c 3d"))) === QUADS, "quad aces detected");
check(categoryOf(evaluate7(c("Kh Kd Ks 2h 2d 3c 4s"))) === FULL_HOUSE, "full house (trips+pair) detected");
check(categoryOf(evaluate7(c("Kh Kd Ks 2h 2d 3c 3s"))) === FULL_HOUSE, "full house from two trips detected");
check(categoryOf(evaluate7(c("Ah 9h 7h 4h 2h Ks Qd"))) === FLUSH, "flush detected");
check(categoryOf(evaluate7(c("9h 8s 7d 6c 5h Ks Qd"))) === STRAIGHT, "straight detected");
check(categoryOf(evaluate7(c("5h 4s 3d 2c Ah Ks Qd"))) === STRAIGHT, "wheel straight detected");
check(categoryOf(evaluate7(c("Kh Kd Ks 9h 7c 4s 2d"))) === TRIPS, "trips detected");
check(categoryOf(evaluate7(c("Kh Kd 9h 9c 4s 2d 3h"))) === TWO_PAIR, "two pair detected");
check(categoryOf(evaluate7(c("Kh Kd 9h 7c 4s 2d 3h"))) === PAIR, "one pair detected");
check(categoryOf(evaluate7(c("Kh Qd 9h 7c 4s 2d 3h"))) === HIGH_CARD, "high card detected");

// --- Kicker / tie-break correctness ---
check(
  evaluate7(c("Ah Ad Kh Qh Jh 2c 3d")) > evaluate7(c("Ah Ad Kh Qh Th 2c 3d")),
  "pair of aces with K,Q,J kicker beats same with K,Q,T kicker"
);
check(
  evaluate7(c("Kh Kd 9h 9c Ah 2d 3s")) > evaluate7(c("Kh Kd 9h 9c Qh 2d 3s")),
  "two pair K/9 with A kicker beats two pair K/9 with Q kicker"
);
check(
  evaluate7(c("Kh Kd Qh Qc Jh Jd 2s")) === evaluate7(c("Kh Kd Qh Qc Jh Jd 2s")),
  "identical hands score equal (sanity)"
);
// three pair (K,Q,J) -> best two pair is K/Q with a J kicker
{
  const threePair = evaluate7(c("Kh Kd Qh Qc Jh Jd 2s"));
  const kqWithAceKicker = evaluate7(c("Kh Kd Qh Qc As 9d 2s"));
  check(kqWithAceKicker > threePair, "K/Q two pair with an Ace kicker beats K/Q two pair with a Jack kicker (from three pair)");
}
check(
  evaluate7(c("Ah Ks Qd Jc 9h 8s 2d")) > evaluate7(c("Ah Ks Qd Jc 8h 7s 2d")),
  "A-K-Q-J-9 high beats A-K-Q-J-8 high"
);
check(
  categoryOf(evaluate7(c("9s 8s 7s 6s 5s 2h 3d"))) === STRAIGHT_FLUSH &&
    evaluate7(c("9s 8s 7s 6s 5s 2h 3d")) > evaluate7(c("6s 5s 4s 3s 2s Ah Kd"))," -- placeholder"
);
check(
  evaluate7(c("9s 8s 7s 6s 5s 2h 3d")) > evaluate7(c("6s 5s 4s 3s 2s Ah Kd")),
  "9-high straight flush beats 6-high (wheel) straight flush"
);
check(evaluate7(c("Ah Ad As Ac 2h 3d 4s")) > evaluate7(c("Kh Kd Ks Kc Ah 3d 4s")), "quad aces beat quad kings");
check(evaluate7(c("Ah Ad As 2h 2d 3c 4s")) > evaluate7(c("Kh Kd Ks Qh Qd 3c 4s")), "full house A-over-2 beats K-over-Q");

// --- Deterministic river equity (exact single comparison) ---
{
  // Hero: AhAd, Villain: KhKd, board gives hero trip aces vs villain trip kings.
  const r = calculateEquity(
    [parseCard("Ah"), parseCard("Ad")],
    [parseCard("Kh"), parseCard("Kd")],
    [parseCard("As"), parseCard("Ks"), parseCard("2c"), parseCard("7d"), parseCard("9h")]
  );
  check(r.win === 100 && r.lose === 0 && r.tie === 0, `river: hero trip aces beats villain trip kings (got ${JSON.stringify(r)})`);
}

// --- Known-ballpark preflop equity (Monte Carlo) ---
{
  const r = calculateEquity([parseCard("Ah"), parseCard("Ad")], [parseCard("Kh"), parseCard("Kd")], []);
  console.log("AA vs KK preflop:", r);
  check(r.win > 75 && r.win < 88, `AA vs KK preflop win% in expected ballpark (got ${r.win.toFixed(2)})`);
  check(Math.abs(r.win + r.tie + r.lose - 100) < 0.01, "AA vs KK percentages sum to 100");
}
{
  const r = calculateEquity([parseCard("2h"), parseCard("2d")], [parseCard("Ah"), parseCard("Kd")], []);
  console.log("22 vs AK preflop:", r);
  check(r.win > 46 && r.win < 58, `22 vs AKo preflop is a near coinflip (got ${r.win.toFixed(2)})`);
}

// --- One-card and two-card board (exact enumeration) ---
{
  const r = calculateEquity([parseCard("Ah"), parseCard("Ad")], [parseCard("Kh"), parseCard("Kd")], [parseCard("2c")]);
  console.log("AA vs KK with 1 board card:", r);
  check(r.exact, "1-card board result is exact");
  check(Math.abs(r.win + r.tie + r.lose - 100) < 0.01, "1-card board percentages sum to 100");
}

console.log(failures === 0 ? "\nALL SELF-TESTS PASSED" : `\n${failures} SELF-TEST(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
