import { useState } from "react";
import { BottomSheet, Top, Tabbar } from "@toss/tds-mobile";
import RoomPage from "../pages/Room";
import CalendarPage from "../pages/Calendar";
import QuestPage from "../pages/Quest";
import CatalogPage from "../pages/Catalog";
import SettingsPage from "../pages/Settings";

const tabs = [
  { id: "room", label: "홈" },
  { id: "calendar", label: "캘린더" },
  { id: "quest", label: "퀘스트" },
  { id: "catalog", label: "도감" },
  { id: "settings", label: "설정" },
] as const;

type TabId = (typeof tabs)[number]["id"];

const pageMap: Record<TabId, () => JSX.Element> = {
  room: () => <RoomPage />,
  calendar: () => <CalendarPage />,
  quest: () => <QuestPage />,
  catalog: () => <CatalogPage />,
  settings: () => <SettingsPage />,
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabId>("room");

  const ActivePage = pageMap[activeTab];

  return (
    <main style={{ minHeight: "100vh", backgroundColor: "#fcf8ff" }}>
      <Top
        title={<Top.TitleParagraph size={22}>소박이</Top.TitleParagraph>}
        subtitleBottom={
          <Top.SubtitleParagraph size={16}>
            나만의 가계부 룸을 만들고, 지출을 모아보세요.
          </Top.SubtitleParagraph>
        }
      />

      <ActivePage />

      <BottomSheet open={false}>
        <BottomSheet.Title>소박이 MVP</BottomSheet.Title>
      </BottomSheet>

      <footer style={{ position: "fixed", insetInline: 0, bottom: 0 }}>
        <Tabbar>
          {tabs.map((tab) => (
            <Tabbar.Item
              key={tab.id}
              active={activeTab === tab.id}
              label={tab.label}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </Tabbar>
      </footer>
    </main>
  );
}
