import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const dataDir = path.join(rootDir, "data");

const crossReferencesPath = path.join(dataDir, "cross_references.txt");
const chapterCountsPath = path.join(dataDir, "bible_chapter_verses.json");
const outputPath = path.join(dataDir, "visualization-data.json");

function parseDateFromHeader(headerLine) {
  const match = headerLine.match(/(\d{4}-\d{2}-\d{2})\s*$/);
  return match ? match[1] : null;
}

async function build() {
  const chapterCountsRaw = await readFile(chapterCountsPath, "utf8");
  const chapterCounts = JSON.parse(chapterCountsRaw);

  const refToIndex = new Map();
  const verseRefs = [];
  const books = [];

  let verseIndex = 0;
  for (const book of chapterCounts) {
    const abbr = book.abbr;
    const name = book.book;
    const chapters = book.chapters.map((c) => Number(c.verses));
    const chapterStarts = [];
    const start = verseIndex;

    for (let chapterNumber = 1; chapterNumber <= chapters.length; chapterNumber += 1) {
      const verseCount = chapters[chapterNumber - 1];
      chapterStarts.push(verseIndex);

      for (let verseNumber = 1; verseNumber <= verseCount; verseNumber += 1) {
        const ref = `${abbr}.${chapterNumber}.${verseNumber}`;
        refToIndex.set(ref, verseIndex);
        verseRefs.push(ref);
        verseIndex += 1;
      }
    }

    books.push({
      abbr,
      name,
      start,
      end: verseIndex - 1,
      chapters,
      chapterStarts,
    });
  }

  const totalVerses = verseRefs.length;
  const outgoingSets = Array.from({ length: totalVerses }, () => null);

  const crossReferencesRaw = await readFile(crossReferencesPath, "utf8");
  const lines = crossReferencesRaw.split(/\r?\n/);
  const sourceDate = parseDateFromHeader(lines[0] || "");

  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) {
      continue;
    }

    const [fromRef, toRef] = line.split("\t");
    if (!fromRef || !toRef) {
      continue;
    }

    const fromIndex = refToIndex.get(fromRef);
    if (fromIndex === undefined) {
      continue;
    }

    if (toRef.includes("-")) {
      const [startRef, endRef] = toRef.split("-");
      const startIndex = refToIndex.get(startRef);
      const endIndex = refToIndex.get(endRef);
      if (startIndex === undefined || endIndex === undefined) {
        continue;
      }

      const step = startIndex <= endIndex ? 1 : -1;
      for (let targetIndex = startIndex; targetIndex !== endIndex + step; targetIndex += step) {
        if (targetIndex === fromIndex) {
          continue;
        }

        let targetSet = outgoingSets[fromIndex];
        if (!targetSet) {
          targetSet = new Set();
          outgoingSets[fromIndex] = targetSet;
        }
        targetSet.add(targetIndex);
      }
      continue;
    }

    const toIndex = refToIndex.get(toRef);
    if (toIndex === undefined || toIndex === fromIndex) {
      continue;
    }

    let targetSet = outgoingSets[fromIndex];
    if (!targetSet) {
      targetSet = new Set();
      outgoingSets[fromIndex] = targetSet;
    }
    targetSet.add(toIndex);
  }

  const outgoingOffsets = [0];
  const outgoingTargets = [];

  for (let fromIndex = 0; fromIndex < totalVerses; fromIndex += 1) {
    const targetSet = outgoingSets[fromIndex];
    if (targetSet) {
      const targets = Array.from(targetSet).sort((a, b) => a - b);
      for (const targetIndex of targets) {
        outgoingTargets.push(targetIndex);
      }
    }
    outgoingOffsets.push(outgoingTargets.length);
  }

  await mkdir(dataDir, { recursive: true });
  const payload = {
    source: {
      dataset: "openbible-cross-references",
      updated: sourceDate,
      url: "https://www.openbible.info/labs/cross-references/",
    },
    totalVerses,
    verseRefs,
    books,
    outgoingOffsets,
    outgoingTargets,
  };

  await writeFile(outputPath, JSON.stringify(payload));

  console.log(`Built ${outputPath}`);
  console.log(`Total verses: ${totalVerses}`);
  console.log(`Total directed edges: ${outgoingTargets.length}`);
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
