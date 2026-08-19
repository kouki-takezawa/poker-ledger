import Link from "next/link";
import { PERIOD_LABELS, type Period } from "@/lib/stats";

const PERIODS: Period[] = ["all", "year", "month"];

export function PeriodTabs({ current }: { current: Period }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
      {PERIODS.map((p) => (
        <Link
          key={p}
          href={p === "all" ? "?" : `?period=${p}`}
          className="chip"
          aria-current={p === current ? "page" : undefined}
          style={{ textDecoration: "none" }}
        >
          {PERIOD_LABELS[p]}
        </Link>
      ))}
    </div>
  );
}
