import ItemSprite from "./ItemSprite";
import type { ItemSprite as ItemSpriteType } from "../../types/domain";

interface RoomCanvasProps {
  backgroundUrl?: string;
  items: ItemSpriteType[];
}

export default function RoomCanvas({ backgroundUrl, items }: RoomCanvasProps) {
  return (
    <section
      style={{
        position: "relative",
        width: "100%",
        minHeight: 380,
        borderRadius: 24,
        overflow: "hidden",
        backgroundColor: "#fff7fe",
        backgroundImage: backgroundUrl ? `url(${backgroundUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        boxShadow: "0 12px 30px rgba(111, 66, 193, 0.14)",
      }}
    >
      {items.map((item) => (
        <ItemSprite key={item.id} item={item} />
      ))}
    </section>
  );
}
