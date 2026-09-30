# Yorkstead design system build

This folder rebuilds the published Yorkstead Design System from this repository:
<https://claude.ai/artifact/AdG5JsAizNEyXB4ptFVt9T>

```sh
bun install
bun run design-system
```

The command writes the system's files to `design-system/dist/project/` (git-ignored). It prints which colour tokens changed, plus warnings for anything that needs a person to act.

## What it does

1. **Copies `source/`.** This folder holds the hand-written parts of the system: the brand book (`README.md`), the token usage notes (`tokens.json`), each component's `README.md` and `preview.html`, the cover, the types (`components/index.d.ts`), the asset notes, and the index (`design-system.json`).
2. **Re-syncs tokens from `app/globals.css`.** Every colour variable in `:root` and `.dark` is updated in light and dark, and so are the radius scale (from `--radius`) and the primary button glow. Usage notes are kept. A new variable is added with a placeholder note, and a removed variable is only reported, never deleted.
3. **Bundles the real components.** The components listed in `entry.js` become one script, `components/bundle.js`, which sets `window.Yorkstead`. React 19 is packaged as two library files, `components/lib/react*.js`, at the version installed from `package.json`.
4. **Builds the stylesheet.** `components/bundle.css` is the site's own Tailwind build of `components/` and `lib/` against `app/globals.css`. The colour variables are left out (the design system's `tokens.css` supplies them), and `dark:` follows the preview frame's `data-theme`.

The previews run outside Next.js, so `shims/` stands in for a few modules:
- `next/link` renders an anchor, and `next/image` renders an `<img>` that points at the system's uploaded media.
- `next/navigation` always reports the path `/`, and `next-themes` flips `data-theme`.
- Analytics tracking does nothing.
- The contact and workflow server actions send nothing and reply "Preview only — nothing was sent."

## Publishing

Publishing needs Claude's Artifact tool. After building, ask Claude Code:

> Publish `design-system/dist/project` to the Yorkstead Design System artifact.

Claude re-reads the live index, keeps its asset records and any edits made on the page, and uploads the changed files.

## Changing the system

- **Brand book, notes, previews:** edit the files under `source/`, then rebuild.
- **Adding a component:**
  1. Import it in `entry.js` and add it to `window.Yorkstead`.
  2. Add its name to `COMPONENTS` in `build.mjs`.
  3. Write `source/components/<Name>/README.md` and `preview.html`. Line 1 of the preview is `<!-- @dsCard group="…" height=N -->`, and the preview renders with `window.Yorkstead.<Name>`.
  4. Add its props to `source/components/index.d.ts`.
- **A component shows a new file from `public/`:** upload that file to the artifact, then map its path to the asset URL in `shims/public-assets.js`.
- **A component imports a new server-only module:** add a stand-in to `STAND_INS` in `build.mjs`.
