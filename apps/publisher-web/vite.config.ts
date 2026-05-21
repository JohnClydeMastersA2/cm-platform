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
    },
  },
});
