import { yen } from "@/lib/format";

const MONTH_LABELS = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];

export function MonthlyBreakdownTable({ data }: { data: { month: number; profit: number }[] }) {
  return (
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            <th>月</th>
            <th className="num">収支</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.month}>
              <td>{MONTH_LABELS[d.month]}</td>
              <td className={`num ${d.profit > 0 ? "amt-gain" : d.profit < 0 ? "amt-loss" : ""}`}>
                {d.profit === 0 ? "—" : yen(d.profit, true)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
