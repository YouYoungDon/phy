import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";

import config from "../granite.config.ts";
import { queryClient } from "./lib/queryClient";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TDSMobileAITProvider brandPrimaryColor={config.brand.primaryColor}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </TDSMobileAITProvider>
  </StrictMode>,
);
