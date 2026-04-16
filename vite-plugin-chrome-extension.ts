import { promises as fs } from "node:fs";
import { resolve } from "node:path";

const defaultPages = ["popup", "sidepanel", "options", "devtools", "devtools-page"];

export type ChromeExtensionPluginOptions = {
  outDir?: string;
  pages?: string[];
};

export default function chromeExtensionPlugin(
  options: ChromeExtensionPluginOptions = {}
) {
  const outDir = options.outDir ?? "dist";
  const pages = options.pages ?? defaultPages;

  return {
    name: "vite-plugin-chrome-extension",
    async closeBundle() {
      await Promise.all(
        pages.map(async (page) => {
          const from = resolve(outDir, "src/app", page, "index.html");
          const to = resolve(outDir, `${page}.html`);
          try {
            await fs.rename(from, to);
          } catch (error) {
            if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
              throw error;
            }
          }
        })
      );

      const srcDir = resolve(outDir, "src");
      try {
        await fs.rm(srcDir, { recursive: true, force: true });
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
          throw error;
        }
      }
    },
  };
}
