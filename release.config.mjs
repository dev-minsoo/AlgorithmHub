export default {
  branches: ["main"],
  tagFormat: "v${version}",
  plugins: [
    "@semantic-release/commit-analyzer",
    "@semantic-release/release-notes-generator",
    [
      "@semantic-release/exec",
      {
        prepareCmd:
          "node scripts/set-release-version.mjs ${nextRelease.version} && npm run build && cd dist && zip -r ../algorithmhub-webstore.zip .",
      },
    ],
    [
      "@semantic-release/github",
      {
        assets: [
          {
            path: "algorithmhub-webstore.zip",
            label: "Chrome Web Store package",
          },
        ],
      },
    ],
  ],
};
