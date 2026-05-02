import CatalogCard from "../../components/catalog/CatalogCard";
import { useCatalog } from "../../hooks/useCatalog";

export default function CatalogPage() {
  const { catalog, myItems } = useCatalog();

  return (
    <main style={{ padding: "20px 16px 120px", color: "#3d2c8d" }}>
      <section style={{ marginBottom: 16 }}>
        <h1 style={{ fontSize: 24, marginBottom: 8 }}>도감</h1>
        <p style={{ margin: 0, color: "#5f4b8b" }}>획득한 아이템과 전체 도감을 확인해 보세요.</p>
      </section>

      {catalog.isLoading || myItems.isLoading ? (
        <p style={{ color: "#6a5495" }}>도감 데이터를 불러오는 중입니다...</p>
      ) : catalog.error || myItems.error ? (
        <p style={{ color: "#b33951" }}>도감 정보를 불러오지 못했습니다.</p>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {catalog.data?.map((item) => {
            const owned = myItems.data?.some((ownedItem) => ownedItem.id === item.id) ?? false;
            return <CatalogCard key={item.id} item={{ ...item, acquired: owned }} />;
          })}
        </div>
      )}
    </main>
  );
}
