import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import { AuthProvider } from "./auth/AuthProvider";
import "./services/http";
import { SettingsProvider } from "./settings/SettingsProvider";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ConfigProvider
      theme={{
        components: {
          // Header sticky z-index 1000; chat widget ~9999 — đưa toast/feedback lên trên
          Message: { zIndexPopup: 12000 },
          Notification: { zIndexPopup: 12000 },
        },
      }}
    >
      <AntdApp>
        <AuthProvider>
            <SettingsProvider>
              <BrowserRouter>
                <App />
              </BrowserRouter>
            </SettingsProvider>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  </QueryClientProvider>
);