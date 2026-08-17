export function yen(amount: number, withSign = false): string {
  const sign = withSign && amount > 0 ? "+" : "";
  return sign + amount.toLocaleString("ja-JP") + "円";
}

export function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("ja-JP");
}
