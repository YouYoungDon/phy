import QuestCard from "../../components/quest/QuestCard";
import { useQuest } from "../../hooks/useQuest";

export default function QuestPage() {
  const { data, isLoading, error, progressQuest } = useQuest();

  return (
    <main style={{ padding: "20px 16px 120px", color: "#3d2c8d" }}>
      <section style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>퀘스트</h1>
        <p style={{ margin: 0, color: "#5f4b8b" }}>진행 중인 퀘스트를 확인하고 보상을 획득해 보세요.</p>
      </section>

      {isLoading ? (
        <p style={{ color: "#6a5495" }}>퀘스트를 불러오는 중입니다...</p>
      ) : error ? (
        <p style={{ color: "#b33951" }}>퀘스트 데이터를 불러오지 못했습니다.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {data?.map((quest) => (
            <QuestCard key={quest.id} quest={quest} onProgress={() => progressQuest(quest.id)} />
          ))}
          {data?.length === 0 && <p style={{ color: "#5f4b8b" }}>진행 중인 퀘스트가 없습니다.</p>}
        </div>
      )}
    </main>
  );
}
