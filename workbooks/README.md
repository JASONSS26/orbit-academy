# Workbooks — worksheet content, by version

This folder holds the **editable worksheet content** for Orbit Academy. Each worksheet is a
`worksheetN.data.js` file. The instructor **Worksheet Editor** (Instructor dashboard →
✏️ Edit worksheets) reads and writes these files — you rarely need to touch them by hand.

## The one rule: `active/` is what students see

```
workbooks/
  active/            ← the LIVE set. The server serves worksheets from here.
    worksheet1.data.js … worksheet8.data.js, worksheet-final.data.js
  2026-spring/       ← an inactive saved version (any name you like)
  2026-summer-draft/ ← another inactive version
```

The server always serves the folder named **`active`**. Nothing else is special about the
names — the other folders are just storage.

## Switching versions = renaming folders (works on Windows AND Mac)

To put a different version live, you do **two renames** in Finder (Mac) or File Explorer
(Windows) — no special tools, no symlinks, no config files:

1. Rename the current `active` → something memorable, e.g. `2026-spring`.
2. Rename the version you want live → `active`.

That's it. Refresh the worksheet in the browser and the new content is live. Because it's
just folder renaming, it behaves identically on Windows and macOS.

> **Tip:** keep the currently-live set named `active` and give every archived set a dated
> name (`2026-spring`, `2026-fall`, `pilot-cohort`). You can copy a folder first if you want
> to branch a new version from the current one before editing.

## Backups

Every time the editor saves a worksheet it writes a timestamped `.bak` copy next to the file
(`worksheet3.data.2026-07-17T04-20-12Z.bak`). If an edit goes wrong, rename the most recent
`.bak` back to `worksheet3.data.js`. These `.bak`/`.tmp` files are git-ignored.

## Safety

- The editor validates every save by executing the file in a sandbox first — a syntactically
  broken worksheet is **rejected** before it can overwrite a good one.
- Only **instructor** accounts can list, load, or save worksheets (enforced server-side).
- Worksheet files live outside `public/`, so their raw source can't be fetched directly and a
  bad edit can't be loaded as a static asset.
