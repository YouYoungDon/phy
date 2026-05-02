export function formatCurrency(amount: number) {
  return amount.toLocaleString("ko-KR");
}

export function formatMonthLabel(year: number, month: number) {
  return `${year}년 ${month.toString().padStart(2, "0")}월`;
}
