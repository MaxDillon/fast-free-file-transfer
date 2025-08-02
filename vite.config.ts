import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ command }) => {
  const isProd = command === "build";

  return {
    base: isProd ? "/fast-free-file-transfer/" : "/",
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
    server: {
      allowedHosts: ["laptop.kinkajou-richter.ts.net"],
    },
  };
});
