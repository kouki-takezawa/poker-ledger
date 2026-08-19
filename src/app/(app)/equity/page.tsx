import { EquityCalculator } from "./EquityCalculator";

export default function EquityPage() {
  return (
    <div className="page-shell">
      <h1 className="page-title">勝率計算</h1>
      <p className="page-subtitle">
        自分の手札・相手の手札・場のカードを選ぶと、その時点での勝率を計算します。場のカードは0〜5枚まで、好きな枚数で試せます。
      </p>
      <EquityCalculator />
    </div>
  );
}
