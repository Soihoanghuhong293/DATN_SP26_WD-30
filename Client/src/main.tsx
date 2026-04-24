import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter } from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import { AuthProvider } from "./auth/AuthProvider";
import "./services/http";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ConfigProvider>
      <AntdApp>
        <AuthProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  </QueryClientProvider>
);