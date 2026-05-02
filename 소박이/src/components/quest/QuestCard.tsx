import type { QuestSummary } from "../../types/domain";
import { formatCurrency } from "../../lib/formatters";

interface QuestCardProps {
  quest: QuestSummary;
  onProgress: () => void;
}

export default function QuestCard({ quest, onProgress }: QuestCardProps) {
  return (
    <article style={{ backgroundColor: "#fff7fe", borderRadius: 20, padding: 16, boxShadow: "0 10px 20px rgba(111,66,193,0.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{quest.title}</p>
          <p style={{ margin: "8px 0 0", color: "#5f4b8b" }}>
            진행 {quest.progress}/{quest.target}
          </p>
        </div>
        <button
          type="button"
          style={{
            border: 0,
            borderRadius: 14,
            padding: "10px 16px",
            backgroundColor: quest.completed ? "#dcd7ff" : "#8e44ad",
            color: quest.completed ? "#5f4b8b" : "#fff",
            cursor: quest.completed ? "default" : "pointer",
          }}
          onClick={onProgress}
          disabled={quest.completed}
        >
          {quest.completed ? "완료" : "진행"}
        </button>
      </div>
      {quest.rewardItem && (
        <p style={{ margin: "12px 0 0", color: "#6a5495" }}>
          보상: {quest.rewardItem.name} ({quest.rewardItem.rarity})
        </p>
      )}
    </article>
  );
}
