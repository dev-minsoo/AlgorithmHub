import { build } from "esbuild";

await build({
  entryPoints: ["src/scripts/content/index.ts"],
  bundle: true,
  format: "iife",
  platform: "browser",
  target: "chrome120",
  outfile: "dist/content.js",
  sourcemap: false,
  minify: false,
  legalComments: "none",
});
