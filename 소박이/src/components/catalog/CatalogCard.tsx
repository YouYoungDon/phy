import type { ItemSummary } from "../../types/domain";

interface CatalogCardProps {
  item: ItemSummary;
}

const rarityColors: Record<string, string> = {
  common: "#f4f1ff",
  rare: "#dbe7ff",
  epic: "#fde2ff",
  legendary: "#ffe8cc",
};

export default function CatalogCard({ item }: CatalogCardProps) {
  return (
    <article style={{ backgroundColor: rarityColors[item.rarity] ?? "#ffffff", borderRadius: 20, padding: 16, boxShadow: "0 10px 20px rgba(111,66,193,0.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
        <div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{item.name}</p>
          <p style={{ margin: "8px 0 0", color: "#5f4b8b" }}>{item.acquired ? "획득 완료" : "미획득"}</p>
        </div>
        <span style={{ color: "#3d2c8d", fontWeight: 700 }}>{item.rarity}</span>
      </div>
    </article>
  );
}
