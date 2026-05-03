import '@ant-design/v5-patch-for-react-19';
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
    <ConfigProvider>
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