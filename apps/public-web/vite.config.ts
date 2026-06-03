import { defineConfig } from "vite";

export default defineConfig({
  server: {
    proxy: {
      "/auth": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/internal": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/widgets": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/consumer-widgets": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/topic-routing": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/priority-queue": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/platform/status": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
