import { useMemo } from "react";
import CalendarGrid from "../../components/calendar/CalendarGrid";
import { useLedger } from "../../hooks/useLedger";

const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

export default function CalendarPage() {
  const { data, isLoading, error, monthLabel } = useLedger();

  const totalEntries = useMemo(() => data?.length ?? 0, [data]);

  return (
    <main style={{ padding: "20px 16px 120px", color: "#3d2c8d" }}>
      <section style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>캘린더</h1>
        <p style={{ margin: 0, color: "#5f4b8b" }}>월간 지출 내역을 확인하고 일별 지출을 모니터링합니다.</p>
      </section>

      <div style={{ display: "grid", gap: 12, marginBottom: 16 }}>
        <div style={{ padding: 16, backgroundColor: "#fff7fe", borderRadius: 20 }}>
          <p style={{ margin: 0, color: "#3d2c8d", fontWeight: 700 }}>{monthLabel}</p>
          <p style={{ margin: "8px 0 0", color: "#6a5495" }}>지출 항목 {totalEntries}개</p>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
          {weekDays.map((day) => (
            <div key={day} style={{ minWidth: 44, textAlign: "center", color: "#5f4b8b" }}>
              {day}
            </div>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p style={{ color: "#6a5495" }}>지출 데이터를 불러오는 중입니다...</p>
      ) : error ? (
        <p style={{ color: "#b33951" }}>데이터를 불러오지 못했습니다.</p>
      ) : (
        <CalendarGrid entries={data ?? []} />
      )}
    </main>
  );
}
