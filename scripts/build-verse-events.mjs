import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const graphDataPath = path.join(rootDir, "data", "visualization-data.json");
const outputPath = path.join(rootDir, "data", "verse-events.json");
const THEOGRAPHIC_VERSES_URL = "https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/master/json/verses.json";
const THEOGRAPHIC_EVENTS_URL = "https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/master/json/events.json";

function parseStartYear(startDate) {
  if (typeof startDate !== "string" || !startDate.trim()) {
    return null;
  }
  const match = startDate.trim().match(/^-?\d{1,5}/);
  if (!match) {
    return null;
  }
  const year = Number(match[0]);
  return Number.isFinite(year) ? Math.trunc(year) : null;
}

function normalizeTitle(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().replace(/\s+/g, " ");
}

async function fetchJson(url, label) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${label}: HTTP ${response.status}`);
  }
  return response.json();
}

async function build() {
  const graphRaw = await readFile(graphDataPath, "utf8");
  const graphData = JSON.parse(graphRaw);
  if (!Array.isArray(graphData.verseRefs)) {
    throw new Error("visualization-data.json missing verseRefs array");
  }

  const [theoVerses, theoEvents] = await Promise.all([
    fetchJson(THEOGRAPHIC_VERSES_URL, "Theographic verses"),
    fetchJson(THEOGRAPHIC_EVENTS_URL, "Theographic events"),
  ]);

  if (!Array.isArray(theoVerses) || !Array.isArray(theoEvents)) {
    throw new Error("Unexpected Theographic payload shape");
  }

  const canonicalIndexByRef = new Map();
  for (let index = 0; index < graphData.verseRefs.length; index += 1) {
    canonicalIndexByRef.set(graphData.verseRefs[index], index);
  }

  const canonicalIndexByTheoVerseId = new Map();
  for (const record of theoVerses) {
    const fields = record?.fields ?? record;
    const theoVerseId = record?.id;
    const osisRef = fields?.osisRef;
    if (typeof theoVerseId !== "string" || typeof osisRef !== "string") {
      continue;
    }
    const canonicalIndex = canonicalIndexByRef.get(osisRef);
    if (canonicalIndex === undefined) {
      continue;
    }
    canonicalIndexByTheoVerseId.set(theoVerseId, canonicalIndex);
  }

  const perVerseEventIds = Array.from({ length: graphData.totalVerses }, () => []);
  const events = [];

  for (const record of theoEvents) {
    const fields = record?.fields ?? record;
    const title = normalizeTitle(fields?.title);
    const verseIds = Array.isArray(fields?.verses) ? fields.verses : [];
    if (!title || verseIds.length === 0) {
      continue;
    }

    const verseSet = new Set();
    for (const verseId of verseIds) {
      const canonicalIndex = canonicalIndexByTheoVerseId.get(verseId);
      if (canonicalIndex !== undefined) {
        verseSet.add(canonicalIndex);
      }
    }
    if (verseSet.size === 0) {
      continue;
    }

    const mappedVerses = Array.from(verseSet).sort((a, b) => a - b);
    const startYear = parseStartYear(fields?.startDate);
    const sortKey = Number(fields?.sortKey);

    const eventIndex = events.length;
    events.push({
      id: record?.id ?? null,
      eventID: Number.isFinite(Number(fields?.eventID)) ? Math.trunc(Number(fields.eventID)) : null,
      title,
      startDate: typeof fields?.startDate === "string" ? fields.startDate : null,
      startYear,
      sortKey: Number.isFinite(sortKey) ? sortKey : null,
      rangeFlag: Boolean(fields?.rangeFlag),
      verseCount: mappedVerses.length,
      anchorVerse: mappedVerses[0],
    });

    for (const verseIndex of mappedVerses) {
      perVerseEventIds[verseIndex].push(eventIndex);
    }
  }

  for (let verseIndex = 0; verseIndex < perVerseEventIds.length; verseIndex += 1) {
    perVerseEventIds[verseIndex].sort((leftEventId, rightEventId) => {
      const leftEvent = events[leftEventId];
      const rightEvent = events[rightEventId];
      if (leftEvent.sortKey !== null && rightEvent.sortKey !== null && leftEvent.sortKey !== rightEvent.sortKey) {
        return leftEvent.sortKey - rightEvent.sortKey;
      }
      if (leftEvent.startYear !== null && rightEvent.startYear !== null && leftEvent.startYear !== rightEvent.startYear) {
        return leftEvent.startYear - rightEvent.startYear;
      }
      return leftEvent.title.localeCompare(rightEvent.title);
    });
  }

  const verseEventOffsets = new Uint32Array(graphData.totalVerses + 1);
  const flattenedEventIds = [];
  for (let verseIndex = 0; verseIndex < perVerseEventIds.length; verseIndex += 1) {
    for (const eventIndex of perVerseEventIds[verseIndex]) {
      flattenedEventIds.push(eventIndex);
    }
    verseEventOffsets[verseIndex + 1] = flattenedEventIds.length;
  }

  const payload = {
    source: {
      dataset: "theographic-bible-metadata",
      eventsUrl: THEOGRAPHIC_EVENTS_URL,
      versesUrl: THEOGRAPHIC_VERSES_URL,
    },
    generatedAt: new Date().toISOString(),
    totalVerses: graphData.totalVerses,
    totalEvents: events.length,
    verseEventOffsets: Array.from(verseEventOffsets),
    verseEventIds: flattenedEventIds,
    events,
  };

  await writeFile(outputPath, JSON.stringify(payload));

  console.log(`Built ${outputPath}`);
  console.log(`Events mapped: ${events.length}`);
  console.log(`Verse-event links: ${flattenedEventIds.length}`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
