# Rememberly

Rememberly is a local-first, Android-first personal memory app for reminders, shopping lists, and future purchase tracking. It supports English and বাংলা and stores core data in the browser with IndexedDB/Dexie.

## Current milestone

Milestone 1 — foundation: reminders, shopping lists, bilingual UI, themes, local search, data export/import, PWA foundation, and GitHub Pages deployment configuration.

Purchase tracking, barcode/QR scanning, cloud sync, and AI are intentionally deferred to later milestones.

## Development

Requirements: Node.js 20.19+ (Node 22 LTS recommended).

```bash
npm install
npm run dev
```

## Quality checks

```bash
npm run typecheck
npm run lint
npm run build
```

Or run all three:

```bash
npm run check
```

## Production preview

```bash
npm run build
npm run preview
```

## Deployment

The repository is configured for GitHub Pages at `/reminder-app/`. The GitHub Actions workflow installs dependencies, builds the production bundle, and deploys the `dist` directory to GitHub Pages.

The Vercel deployment can continue to serve the same source; local/Vercel builds use `/` as their base path.

## Data

Core data is stored locally in IndexedDB through Dexie. Use Settings → Export backup before major upgrades. Import validates the Rememberly backup structure and merges records without intentionally deleting existing data.
