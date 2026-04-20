import { readFile, writeFile } from "node:fs/promises";

const version = process.argv[2];

if (!version) {
  throw new Error("Missing release version.");
}

async function updateJsonFile(path) {
  const content = await readFile(path, "utf8");
  const json = JSON.parse(content);
  json.version = version;
  await writeFile(path, `${JSON.stringify(json, null, 2)}\n`);
}

await Promise.all([
  updateJsonFile("manifest.json"),
  updateJsonFile("package.json"),
]);
