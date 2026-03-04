import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const graphDataPath = path.join(rootDir, "data", "visualization-data.json");
const outputPath = path.join(rootDir, "data", "verse-years.json");
const THEOGRAPHIC_VERSES_URL = "https://raw.githubusercontent.com/robertrouse/theographic-bible-metadata/master/json/verses.json";

function parseYear(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return null;
  }
  return Math.trunc(numeric);
}

async function build() {
  const graphRaw = await readFile(graphDataPath, "utf8");
  const graphData = JSON.parse(graphRaw);
  if (!Array.isArray(graphData.verseRefs)) {
    throw new Error("visualization-data.json missing verseRefs array");
  }

  const response = await fetch(THEOGRAPHIC_VERSES_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch Theographic verses: HTTP ${response.status}`);
  }
  const verses = await response.json();
  if (!Array.isArray(verses)) {
    throw new Error("Unexpected Theographic verses payload");
  }

  const yearByRef = new Map();
  for (const entry of verses) {
    const fields = entry?.fields ?? entry;
    const osisRef = fields?.osisRef;
    if (typeof osisRef !== "string") {
      continue;
    }
    const year = parseYear(fields?.yearNum);
    if (year !== null) {
      yearByRef.set(osisRef, year);
    }
  }

  const years = graphData.verseRefs.map((verseRef) => yearByRef.get(verseRef) ?? null);
  const datedVerses = years.reduce((count, year) => (year === null ? count : count + 1), 0);

  const payload = {
    source: {
      dataset: "theographic-bible-metadata",
      url: THEOGRAPHIC_VERSES_URL,
    },
    generatedAt: new Date().toISOString(),
    totalVerses: graphData.totalVerses,
    datedVerses,
    coverage: Number((datedVerses / graphData.totalVerses).toFixed(6)),
    years,
  };

  await writeFile(outputPath, JSON.stringify(payload));

  console.log(`Built ${outputPath}`);
  console.log(`Total verses: ${graphData.totalVerses}`);
  console.log(`Dated verses: ${datedVerses}`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
