import type { ReactNode } from "react";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#fcf8ff" }}>
      {children}
    </div>
  );
}
