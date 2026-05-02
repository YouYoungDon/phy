import type { ItemSprite as ItemSpriteType } from "../../types/domain";

interface ItemSpriteProps {
  item: ItemSpriteType;
}

export default function ItemSprite({ item }: ItemSpriteProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: `${item.position.x}%`,
        top: `${item.position.y}%`,
        transform: "translate(-50%, -50%)",
        width: 60,
        height: 60,
        borderRadius: 16,
        backgroundColor: item.type === "pet" ? "#ffd6e7" : item.type === "furniture" ? "#e8f0ff" : "#fff0b2",
        color: "#3c1361",
        display: "grid",
        placeItems: "center",
        fontSize: 12,
        fontWeight: 600,
        textAlign: "center",
        padding: 8,
        boxShadow: "0 8px 18px rgba(0,0,0,0.08)",
      }}
    >
      {item.name}
    </div>
  );
}
