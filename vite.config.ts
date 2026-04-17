import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import chromeExtensionPlugin from "./vite-plugin-chrome-extension";

export default defineConfig({
  plugins: [react(), chromeExtensionPlugin({ outDir: "dist" })],
  base: "./",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, "src/app/popup/index.html"),
        options: resolve(__dirname, "src/app/options/index.html"),
        welcome: resolve(__dirname, "src/app/welcome/index.html"),
        background: resolve(__dirname, "src/scripts/background/index.ts"),
        content: resolve(__dirname, "src/scripts/content/index.ts"),
      },
      output: {
        entryFileNames: (chunk) => {
          if (["background", "content"].includes(chunk.name ?? "")) {
            return "[name].js";
          }
          return "assets/[name].js";
        },
        chunkFileNames: "assets/chunks/[name].js",
        assetFileNames: "assets/[name][extname]",
      },
    },
  },
});
