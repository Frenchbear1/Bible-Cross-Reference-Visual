import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const graphDataPath = path.join(rootDir, "data", "visualization-data.json");
const outputPath = path.join(rootDir, "data", "kjv-verse-texts.json");

const BASE_URL = "https://raw.githubusercontent.com/jsonbible/kjv/master";

async function fetchBookJson(bookNumber) {
  const response = await fetch(`${BASE_URL}/${bookNumber}.json`);
  if (!response.ok) {
    throw new Error(`Failed to fetch book ${bookNumber}: HTTP ${response.status}`);
  }
  return response.json();
}

async function build() {
  const graphRaw = await readFile(graphDataPath, "utf8");
  const graphData = JSON.parse(graphRaw);

  const verses = [];

  for (let bookNumber = 1; bookNumber <= 66; bookNumber += 1) {
    // Fetch one canonical book file at a time to keep memory stable.
    const book = await fetchBookJson(bookNumber);
    if (!Array.isArray(book.chapters)) {
      throw new Error(`Book ${bookNumber} missing chapters array`);
    }

    for (const chapter of book.chapters) {
      if (!Array.isArray(chapter.verses)) {
        throw new Error(`Book ${bookNumber} chapter missing verses array`);
      }
      for (const verse of chapter.verses) {
        verses.push(verse.text ?? "");
      }
    }
  }

  if (verses.length !== graphData.totalVerses) {
    throw new Error(`KJV verse count mismatch: ${verses.length} vs ${graphData.totalVerses}`);
  }

  const payload = {
    source: {
      dataset: "jsonbible-kjv",
      url: "https://github.com/jsonbible/kjv",
    },
    verses,
  };

  await writeFile(outputPath, JSON.stringify(payload));

  console.log(`Built ${outputPath}`);
  console.log(`Verses: ${verses.length}`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
