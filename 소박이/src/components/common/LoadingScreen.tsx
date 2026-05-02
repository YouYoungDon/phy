export default function LoadingScreen() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ textAlign: "center", color: "#6a5495" }}>
        <p style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>로딩 중...</p>
        <p style={{ margin: "8px 0 0", color: "#8473ad" }}>잠시만 기다려 주세요.</p>
      </div>
    </div>
  );
}
