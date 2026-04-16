# React + TypeScript + Tailwind + Vite — Chrome Extension (MV3) Boilerplate

## Overview
Fork-and-go Chrome Extension boilerplate built with React, TypeScript, Tailwind CSS, and Vite. It targets Manifest V3 and includes common extension surfaces out of the box: Popup, Side Panel, Options, and DevTools, plus background and content scripts.

## Features
- MV3 service worker background
- React + TypeScript UI surfaces
- Tailwind CSS styling
- Vite-based multi-entry build with HTML relocation
- Ready-to-use Popup, Side Panel, Options, and DevTools pages
- Background and Content script templates

## Supported Extension Components
- Popup
- Side Panel
- Options Page
- DevTools Panel (via devtools-page loader)
- Background Service Worker
- Content Script

## Directory Structure
```txt
.
├─ manifest.json
├─ public/
│  └─ icons/
└─ src/
   ├─ app/
   │  ├─ popup/
   │  ├─ sidepanel/
   │  ├─ options/
   │  ├─ devtools/
   │  └─ devtools-page/
   ├─ scripts/
   │  ├─ background/
   │  └─ content/
   └─ shared/
      ├─ components/
      ├─ hooks/
      ├─ styles/
      └─ utils/
```

## Scripts
- `npm run dev`: start Vite dev server
- `npm run build`: type-check + build + copy manifest into dist
- `npm run copy-manifest`: copy `manifest.json` to `dist/manifest.json`
- `npm run lint`: run ESLint
- `npm run preview`: preview production build

## Build Pipeline Notes
- `vite-plugin-chrome-extension.ts` moves generated HTML files to `dist/` root.
- `manifest.json` remains in repo root and is copied into `dist/` by `copy-manifest`.

## Getting Started

### Install
```bash
npm install
```

### Develop
```bash
npm run dev
```

### Build
```bash
npm run build
```

The production build outputs to `dist/`.

## Load Unpacked (Chrome)
1. Build the extension:
   ```bash
   npm run build
   ```
2. Open Chrome and go to Extensions.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `dist/` folder.

## Where to Edit
- Popup UI: `src/app/popup/`
- Side Panel UI: `src/app/sidepanel/`
- Options UI: `src/app/options/`
- DevTools UI: `src/app/devtools/`
- DevTools loader: `src/app/devtools-page/`
- Background (service worker): `src/scripts/background/`
- Content script: `src/scripts/content/`
- Shared styles/components/utils: `src/shared/`

## Permissions
The default manifest includes:
- `tabs`, `storage`, `sidePanel`
- `host_permissions` for `<all_urls>`
- A content script that runs on all pages

Update `manifest.json` to reduce permissions and narrow host matching for your use case.

## Customization
- Update `manifest.json` (name, description, version, permissions, entry points).
- Replace icons under `public/icons/` and reference them in the manifest.
- Remove any surface you don’t need (and delete the manifest entry).

## Notes
- Popup, Side Panel, Options, and DevTools are separate React entry points.
- Background and Content scripts are built as standalone MV3 scripts.
