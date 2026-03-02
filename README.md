# Bible Cross-Reference Arc Explorer

Interactive verse-level arc visualization inspired by the classic Bible cross-reference design.
It starts in static `Show All` mode. Use the mouse wheel over the chart to zoom where the cursor is for finer strand detail.
In single mode, click once on the chart to freeze the hovered verse and click again to unfreeze.

## Run

1. Start a static server in this folder:

```powershell
python -m http.server 8080
```

2. Open:

`http://localhost:8080`

## Rebuild Data

The visualization uses `data/visualization-data.json`.
The selected verse text display uses `data/kjv-verse-texts.json`.

If you update `data/cross_references.txt` or `data/bible_chapter_verses.json`, rebuild with:

```powershell
node scripts/build-data.mjs
```

To rebuild KJV verse text (index-aligned with all 31,102 verses):

```powershell
node scripts/build-kjv-texts.mjs
```

## Data Sources

- Cross references: OpenBible.info (`CC-BY`), included as `data/cross_references.txt`
- Canonical chapter verse counts: `data/bible_chapter_verses.json`
