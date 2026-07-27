import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/auth": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/internal": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/platform/status": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/healthcare": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/email-webhook-events": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/widgets": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/consumer-widgets": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/topic-routing": {
        target: "http://localhost:3000",
        changeOrigin: true
      },
      "/priority-queue": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  }
});
