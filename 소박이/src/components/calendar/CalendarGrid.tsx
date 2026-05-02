import type { LedgerEntry } from "../../types/domain";
import { formatCurrency } from "../../lib/formatters";

interface CalendarGridProps {
  entries: LedgerEntry[];
}

export default function CalendarGrid({ entries }: CalendarGridProps) {
  const totalAmount = entries.reduce((acc, entry) => acc + entry.amount, 0);
  const grouped = entries.reduce<Record<string, LedgerEntry[]>>((acc, entry) => {
    const date = new Date(entry.savedAt).toLocaleDateString("ko-KR");
    acc[date] = [...(acc[date] ?? []), entry];
    return acc;
  }, {});

  return (
    <section style={{ display: "grid", gap: 12 }}>
      <div style={{ padding: 16, backgroundColor: "#fff7fe", borderRadius: 20 }}>
        <p style={{ margin: 0, color: "#3d2c8d", fontWeight: 700 }}>이번 달 지출</p>
        <p style={{ marginTop: 8, fontSize: 24, color: "#8e44ad" }}>{formatCurrency(totalAmount)}원</p>
      </div>
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date} style={{ padding: 16, backgroundColor: "#ffffff", borderRadius: 20, boxShadow: "0 4px 18px rgba(111,66,193,0.08)" }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{date}</p>
          <ul style={{ margin: "12px 0 0", padding: 0, listStyle: "none" }}>
            {items.map((item) => (
              <li key={item.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
                <span style={{ color: "#5f4b8b" }}>{item.category}</span>
                <span style={{ color: "#3d2c8d", fontWeight: 700 }}>{formatCurrency(item.amount)}원</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
