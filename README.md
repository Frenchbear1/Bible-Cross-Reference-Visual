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
Timeline ordering (BC->AD) uses `data/verse-years.json`.
Composition ordering (written-order) uses `data/verse-composition-years.json`.
Timeline event overlays use `data/verse-events.json`.

If you update `data/cross_references.txt` or `data/bible_chapter_verses.json`, rebuild with:

```powershell
node scripts/build-data.mjs
```

To rebuild KJV verse text (index-aligned with all 31,102 verses):

```powershell
node scripts/build-kjv-texts.mjs
```

To rebuild verse year metadata (Theographic `yearNum` mapped by verse):

```powershell
node scripts/build-verse-years.mjs
```

To rebuild composition-order metadata (profiled book ranges + verse-indexed sort years):

```powershell
node scripts/build-verse-composition-years.mjs
```

Composition rebuild outputs:

- `data/verse-composition-years.json` with `defaultProfile`, `profileOrder`, and `profiles` (`critical`, `traditional`, `earliest-layer`)
- `data/composition-book-ranges.json` with per-profile range tables
- `data/composition-book-ranges.csv` (default profile only, legacy-compatible)
- `data/composition-book-ranges-critical.csv`
- `data/composition-book-ranges-traditional.csv`
- `data/composition-book-ranges-earliest-layer.csv`

To rebuild verse-event metadata (Theographic event titles mapped to verses):

```powershell
node scripts/build-verse-events.mjs
```

## Data Sources

- Cross references: OpenBible.info (`CC-BY`), included as `data/cross_references.txt`
- Canonical chapter verse counts: `data/bible_chapter_verses.json`
- Timeline years + events: Theographic Bible Metadata
- Composition ranges: profile synthesis (critical, traditional, earliest-layer) from Wikipedia Dating the Bible, SBL Bible Odyssey, TheTorah, Early Christian Writings, and BibleGateway
