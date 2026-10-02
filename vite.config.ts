import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// The dev server runs on 8788 so the API's default CORS allow-list (http://localhost:8788) accepts it.
export default defineConfig({
  plugins: [react()],
  server: { port: 8788, strictPort: true },
  build: { outDir: "dist", sourcemap: false, target: "es2022" },
});
