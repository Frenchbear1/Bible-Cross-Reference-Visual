import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const graphDataPath = path.join(rootDir, "data", "visualization-data.json");
const verseOutputPath = path.join(rootDir, "data", "verse-composition-years.json");
const bookRangesJsonPath = path.join(rootDir, "data", "composition-book-ranges.json");
const bookRangesCsvPath = path.join(rootDir, "data", "composition-book-ranges.csv");

const WIKIPEDIA_DATING_URL = "https://en.wikipedia.org/wiki/Dating_the_Bible";
const BIBLE_ODYSSEY_URL = "https://www.bibleodyssey.org/articles/how-was-the-bible-written-and-transmitted/";
const THETORAH_URL = "https://www.thetorah.com/article/genesis-exodus-and-the-composition-of-the-torah";
const EARLY_CHRISTIAN_WRITINGS_URL = "https://www.earlychristianwritings.com/";
const BIBLEGATEWAY_URL = "https://www.biblegateway.com/";
const DEFAULT_PROFILE_ID = "critical";

const CRITICAL_BOOK_RANGES_BY_ABBR = {
  Gen: { startYear: -550, endYear: -400, confidence: "medium", note: "Post-exilic synthesis of Priestly and non-Priestly material." },
  Exod: { startYear: -700, endYear: -400, confidence: "low", note: "Composite anthology spanning multiple periods; final form post-exilic." },
  Lev: { startYear: -600, endYear: -400, confidence: "medium", note: "Predominantly Priestly, exilic or post-exilic." },
  Num: { startYear: -700, endYear: -400, confidence: "low", note: "Priestly redaction over older narrative strata." },
  Deut: { startYear: -700, endYear: -400, confidence: "medium", note: "Late monarchic law core with exilic and post-exilic expansions." },
  Josh: { startYear: -620, endYear: -500, confidence: "medium", note: "Part of the Deuteronomistic history with later editorial growth." },
  Judg: { startYear: -620, endYear: -500, confidence: "medium", note: "Part of the Deuteronomistic history with exilic shaping." },
  Ruth: { startYear: -500, endYear: -300, confidence: "medium", note: "Commonly dated to the Persian period." },
  "1Sam": { startYear: -620, endYear: -500, confidence: "medium", note: "Part of the Deuteronomistic history with exilic shaping." },
  "2Sam": { startYear: -620, endYear: -500, confidence: "medium", note: "Part of the Deuteronomistic history with exilic shaping." },
  "1Kgs": { startYear: -620, endYear: -500, confidence: "medium", note: "Part of the Deuteronomistic history with exilic shaping." },
  "2Kgs": { startYear: -620, endYear: -500, confidence: "medium", note: "Part of the Deuteronomistic history with exilic shaping." },
  "1Chr": { startYear: -400, endYear: -250, confidence: "medium", note: "Chronicles is commonly placed in the Persian or early Hellenistic era." },
  "2Chr": { startYear: -400, endYear: -250, confidence: "medium", note: "Chronicles is commonly placed in the Persian or early Hellenistic era." },
  Ezra: { startYear: -350, endYear: -200, confidence: "medium", note: "Final form often placed in the late Persian to Ptolemaic period." },
  Neh: { startYear: -350, endYear: -200, confidence: "medium", note: "Final form often placed in the late Persian to Ptolemaic period." },
  Esth: { startYear: -400, endYear: -250, confidence: "medium", note: "Often dated to the 4th or 3rd century BCE." },
  Job: { startYear: -600, endYear: -400, confidence: "medium", note: "Commonly dated between the 6th and 4th centuries BCE." },
  Ps: { startYear: -1000, endYear: -100, confidence: "low", note: "Layered anthology with long transmission and expansion history." },
  Prov: { startYear: -900, endYear: -300, confidence: "low", note: "Collection of collections assembled over many centuries." },
  Eccl: { startYear: -450, endYear: -180, confidence: "high", note: "Usually dated between Persian and early Hellenistic periods." },
  Song: { startYear: -500, endYear: -200, confidence: "low", note: "Often placed in the post-exilic period, with broad uncertainty." },
  Isa: { startYear: -740, endYear: -500, confidence: "medium", note: "Composite work spanning Proto-, Deutero-, and Trito-Isaiah layers." },
  Jer: { startYear: -650, endYear: -200, confidence: "low", note: "Core prophetic material with major editorial development and textual recensions." },
  Lam: { startYear: -586, endYear: -500, confidence: "medium", note: "Usually tied to the destruction of Jerusalem and early exilic aftermath." },
  Ezek: { startYear: -593, endYear: -500, confidence: "medium", note: "Vision core dates to exile; later school additions likely present." },
  Dan: { startYear: -167, endYear: -164, confidence: "high", note: "Widely dated to the Maccabean period." },
  Hos: { startYear: -750, endYear: -700, confidence: "medium", note: "Core prophetic tradition in the late 8th century BCE." },
  Joel: { startYear: -400, endYear: -200, confidence: "low", note: "Usually dated to late Persian or Hellenistic period." },
  Amos: { startYear: -760, endYear: -730, confidence: "medium", note: "Core prophetic tradition in the first half of the 8th century BCE." },
  Obad: { startYear: -600, endYear: -550, confidence: "medium", note: "Often linked to the aftermath of Jerusalem's fall." },
  Jonah: { startYear: -500, endYear: -200, confidence: "low", note: "Usually dated to Persian or Hellenistic period." },
  Mic: { startYear: -750, endYear: -700, confidence: "medium", note: "Often placed in the late 8th century BCE." },
  Nah: { startYear: -650, endYear: -612, confidence: "medium", note: "Likely before Nineveh's destruction in 612 BCE." },
  Hab: { startYear: -620, endYear: -600, confidence: "medium", note: "Often placed shortly before the Battle of Carchemish." },
  Zeph: { startYear: -640, endYear: -609, confidence: "medium", note: "Usually linked to the reign of Josiah." },
  Hag: { startYear: -520, endYear: -515, confidence: "high", note: "Self-dated to early Persian period under Darius I." },
  Zech: { startYear: -520, endYear: -300, confidence: "medium", note: "Early chapters Persian; later chapters often dated later." },
  Mal: { startYear: -500, endYear: -430, confidence: "medium", note: "Usually placed in the 5th century BCE." },
  Matt: { startYear: 80, endYear: 90, confidence: "high", note: "Commonly dated after Mark and after the destruction of the Temple." },
  Mark: { startYear: 65, endYear: 73, confidence: "high", note: "Commonly dated around the First Jewish-Roman War period." },
  Luke: { startYear: 80, endYear: 90, confidence: "high", note: "Usually dated a generation after Jesus tradition and after Mark." },
  John: { startYear: 90, endYear: 100, confidence: "high", note: "Commonly placed at the end of the 1st century CE." },
  Acts: { startYear: 80, endYear: 90, confidence: "medium", note: "Often aligned with Luke's dating, with ongoing debate." },
  Rom: { startYear: 57, endYear: 58, confidence: "high", note: "Undisputed Pauline letter." },
  "1Cor": { startYear: 53, endYear: 57, confidence: "high", note: "Undisputed Pauline letter." },
  "2Cor": { startYear: 55, endYear: 58, confidence: "high", note: "Undisputed Pauline letter." },
  Gal: { startYear: 48, endYear: 55, confidence: "high", note: "Undisputed Pauline letter; date depends on North/South Galatia model." },
  Eph: { startYear: 80, endYear: 90, confidence: "medium", note: "Often considered deutero-Pauline and dated after Paul." },
  Phil: { startYear: 54, endYear: 55, confidence: "high", note: "Undisputed Pauline letter, often linked to imprisonment." },
  Col: { startYear: 62, endYear: 90, confidence: "medium", note: "Range reflects disputed Pauline authorship." },
  "1Thess": { startYear: 51, endYear: 51, confidence: "high", note: "Among the earliest undisputed Pauline letters." },
  "2Thess": { startYear: 51, endYear: 90, confidence: "low", note: "Range reflects dispute between Pauline and later authorship." },
  "1Tim": { startYear: 100, endYear: 100, confidence: "medium", note: "Pastoral epistle usually dated to early 2nd century CE." },
  "2Tim": { startYear: 100, endYear: 100, confidence: "medium", note: "Pastoral epistle usually dated to early 2nd century CE." },
  Titus: { startYear: 100, endYear: 100, confidence: "medium", note: "Pastoral epistle usually dated to early 2nd century CE." },
  Phlm: { startYear: 54, endYear: 55, confidence: "high", note: "Undisputed Pauline letter." },
  Heb: { startYear: 80, endYear: 90, confidence: "medium", note: "Generally non-Pauline; often dated late 1st century CE." },
  Jas: { startYear: 65, endYear: 85, confidence: "medium", note: "Broad late 1st century range in critical scholarship." },
  "1Pet": { startYear: 75, endYear: 90, confidence: "medium", note: "Often dated in the late 1st century CE." },
  "2Pet": { startYear: 110, endYear: 110, confidence: "high", note: "Commonly considered the latest New Testament writing." },
  "1John": { startYear: 90, endYear: 110, confidence: "medium", note: "Usually dated around the turn of the 2nd century CE." },
  "2John": { startYear: 90, endYear: 110, confidence: "medium", note: "Usually dated around the turn of the 2nd century CE." },
  "3John": { startYear: 90, endYear: 110, confidence: "medium", note: "Usually dated around the turn of the 2nd century CE." },
  Jude: { startYear: 65, endYear: 100, confidence: "low", note: "Date uncertain; generally before 2 Peter." },
  Rev: { startYear: 95, endYear: 95, confidence: "high", note: "Commonly associated with Domitian's reign." },
};

const TRADITIONAL_BOOK_RANGES_BY_ABBR = {
  Gen: { startYear: -1500, endYear: -1400, confidence: "low", note: "Traditional Mosaic authorship window." },
  Exod: { startYear: -1500, endYear: -1400, confidence: "low", note: "Traditional Mosaic authorship window." },
  Lev: { startYear: -1500, endYear: -1400, confidence: "low", note: "Traditional Mosaic authorship window." },
  Num: { startYear: -1500, endYear: -1400, confidence: "low", note: "Traditional Mosaic authorship window." },
  Deut: { startYear: -1500, endYear: -1400, confidence: "low", note: "Traditional Mosaic authorship window." },
  Josh: { startYear: -1400, endYear: -1300, confidence: "low", note: "Traditional attribution to Joshua with later updates." },
  Judg: { startYear: -1100, endYear: -1000, confidence: "low", note: "Traditional attribution to Samuel-era compilation." },
  Ruth: { startYear: -1050, endYear: -1000, confidence: "low", note: "Traditionally linked to early monarchy context." },
  "1Sam": { startYear: -1000, endYear: -930, confidence: "low", note: "Traditional attribution to Samuel/Gad/Nathan tradition." },
  "2Sam": { startYear: -980, endYear: -920, confidence: "low", note: "Traditional attribution to Samuel/Gad/Nathan tradition." },
  "1Kgs": { startYear: -970, endYear: -560, confidence: "low", note: "Traditionally linked to prophetic historiography." },
  "2Kgs": { startYear: -970, endYear: -560, confidence: "low", note: "Traditionally linked to prophetic historiography." },
  "1Chr": { startYear: -500, endYear: -430, confidence: "medium", note: "Traditionally attributed to Ezra." },
  "2Chr": { startYear: -500, endYear: -430, confidence: "medium", note: "Traditionally attributed to Ezra." },
  Ezra: { startYear: -460, endYear: -430, confidence: "medium", note: "Traditionally linked to Ezra's own period." },
  Neh: { startYear: -445, endYear: -430, confidence: "medium", note: "Traditionally linked to Nehemiah's memoirs." },
  Esth: { startYear: -470, endYear: -460, confidence: "low", note: "Traditional Persian-era placement shortly after events." },
  Job: { startYear: -1500, endYear: -1400, confidence: "low", note: "Traditional patriarchal-era setting/authorship view." },
  Ps: { startYear: -1000, endYear: -400, confidence: "low", note: "Traditional Davidic-centered anthology with later additions." },
  Prov: { startYear: -950, endYear: -700, confidence: "low", note: "Traditional Solomonic core with later editorial collection." },
  Eccl: { startYear: -950, endYear: -930, confidence: "low", note: "Traditional Solomonic attribution." },
  Song: { startYear: -950, endYear: -930, confidence: "low", note: "Traditional Solomonic attribution." },
  Isa: { startYear: -740, endYear: -680, confidence: "medium", note: "Traditional attribution centered on 8th-century Isaiah ministry." },
  Jer: { startYear: -627, endYear: -570, confidence: "medium", note: "Traditional attribution centered on Jeremiah's ministry years." },
  Lam: { startYear: -586, endYear: -580, confidence: "medium", note: "Traditional attribution to Jeremiah after Jerusalem's fall." },
  Ezek: { startYear: -593, endYear: -570, confidence: "medium", note: "Traditional attribution to Ezekiel in exile." },
  Dan: { startYear: -605, endYear: -530, confidence: "low", note: "Traditional 6th-century BCE Danielic setting." },
  Hos: { startYear: -755, endYear: -715, confidence: "medium", note: "Traditional dating to Hosea's prophetic ministry." },
  Joel: { startYear: -830, endYear: -750, confidence: "low", note: "Traditional early-monarchy dating option." },
  Amos: { startYear: -760, endYear: -750, confidence: "medium", note: "Traditional dating to Amos's prophetic ministry." },
  Obad: { startYear: -845, endYear: -840, confidence: "low", note: "Traditional early date associated with Edomite conflict." },
  Jonah: { startYear: -780, endYear: -760, confidence: "low", note: "Traditional dating to 8th-century prophetic context." },
  Mic: { startYear: -740, endYear: -700, confidence: "medium", note: "Traditional dating to Micah's prophetic ministry." },
  Nah: { startYear: -663, endYear: -612, confidence: "medium", note: "Traditional dating before Nineveh's fall." },
  Hab: { startYear: -620, endYear: -605, confidence: "medium", note: "Traditional late pre-exilic dating." },
  Zeph: { startYear: -640, endYear: -620, confidence: "medium", note: "Traditional Josianic-period dating." },
  Hag: { startYear: -520, endYear: -515, confidence: "high", note: "Self-dated Persian-period prophecy." },
  Zech: { startYear: -520, endYear: -480, confidence: "medium", note: "Traditional Persian-period dating." },
  Mal: { startYear: -460, endYear: -430, confidence: "medium", note: "Traditional post-exilic prophetic dating." },
  Matt: { startYear: 50, endYear: 70, confidence: "low", note: "Traditional early Gospel dating." },
  Mark: { startYear: 55, endYear: 68, confidence: "medium", note: "Traditional pre-70 CE Gospel dating." },
  Luke: { startYear: 58, endYear: 63, confidence: "low", note: "Traditional Lukan dating before Acts-era close." },
  John: { startYear: 80, endYear: 95, confidence: "medium", note: "Traditional late-1st-century Johannine dating." },
  Acts: { startYear: 62, endYear: 64, confidence: "low", note: "Traditional dating before Paul's death." },
  Rom: { startYear: 57, endYear: 58, confidence: "high", note: "Traditional Pauline dating." },
  "1Cor": { startYear: 53, endYear: 55, confidence: "high", note: "Traditional Pauline dating." },
  "2Cor": { startYear: 55, endYear: 57, confidence: "high", note: "Traditional Pauline dating." },
  Gal: { startYear: 48, endYear: 50, confidence: "medium", note: "Traditional Pauline dating." },
  Eph: { startYear: 60, endYear: 62, confidence: "low", note: "Traditional Pauline prison-epistle dating." },
  Phil: { startYear: 60, endYear: 62, confidence: "high", note: "Traditional Pauline prison-epistle dating." },
  Col: { startYear: 60, endYear: 62, confidence: "low", note: "Traditional Pauline prison-epistle dating." },
  "1Thess": { startYear: 50, endYear: 51, confidence: "high", note: "Traditional Pauline dating." },
  "2Thess": { startYear: 51, endYear: 52, confidence: "low", note: "Traditional Pauline dating." },
  "1Tim": { startYear: 63, endYear: 65, confidence: "low", note: "Traditional Pauline pastoral dating." },
  "2Tim": { startYear: 66, endYear: 67, confidence: "low", note: "Traditional Pauline pastoral dating." },
  Titus: { startYear: 63, endYear: 65, confidence: "low", note: "Traditional Pauline pastoral dating." },
  Phlm: { startYear: 60, endYear: 62, confidence: "high", note: "Traditional Pauline prison-epistle dating." },
  Heb: { startYear: 64, endYear: 70, confidence: "low", note: "Traditional pre-70 CE dating." },
  Jas: { startYear: 45, endYear: 62, confidence: "low", note: "Traditional early church dating." },
  "1Pet": { startYear: 62, endYear: 64, confidence: "low", note: "Traditional Petrine dating." },
  "2Pet": { startYear: 64, endYear: 67, confidence: "low", note: "Traditional Petrine dating." },
  "1John": { startYear: 85, endYear: 95, confidence: "medium", note: "Traditional late-1st-century Johannine dating." },
  "2John": { startYear: 85, endYear: 95, confidence: "medium", note: "Traditional late-1st-century Johannine dating." },
  "3John": { startYear: 85, endYear: 95, confidence: "medium", note: "Traditional late-1st-century Johannine dating." },
  Jude: { startYear: 65, endYear: 80, confidence: "low", note: "Traditional late-1st-century dating." },
  Rev: { startYear: 90, endYear: 96, confidence: "medium", note: "Traditional Domitian-era dating." },
};

const EARLIEST_LAYER_OVERRIDES_BY_ABBR = {
  Gen: { startYear: -1500, endYear: -1200, confidence: "low", note: "Earliest pre-monarchic narrative and poetic traditions (highly conjectural)." },
  Exod: { startYear: -1500, endYear: -1200, confidence: "low", note: "Earliest exodus traditions before later compositional shaping." },
  Lev: { startYear: -1200, endYear: -900, confidence: "low", note: "Earliest priestly legal traditions before final compilation." },
  Num: { startYear: -1400, endYear: -1000, confidence: "low", note: "Earliest wilderness traditions before later Priestly redaction." },
  Deut: { startYear: -750, endYear: -620, confidence: "medium", note: "Earliest Deuteronomic law core before exilic expansions." },
  Josh: { startYear: -1200, endYear: -900, confidence: "low", note: "Earliest conquest/settlement traditions before Deuteronomistic editing." },
  Judg: { startYear: -1200, endYear: -900, confidence: "low", note: "Earliest tribal traditions before Deuteronomistic editing." },
  "1Sam": { startYear: -1050, endYear: -900, confidence: "low", note: "Earliest monarchic court and prophetic traditions." },
  "2Sam": { startYear: -1000, endYear: -850, confidence: "low", note: "Earliest monarchic court traditions." },
  "1Kgs": { startYear: -970, endYear: -800, confidence: "low", note: "Earliest royal annal traditions before final Deuteronomistic shaping." },
  "2Kgs": { startYear: -900, endYear: -700, confidence: "low", note: "Earliest royal annal traditions before final Deuteronomistic shaping." },
  Job: { startYear: -1800, endYear: -1200, confidence: "low", note: "Possible early wisdom/poetic core traditions (highly uncertain)." },
  Ps: { startYear: -1200, endYear: -500, confidence: "low", note: "Earliest poetic strata (including archaic hymnic material)." },
  Prov: { startYear: -1000, endYear: -600, confidence: "low", note: "Earliest wisdom collections before later anthology growth." },
  Isa: { startYear: -740, endYear: -700, confidence: "medium", note: "Earliest Proto-Isaiah layer." },
  Jer: { startYear: -627, endYear: -580, confidence: "medium", note: "Earliest Jeremianic prophetic core." },
  Ezek: { startYear: -593, endYear: -571, confidence: "medium", note: "Earliest Ezekiel visionary core." },
  Dan: { startYear: -550, endYear: -165, confidence: "low", note: "Earliest court-tale layer may predate apocalyptic final form." },
  Matt: { startYear: 35, endYear: 70, confidence: "low", note: "Earliest Jesus tradition strata behind Matthew." },
  Mark: { startYear: 35, endYear: 70, confidence: "low", note: "Earliest Jesus tradition strata behind Mark." },
  Luke: { startYear: 35, endYear: 80, confidence: "low", note: "Earliest Jesus tradition strata behind Luke." },
  John: { startYear: 50, endYear: 95, confidence: "low", note: "Earliest Johannine tradition layers." },
  Acts: { startYear: 35, endYear: 80, confidence: "low", note: "Earliest Lukan source strata behind Acts." },
  Heb: { startYear: 60, endYear: 80, confidence: "low", note: "Earliest sermonic/epistolary layer estimate." },
  Jas: { startYear: 40, endYear: 70, confidence: "low", note: "Earliest paraenetic tradition layer estimate." },
  Rev: { startYear: 68, endYear: 95, confidence: "low", note: "Earliest apocalyptic layer estimate before final publication." },
};

const COMPOSITION_PROFILE_DEFINITIONS = [
  {
    id: "critical",
    label: "Critical",
    framework: "Final-form critical",
    description: "Final-form/redaction-era ranges used in modern critical scholarship.",
    source: {
      dataset: "critical-composition-synthesis",
      method: "Book-level final-form composition ranges mapped to all verses in each book. sortYear = midpoint(startYear, endYear).",
      sources: [
        { name: "Wikipedia: Dating the Bible", url: WIKIPEDIA_DATING_URL },
        { name: "SBL Bible Odyssey overview", url: BIBLE_ODYSSEY_URL },
        { name: "TheTorah (Torah composition case study)", url: THETORAH_URL },
        { name: "Early Christian Writings (NT date references)", url: EARLY_CHRISTIAN_WRITINGS_URL },
      ],
    },
    rangesByAbbr: CRITICAL_BOOK_RANGES_BY_ABBR,
  },
  {
    id: "traditional",
    label: "Traditional",
    framework: "Traditional/conservative",
    description: "Traditional authorship-oriented ranges used for conservative timeline views.",
    source: {
      dataset: "traditional-authorship-synthesis",
      method: "Traditional/conservative book-level authorship windows mapped to all verses in each book. sortYear = midpoint(startYear, endYear).",
      sources: [
        { name: "BibleGateway", url: BIBLEGATEWAY_URL },
        { name: "Wikipedia: Dating the Bible", url: WIKIPEDIA_DATING_URL },
      ],
    },
    rangesByAbbr: TRADITIONAL_BOOK_RANGES_BY_ABBR,
  },
  {
    id: "earliest-layer",
    label: "Earliest Layer",
    framework: "Earliest recoverable strata",
    description: "Earliest plausible literary layer ranges (coarse, profile-level estimates).",
    source: {
      dataset: "earliest-layer-synthesis",
      method: "Earliest-layer windows mapped to all verses in each book for comparative ordering only. sortYear = midpoint(startYear, endYear).",
      sources: [
        { name: "Wikipedia: Dating the Bible", url: WIKIPEDIA_DATING_URL },
        { name: "SBL Bible Odyssey overview", url: BIBLE_ODYSSEY_URL },
        { name: "TheTorah (Torah composition case study)", url: THETORAH_URL },
      ],
    },
    rangesByAbbr: null,
  },
];

function midpointYear(startYear, endYear) {
  return Math.round((startYear + endYear) / 2);
}

function formatYearForCsv(yearValue) {
  if (yearValue < 0) {
    return `${Math.abs(yearValue)} BCE`;
  }
  if (yearValue > 0) {
    return `${yearValue} CE`;
  }
  return "0";
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function buildEarliestLayerRanges(baseRangesByAbbr) {
  const rangesByAbbr = {};

  for (const [abbr, rawRange] of Object.entries(baseRangesByAbbr)) {
    const startYear = Math.trunc(Number(rawRange.startYear));
    const endYear = Math.trunc(Number(rawRange.endYear));
    const normalizedStart = Math.min(startYear, endYear);
    const normalizedEnd = Math.max(startYear, endYear);
    const span = Math.max(1, normalizedEnd - normalizedStart);
    const earlyWindow = Math.max(20, Math.round(span * 0.35));
    const earliestEnd = Math.min(normalizedEnd, normalizedStart + earlyWindow);

    rangesByAbbr[abbr] = {
      startYear: normalizedStart,
      endYear: earliestEnd,
      confidence: "low",
      note: "Earliest recoverable layer estimate (coarse, profile-level).",
    };
  }

  for (const [abbr, override] of Object.entries(EARLIEST_LAYER_OVERRIDES_BY_ABBR)) {
    rangesByAbbr[abbr] = {
      ...(rangesByAbbr[abbr] ?? {}),
      ...override,
    };
  }

  return rangesByAbbr;
}

COMPOSITION_PROFILE_DEFINITIONS.find((profile) => profile.id === "earliest-layer").rangesByAbbr = buildEarliestLayerRanges(CRITICAL_BOOK_RANGES_BY_ABBR);

function validateProfileCoverage(profileId, rangesByAbbr, books) {
  const missingAbbrs = books
    .map((book) => book.abbr)
    .filter((abbr) => !rangesByAbbr[abbr]);
  if (missingAbbrs.length > 0) {
    throw new Error(`Profile "${profileId}" missing composition range entries for: ${missingAbbrs.join(", ")}`);
  }

  const unusedAbbrs = Object.keys(rangesByAbbr)
    .filter((abbr) => !books.some((book) => book.abbr === abbr));
  if (unusedAbbrs.length > 0) {
    throw new Error(`Profile "${profileId}" has unused composition range entries: ${unusedAbbrs.join(", ")}`);
  }
}

function normalizeRange(rawRange, profileId, abbr) {
  const startYear = Math.trunc(Number(rawRange.startYear));
  const endYear = Math.trunc(Number(rawRange.endYear));
  if (!Number.isFinite(startYear) || !Number.isFinite(endYear)) {
    throw new Error(`Invalid year range for ${abbr} in profile "${profileId}"`);
  }

  return {
    startYear: Math.min(startYear, endYear),
    endYear: Math.max(startYear, endYear),
    confidence: typeof rawRange.confidence === "string" ? rawRange.confidence : "low",
    note: typeof rawRange.note === "string" ? rawRange.note : "",
  };
}

function buildProfilePayload(profileDefinition, graphData) {
  const { id, rangesByAbbr } = profileDefinition;
  validateProfileCoverage(id, rangesByAbbr, graphData.books);

  const bookRanges = graphData.books.map((book, canonicalBookIndex) => {
    const normalized = normalizeRange(rangesByAbbr[book.abbr], id, book.abbr);
    return {
      abbr: book.abbr,
      book: book.name,
      canonicalBookIndex,
      startYear: normalized.startYear,
      endYear: normalized.endYear,
      sortYear: midpointYear(normalized.startYear, normalized.endYear),
      confidence: normalized.confidence,
      note: normalized.note,
    };
  });

  const years = new Array(graphData.totalVerses).fill(null);
  const rangeByAbbr = new Map(bookRanges.map((record) => [record.abbr, record]));
  for (const book of graphData.books) {
    const range = rangeByAbbr.get(book.abbr);
    if (!range) {
      throw new Error(`Internal error: missing mapped range for ${book.abbr} in profile "${id}"`);
    }
    for (let verseIndex = book.start; verseIndex <= book.end; verseIndex += 1) {
      years[verseIndex] = range.sortYear;
    }
  }

  const datedVerses = years.reduce((count, year) => (Number.isFinite(year) ? count + 1 : count), 0);
  return {
    id: profileDefinition.id,
    label: profileDefinition.label,
    framework: profileDefinition.framework,
    description: profileDefinition.description,
    source: profileDefinition.source,
    datedVerses,
    coverage: Number((datedVerses / graphData.totalVerses).toFixed(6)),
    bookRanges,
    years,
  };
}

function buildCsv(bookRanges) {
  const csvHeader = [
    "canonical_index",
    "abbr",
    "book",
    "start_year",
    "end_year",
    "sort_year",
    "start_label",
    "end_label",
    "sort_label",
    "confidence",
    "note",
  ];
  const csvLines = [csvHeader.join(",")];
  for (const book of bookRanges) {
    const row = [
      book.canonicalBookIndex + 1,
      book.abbr,
      book.book,
      book.startYear,
      book.endYear,
      book.sortYear,
      formatYearForCsv(book.startYear),
      formatYearForCsv(book.endYear),
      formatYearForCsv(book.sortYear),
      book.confidence,
      book.note,
    ];
    csvLines.push(row.map(csvEscape).join(","));
  }
  return `${csvLines.join("\n")}\n`;
}

async function build() {
  const graphRaw = await readFile(graphDataPath, "utf8");
  const graphData = JSON.parse(graphRaw);
  if (!Array.isArray(graphData.books) || !Array.isArray(graphData.verseRefs)) {
    throw new Error("visualization-data.json missing books or verseRefs arrays");
  }

  const profilePayloads = COMPOSITION_PROFILE_DEFINITIONS.map((profileDefinition) => buildProfilePayload(profileDefinition, graphData));
  const profileOrder = profilePayloads.map((profile) => profile.id);
  const profileById = Object.fromEntries(profilePayloads.map((profile) => [profile.id, profile]));
  const defaultProfileId = profileById[DEFAULT_PROFILE_ID] ? DEFAULT_PROFILE_ID : profileOrder[0];
  const defaultProfile = profileById[defaultProfileId];

  const generatedAt = new Date().toISOString();
  const versePayload = {
    source: {
      dataset: "composition-profile-synthesis",
      method: "Multiple book-level composition profiles mapped to all verses in each book. sortYear = midpoint(startYear, endYear).",
    },
    generatedAt,
    totalVerses: graphData.totalVerses,
    defaultProfile: defaultProfileId,
    profileOrder,
    profiles: profileById,
    // Backward-compatible legacy fields:
    datedVerses: defaultProfile.datedVerses,
    coverage: defaultProfile.coverage,
    bookRanges: defaultProfile.bookRanges,
    years: defaultProfile.years,
  };
  await writeFile(verseOutputPath, JSON.stringify(versePayload));

  const bookRangesProfiles = {};
  for (const profile of profilePayloads) {
    bookRangesProfiles[profile.id] = {
      id: profile.id,
      label: profile.label,
      framework: profile.framework,
      description: profile.description,
      source: profile.source,
      datedVerses: profile.datedVerses,
      coverage: profile.coverage,
      books: profile.bookRanges,
    };
  }

  const bookRangesPayload = {
    source: versePayload.source,
    generatedAt,
    defaultProfile: defaultProfileId,
    profileOrder,
    profiles: bookRangesProfiles,
    // Backward-compatible legacy field:
    books: defaultProfile.bookRanges,
  };
  await writeFile(bookRangesJsonPath, JSON.stringify(bookRangesPayload, null, 2));

  for (const profile of profilePayloads) {
    const profileCsvPath = path.join(rootDir, "data", `composition-book-ranges-${profile.id}.csv`);
    const csvBody = buildCsv(profile.bookRanges);
    await writeFile(profileCsvPath, csvBody);
    if (profile.id === defaultProfileId) {
      await writeFile(bookRangesCsvPath, csvBody);
    }
  }

  console.log(`Built ${verseOutputPath}`);
  console.log(`Built ${bookRangesJsonPath}`);
  console.log(`Built ${bookRangesCsvPath}`);
  for (const profileId of profileOrder) {
    console.log(`Built ${path.join(rootDir, "data", `composition-book-ranges-${profileId}.csv`)}`);
  }
  console.log(`Total verses: ${graphData.totalVerses}`);
  for (const profileId of profileOrder) {
    const profile = profileById[profileId];
    console.log(`Profile ${profileId}: ${profile.datedVerses} dated verses`);
  }
}

build().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
