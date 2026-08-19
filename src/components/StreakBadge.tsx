export function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;

  const isWin = streak > 0;
  const count = Math.abs(streak);

  return (
    <div style={{ marginBottom: 24 }}>
      <span className={`status-pill final ${isWin ? "gain" : "loss"}`}>
        {count}連{isWin ? "勝" : "敗"}中
      </span>
    </div>
  );
}
