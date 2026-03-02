const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");
const loadingEl = document.getElementById("loading");
const verseInputEl = document.getElementById("verse-input");
const showAllBtnEl = document.getElementById("show-all-btn");
const resetZoomBtnEl = document.getElementById("reset-zoom-btn");
const goBtnEl = document.getElementById("go-btn");
const randomBtnEl = document.getElementById("random-btn");
const filterToggleBtnEl = document.getElementById("filter-toggle-btn");
const themeToggleBtnEl = document.getElementById("theme-toggle-btn");
const filterRowEl = document.getElementById("filter-row");
const filterTestamentEl = document.getElementById("filter-testament");
const filterBookEl = document.getElementById("filter-book");
const filterChapterEl = document.getElementById("filter-chapter");
const filterScopeEl = document.getElementById("filter-scope");
const clearFiltersBtnEl = document.getElementById("clear-filters-btn");
const sliderEl = document.getElementById("verse-slider");
const selectedLineEl = document.getElementById("selected-line");
const referenceLineEl = document.getElementById("reference-line");
const targetListEl = document.getElementById("target-list");
const selectedVerseTextEl = document.getElementById("selected-verse-text");
const sourceLineEl = document.getElementById("source-line");

const state = {
  data: null,
  refToIndex: null,
  verseToBookIndex: null,
  verseToChapterId: null,
  chapterBands: null,
  bookHues: null,
  bookAliasMap: null,
  bookNameByAbbr: null,
  kjvVerses: null,
  filters: {
    targetTestament: "all",
    targetBook: "all",
    targetChapter: "all",
    scope: "all",
  },
  hasActiveFilters: false,
  filterPanelOpen: false,
  chapterLabelById: null,
  selectedIndex: 0,
  hoverIndex: null,
  mode: "all",
  singlePinned: false,
  colorTheme: "sepia",
  viewStart: 0,
  viewEnd: 0,
  renderQueued: false,
  layout: null,
};

const THEME_ORDER = ["sepia", "white", "dark"];

const THEME_STYLES = {
  sepia: {
    buttonLabel: "Theme: Sepia",
    backgroundTop: "rgba(255, 253, 247, 1)",
    backgroundBottom: "rgba(240, 233, 219, 1)",
    chapterBandAlpha: 0.35,
    axisStroke: "rgba(36, 28, 19, 0.36)",
    bookStroke: "rgba(32, 24, 16, 0.5)",
    bookLabel: "rgba(39, 30, 22, 0.75)",
    selectionLine: "rgba(24, 18, 12, 0.7)",
    selectionDotLightness: 34,
    allArcInnerLightness: 31,
    allArcOuterLightness: 69,
    selectedArcInnerLightness: 35,
    selectedArcOuterLightness: 72,
    allArcInnerAlpha: 0.07,
    allArcOuterAlpha: 0.03,
  },
  white: {
    buttonLabel: "Theme: White",
    backgroundTop: "rgba(255, 255, 255, 1)",
    backgroundBottom: "rgba(246, 247, 249, 1)",
    chapterBandAlpha: 0.33,
    axisStroke: "rgba(39, 42, 47, 0.42)",
    bookStroke: "rgba(34, 39, 45, 0.54)",
    bookLabel: "rgba(28, 34, 40, 0.8)",
    selectionLine: "rgba(28, 33, 40, 0.76)",
    selectionDotLightness: 31,
    allArcInnerLightness: 28,
    allArcOuterLightness: 63,
    selectedArcInnerLightness: 33,
    selectedArcOuterLightness: 67,
    allArcInnerAlpha: 0.076,
    allArcOuterAlpha: 0.04,
  },
  dark: {
    buttonLabel: "Theme: Dark",
    backgroundTop: "rgba(25, 30, 37, 1)",
    backgroundBottom: "rgba(13, 16, 21, 1)",
    chapterBandAlpha: 0.44,
    axisStroke: "rgba(236, 241, 248, 0.56)",
    bookStroke: "rgba(226, 234, 243, 0.5)",
    bookLabel: "rgba(241, 246, 252, 0.88)",
    selectionLine: "rgba(247, 250, 255, 0.78)",
    selectionDotLightness: 68,
    allArcInnerLightness: 64,
    allArcOuterLightness: 84,
    selectedArcInnerLightness: 67,
    selectedArcOuterLightness: 86,
    allArcInnerAlpha: 0.16,
    allArcOuterAlpha: 0.085,
  },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function formatRef(ref) {
  const [book, chapter, verse] = ref.split(".");
  const bookName = state.bookNameByAbbr?.get(book) ?? book;
  return `${bookName} ${chapter}:${verse}`;
}

function formatInputRef(ref) {
  const [bookAbbr, chapterRaw, verseRaw] = ref.split(".");
  const bookName = state.bookNameByAbbr?.get(bookAbbr) ?? bookAbbr;
  const chapter = String(Number(chapterRaw));
  const verse = String(Number(verseRaw));
  return `${bookName} ${chapter}:${verse}`;
}

function normalizeBookKey(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function buildBookAliasMap(books) {
  const aliases = new Map();
  for (const book of books) {
    aliases.set(normalizeBookKey(book.abbr), book.abbr);
    aliases.set(normalizeBookKey(book.name), book.abbr);
  }

  aliases.set("psalm", "Ps");
  aliases.set("psalms", "Ps");
  aliases.set("songofsolomon", "Song");
  aliases.set("songofsongs", "Song");
  aliases.set("canticles", "Song");
  aliases.set("revelation", "Rev");
  aliases.set("revelations", "Rev");

  return aliases;
}

function parseVerseInput(value) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  let match = trimmed.match(/^([1-3]?\s*[A-Za-z]+)\.(\d+)\.(\d+)$/);
  if (match) {
    const bookPart = normalizeBookKey(match[1]);
    const bookAbbr = state.bookAliasMap.get(bookPart);
    if (!bookAbbr) {
      return null;
    }
    const canonical = `${bookAbbr}.${Number(match[2])}.${Number(match[3])}`;
    return state.refToIndex.get(canonical) ?? null;
  }

  match = trimmed.match(/^(.+?)\s+(\d+)\s*[:.]\s*(\d+)$/);
  if (match) {
    const bookPart = normalizeBookKey(match[1]);
    const bookAbbr = state.bookAliasMap.get(bookPart);
    if (!bookAbbr) {
      return null;
    }
    const canonical = `${bookAbbr}.${Number(match[2])}.${Number(match[3])}`;
    return state.refToIndex.get(canonical) ?? null;
  }

  match = trimmed.match(/^(.+?)\s+(\d+)\s+(\d+)$/);
  if (match) {
    const bookPart = normalizeBookKey(match[1]);
    const bookAbbr = state.bookAliasMap.get(bookPart);
    if (!bookAbbr) {
      return null;
    }
    const canonical = `${bookAbbr}.${Number(match[2])}.${Number(match[3])}`;
    return state.refToIndex.get(canonical) ?? null;
  }

  return null;
}

function updateHasActiveFilters() {
  state.hasActiveFilters =
    state.filters.targetTestament !== "all"
    || state.filters.targetBook !== "all"
    || state.filters.targetChapter !== "all"
    || state.filters.scope !== "all";
}

function setFilterPanelOpen(nextOpen) {
  state.filterPanelOpen = Boolean(nextOpen);
  filterRowEl.classList.toggle("open", state.filterPanelOpen);
  filterRowEl.setAttribute("aria-hidden", state.filterPanelOpen ? "false" : "true");
  filterToggleBtnEl.setAttribute("aria-expanded", state.filterPanelOpen ? "true" : "false");
  filterToggleBtnEl.textContent = state.filterPanelOpen ? "Hide Filters" : "Filter";
}

function getThemeStyle() {
  return THEME_STYLES[state.colorTheme] ?? THEME_STYLES.sepia;
}

function applyColorTheme(themeName, { queue = true } = {}) {
  const nextTheme = THEME_STYLES[themeName] ? themeName : "sepia";
  state.colorTheme = nextTheme;
  document.body.setAttribute("data-theme", nextTheme);
  if (themeToggleBtnEl) {
    themeToggleBtnEl.textContent = getThemeStyle().buttonLabel;
  }
  if (queue) {
    queueRender();
  }
}

function cycleColorTheme() {
  const currentIndex = THEME_ORDER.indexOf(state.colorTheme);
  const nextIndex = currentIndex >= 0
    ? (currentIndex + 1) % THEME_ORDER.length
    : 0;
  applyColorTheme(THEME_ORDER[nextIndex]);
}

function describeActiveFilters() {
  if (!state.hasActiveFilters) {
    return "none";
  }

  const labels = [];
  if (state.filters.targetTestament === "ot") {
    labels.push("OT targets");
  } else if (state.filters.targetTestament === "nt") {
    labels.push("NT targets");
  }

  if (state.filters.targetBook !== "all") {
    const bookIndex = Number(state.filters.targetBook);
    const bookName = state.data?.books?.[bookIndex]?.name;
    labels.push(`book ${bookName ?? bookIndex + 1}`);
  }

  if (state.filters.targetChapter !== "all") {
    const chapterId = Number(state.filters.targetChapter);
    const chapterLabel = state.chapterLabelById?.get(chapterId);
    labels.push(`chapter ${chapterLabel ?? chapterId}`);
  }

  if (state.filters.scope === "book") {
    labels.push("same book");
  } else if (state.filters.scope === "chapter") {
    labels.push("same chapter");
  }

  return labels.join(", ");
}

function edgePassesFilters(fromIndex, targetIndex) {
  if (!state.hasActiveFilters) {
    return true;
  }

  const { targetTestament, targetBook, targetChapter, scope } = state.filters;

  if (targetTestament === "ot" && state.verseToBookIndex[targetIndex] >= 39) {
    return false;
  }
  if (targetTestament === "nt" && state.verseToBookIndex[targetIndex] < 39) {
    return false;
  }
  if (targetBook !== "all" && state.verseToBookIndex[targetIndex] !== Number(targetBook)) {
    return false;
  }
  if (targetChapter !== "all" && state.verseToChapterId[targetIndex] !== Number(targetChapter)) {
    return false;
  }

  if (scope === "book" && state.verseToBookIndex[fromIndex] !== state.verseToBookIndex[targetIndex]) {
    return false;
  }
  if (scope === "chapter" && state.verseToChapterId[fromIndex] !== state.verseToChapterId[targetIndex]) {
    return false;
  }

  return true;
}

function getFilteredOutgoingTargets(fromIndex) {
  const { outgoingOffsets, outgoingTargets } = state.data;
  const start = outgoingOffsets[fromIndex];
  const end = outgoingOffsets[fromIndex + 1];
  const filtered = [];
  for (let i = start; i < end; i += 1) {
    const targetIndex = outgoingTargets[i];
    if (edgePassesFilters(fromIndex, targetIndex)) {
      filtered.push(targetIndex);
    }
  }
  return filtered;
}

function buildCountAlignedLabel(label, count, labelWidth, countWidth) {
  const noBreakSpace = "\u00A0";
  const countText = count.toLocaleString();
  const paddedLabel = label + noBreakSpace.repeat(Math.max(0, labelWidth - label.length));
  const paddedCount = noBreakSpace.repeat(Math.max(0, countWidth - countText.length)) + countText;
  return `${paddedLabel}${noBreakSpace.repeat(2)}${paddedCount}`;
}

function sizeSelectToWidestOption(selectEl, extraChars = 3) {
  if (!selectEl || !selectEl.options?.length) {
    return;
  }
  let widest = 0;
  for (const option of selectEl.options) {
    const text = option.textContent ?? "";
    widest = Math.max(widest, text.length);
  }
  selectEl.style.width = `${widest + extraChars}ch`;
}

function sizeAllFilterSelects() {
  sizeSelectToWidestOption(filterTestamentEl);
  sizeSelectToWidestOption(filterBookEl);
  sizeSelectToWidestOption(filterChapterEl);
  sizeSelectToWidestOption(filterScopeEl);
}

function applyFiltersFromControls() {
  state.filters.targetTestament = filterTestamentEl.value;
  state.filters.targetBook = filterBookEl.value;
  state.filters.targetChapter = filterChapterEl.value;
  state.filters.scope = filterScopeEl.value;
  updateHasActiveFilters();
  updateInfoPanel();
  queueRender();
}

function clearFilters() {
  filterTestamentEl.value = "all";
  filterBookEl.value = "all";
  filterChapterEl.value = "all";
  filterScopeEl.value = "all";
  applyFiltersFromControls();
}

function queueRender() {
  if (state.renderQueued) {
    return;
  }
  state.renderQueued = true;
  requestAnimationFrame(() => {
    state.renderQueued = false;
    render();
  });
}

function setMode(mode) {
  if (state.mode === mode) {
    return;
  }
  state.mode = mode;
  if (mode === "all") {
    state.singlePinned = false;
  }
  showAllBtnEl.setAttribute("aria-pressed", mode === "all" ? "true" : "false");
  updateInfoPanel();
  queueRender();
}

function updateResetZoomControl() {
  if (!state.data) {
    return;
  }
  const zoomed = state.viewStart !== 0 || state.viewEnd !== state.data.totalVerses - 1;
  resetZoomBtnEl.classList.toggle("hidden", !zoomed);
  resetZoomBtnEl.disabled = !zoomed;
}

function buildLayout() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = Math.max(320, Math.floor(rect.width));
  const height = Math.max(500, Math.min(980, Math.floor(window.innerHeight * 0.82)));

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.height = `${height}px`;
  canvas.style.width = `${width}px`;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const left = 24;
  const right = 24;
  const top = 18;
  const bottom = 18;
  const axisWidth = width - left - right;
  const baselineY = Math.round(height * 0.5);
  const barsHeight = 14;
  const barsY = baselineY - Math.floor(barsHeight / 2);
  const totalVerses = state.data.totalVerses;
  const visibleCount = Math.max(1, state.viewEnd - state.viewStart + 1);

  state.layout = {
    width,
    height,
    left,
    right,
    top,
    bottom,
    axisWidth,
    baselineY,
    barsY,
    barsHeight,
    totalVerses,
    visibleCount,
    xCenterForVerse(index) {
      return left + ((index - state.viewStart) / (visibleCount - 1 || 1)) * axisWidth;
    },
    xEdgeForVerseBoundary(boundaryIndex) {
      return left + ((boundaryIndex - state.viewStart) / visibleCount) * axisWidth;
    },
  };
  updateResetZoomControl();
}

function verseIndexFromClientX(clientX) {
  const rect = canvas.getBoundingClientRect();
  const localX = clientX - rect.left;
  const { left, axisWidth } = state.layout;
  const normalized = (localX - left) / axisWidth;
  return clamp(
    state.viewStart + Math.round(normalized * (state.layout.visibleCount - 1)),
    state.viewStart,
    state.viewEnd,
  );
}

function resetView() {
  state.viewStart = 0;
  state.viewEnd = state.data.totalVerses - 1;
  buildLayout();
}

function setViewAroundAnchor(anchorIndex, nextVisibleCount) {
  const total = state.data.totalVerses;
  const clampedCount = clamp(Math.round(nextVisibleCount), 120, total);
  const ratio = clamp((anchorIndex - state.viewStart) / Math.max(1, state.layout.visibleCount - 1), 0, 1);

  let nextStart = Math.round(anchorIndex - ratio * (clampedCount - 1));
  let nextEnd = nextStart + clampedCount - 1;

  if (nextStart < 0) {
    nextStart = 0;
    nextEnd = clampedCount - 1;
  }
  if (nextEnd > total - 1) {
    nextEnd = total - 1;
    nextStart = nextEnd - clampedCount + 1;
  }

  state.viewStart = clamp(nextStart, 0, total - 1);
  state.viewEnd = clamp(nextEnd, 0, total - 1);
  buildLayout();
}

function ensureIndexVisible(index) {
  if (index >= state.viewStart && index <= state.viewEnd) {
    return;
  }
  const half = Math.floor(state.layout.visibleCount / 2);
  const targetStart = clamp(index - half, 0, state.data.totalVerses - state.layout.visibleCount);
  state.viewStart = targetStart;
  state.viewEnd = targetStart + state.layout.visibleCount - 1;
  buildLayout();
}

function setSelectedVerse(index, options = {}) {
  const { updateInput = true, activateSingle = true } = options;
  const bounded = clamp(index, 0, state.data.totalVerses - 1);
  if (bounded === state.selectedIndex && updateInput) {
    verseInputEl.value = formatInputRef(state.data.verseRefs[bounded]);
  }
  if (bounded === state.selectedIndex && !updateInput && (!activateSingle || state.mode === "single")) {
    return;
  }

  if (activateSingle) {
    state.mode = "single";
    state.singlePinned = false;
    showAllBtnEl.setAttribute("aria-pressed", "false");
  }

  state.selectedIndex = bounded;
  sliderEl.value = String(bounded + 1);

  if (state.layout) {
    ensureIndexVisible(bounded);
  }

  if (updateInput) {
    verseInputEl.value = formatInputRef(state.data.verseRefs[bounded]);
  }

  updateInfoPanel();
  queueRender();
}

function updateInfoPanel() {
  const { verseRefs, outgoingOffsets, outgoingTargets } = state.data;
  const filterSummary = describeActiveFilters();

  if (state.mode === "all") {
    const visible = state.layout ? state.layout.visibleCount : state.data.totalVerses;
    selectedLineEl.textContent = `Showing: All verse-to-verse arcs (${state.data.totalVerses.toLocaleString()} verses)`;
    referenceLineEl.textContent = `Total outgoing references: ${outgoingTargets.length.toLocaleString()} (readability sample). Wheel to zoom at cursor. Visible verses: ${visible.toLocaleString()}. Filters: ${filterSummary}.`;
    targetListEl.innerHTML = "";
    selectedVerseTextEl.textContent = "Click a verse or use search to view the exact KJV verse text here.";
    return;
  }

  const selectedRef = verseRefs[state.selectedIndex];
  const fromStart = outgoingOffsets[state.selectedIndex];
  const fromEnd = outgoingOffsets[state.selectedIndex + 1];
  const totalTargets = fromEnd - fromStart;
  const filteredTargets = state.hasActiveFilters ? getFilteredOutgoingTargets(state.selectedIndex) : null;
  const filteredCount = state.hasActiveFilters ? filteredTargets.length : totalTargets;
  const hoverState = state.singlePinned ? "frozen (click map to unfreeze)" : "live hover (click map to freeze)";

  selectedLineEl.textContent = `Selected: ${formatRef(selectedRef)} (${state.selectedIndex + 1}/${state.data.totalVerses})`;
  referenceLineEl.textContent = `Outgoing references: ${filteredCount.toLocaleString()} shown of ${totalTargets.toLocaleString()} | ${hoverState} | Filters: ${filterSummary}`;
  selectedVerseTextEl.textContent = state.kjvVerses?.[state.selectedIndex] || "KJV text unavailable for this verse.";

  targetListEl.innerHTML = "";
  const maxShown = 120;
  const shownCount = Math.min(maxShown, filteredCount);

  for (let i = 0; i < shownCount; i += 1) {
    const targetIndex = state.hasActiveFilters ? filteredTargets[i] : outgoingTargets[fromStart + i];
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = formatRef(verseRefs[targetIndex]);
    chip.addEventListener("click", () => {
      setSelectedVerse(targetIndex);
    });
    targetListEl.append(chip);
  }

  if (shownCount === 0 && state.hasActiveFilters) {
    const none = document.createElement("span");
    none.className = "chip";
    none.textContent = "No references match current filters";
    none.style.cursor = "default";
    targetListEl.append(none);
  }

  if (filteredCount > shownCount) {
    const more = document.createElement("span");
    more.className = "chip";
    more.textContent = `+${(filteredCount - shownCount).toLocaleString()} more`;
    more.style.cursor = "default";
    targetListEl.append(more);
  }
}

function getBookHue(index) {
  const base = (index * 31 + 18) % 360;
  return base;
}

function getArcHeightRatio(distanceRatio) {
  // Keep arc height monotonic with distance:
  // short hops stay low, long hops rise high with a consistent curvature profile.
  const eased = Math.pow(clamp(distanceRatio, 0, 1), 0.74);
  return clamp(0.04 + eased * 0.9, 0.04, 0.94);
}

function getVerseDistanceRatio(fromIndex, targetIndex) {
  const total = Math.max(1, state.data.totalVerses - 1);
  return clamp(Math.abs(targetIndex - fromIndex) / total, 0, 1);
}

function getArcLightness(distanceRatio, innerLightness = 34, outerLightness = 68) {
  // Tone ramps from darker inner arcs to lighter outer arcs.
  const eased = Math.pow(clamp(distanceRatio, 0, 1), 0.85);
  return innerLightness + (outerLightness - innerLightness) * eased;
}

function getArcAlpha(distanceRatio, innerAlpha = 0.08, outerAlpha = 0.03) {
  // Keep inner arcs visually heavier and outer arcs more airy.
  const eased = Math.pow(clamp(distanceRatio, 0, 1), 0.82);
  return innerAlpha + (outerAlpha - innerAlpha) * eased;
}

function getSparseVisibilityBoost(outgoingCount) {
  const clampedCount = Math.max(1, outgoingCount);
  return clamp(26 / (clampedCount + 26), 0.34, 1);
}

function drawBackground() {
  const { width, height } = state.layout;
  const theme = getThemeStyle();
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, theme.backgroundTop);
  gradient.addColorStop(1, theme.backgroundBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function drawChapterBands() {
  const { barsY, barsHeight, baselineY, xEdgeForVerseBoundary, left, right, width } = state.layout;
  const { books } = state.data;
  const viewStart = state.viewStart;
  const viewEnd = state.viewEnd;
  const theme = getThemeStyle();

  ctx.lineWidth = 1;
  ctx.setLineDash([]);

  for (const chapter of state.chapterBands) {
    if (chapter.end < viewStart || chapter.start > viewEnd) {
      continue;
    }
    const x1 = xEdgeForVerseBoundary(chapter.start);
    const x2 = xEdgeForVerseBoundary(chapter.end + 1);
    if (x2 < left || x1 > width - right) {
      continue;
    }
    const clampedX1 = clamp(x1, left, width - right);
    const clampedX2 = clamp(x2, left, width - right);
    const bandWidth = Math.max(1, clampedX2 - clampedX1);
    const hue = state.bookHues[chapter.bookIndex];
    const lightness = chapter.chapterIndex % 2 === 0 ? 46 : 56;
    ctx.fillStyle = `hsla(${hue}, 58%, ${lightness}%, ${theme.chapterBandAlpha})`;
    ctx.fillRect(clampedX1, barsY, bandWidth, barsHeight);
  }

  ctx.strokeStyle = theme.axisStroke;
  ctx.beginPath();
  ctx.moveTo(left, baselineY);
  ctx.lineTo(width - right, baselineY);
  ctx.stroke();

  ctx.font = "10px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let bookIndex = 0; bookIndex < books.length; bookIndex += 1) {
    const book = books[bookIndex];
    if (book.end < viewStart || book.start > viewEnd) {
      continue;
    }
    const x1 = xEdgeForVerseBoundary(book.start);
    const x2 = xEdgeForVerseBoundary(book.end + 1);
    const bookWidth = x2 - x1;

    ctx.strokeStyle = theme.bookStroke;
    ctx.beginPath();
    ctx.moveTo(x1, barsY - 4);
    ctx.lineTo(x1, barsY + barsHeight + 4);
    ctx.stroke();

    if (bookWidth > 18) {
      const fullLabel = book.name;
      const shortLabel = book.abbr;
      const maxLabelWidth = Math.max(0, bookWidth - 6);
      let chosenLabel = "";
      if (ctx.measureText(fullLabel).width <= maxLabelWidth) {
        chosenLabel = fullLabel;
      } else if (ctx.measureText(shortLabel).width <= maxLabelWidth) {
        chosenLabel = shortLabel;
      }
      if (chosenLabel) {
        ctx.fillStyle = theme.bookLabel;
        ctx.fillText(chosenLabel, (x1 + x2) * 0.5, barsY - 10);
      }
    }
  }
}

function drawAllReferenceArcs() {
  const { xCenterForVerse, baselineY, top, bottom, height } = state.layout;
  const { outgoingOffsets, outgoingTargets } = state.data;
  const viewStart = state.viewStart;
  const viewEnd = state.viewEnd;
  const maxArcUp = baselineY - top - 6;
  const maxArcDown = height - bottom - baselineY - 6;
  const theme = getThemeStyle();

  ctx.lineCap = "round";
  ctx.lineWidth = 0.55;

  for (let fromIndex = viewStart; fromIndex <= viewEnd; fromIndex += 1) {
    const start = outgoingOffsets[fromIndex];
    const end = outgoingOffsets[fromIndex + 1];
    if (start === end) {
      continue;
    }
    const sparseBoost = getSparseVisibilityBoost(end - start);

    const fromX = xCenterForVerse(fromIndex);
    const fromHue = state.bookHues[state.verseToBookIndex[fromIndex]];

    for (let i = start; i < end; i += 1) {
      const targetIndex = outgoingTargets[i];
      if (!edgePassesFilters(fromIndex, targetIndex)) {
        continue;
      }
      if (targetIndex < viewStart || targetIndex > viewEnd) {
        continue;
      }
      const toX = xCenterForVerse(targetIndex);
      const distance = Math.abs(toX - fromX);
      if (distance < 0.35) {
        continue;
      }

      const distanceRatio = clamp(distance / state.layout.axisWidth, 0, 1);
      const verseDistanceRatio = getVerseDistanceRatio(fromIndex, targetIndex);

      const seed = (Math.imul(fromIndex + 1, 2654435761) ^ Math.imul(targetIndex + 1, 2246822519)) >>> 0;
      const keepRoll = (seed & 1023) / 1023;
      const keepChance = 0.13 + distanceRatio * 0.44;
      if (keepRoll > keepChance) {
        continue;
      }

      const direction = targetIndex > fromIndex ? -1 : 1;
      const maxArcHeight = direction < 0 ? maxArcUp : maxArcDown;
      const swaySeed = ((seed >>> 20) & 1023) / 1023;
      const arcRatio = getArcHeightRatio(distanceRatio);
      const peakHeight = maxArcHeight * arcRatio;
      const controlX = (fromX + toX) * 0.5 + (swaySeed - 0.5) * distance * 0.22;

      // For quadratic curves, visual peak is ~half the control-point offset.
      // Doubling here produces the intended arc height and removes the flattened dome.
      const controlY = baselineY + direction * peakHeight * 2;

      const innerAlpha = theme.allArcInnerAlpha + sparseBoost * 0.04;
      const outerAlpha = theme.allArcOuterAlpha + sparseBoost * 0.03;
      const alpha = getArcAlpha(verseDistanceRatio, innerAlpha, outerAlpha);
      const lightness = getArcLightness(
        verseDistanceRatio,
        theme.allArcInnerLightness,
        theme.allArcOuterLightness,
      );
      ctx.strokeStyle = `hsla(${fromHue}, 60%, ${lightness}%, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(fromX, baselineY);
      ctx.quadraticCurveTo(controlX, controlY, toX, baselineY);
      ctx.stroke();
    }
  }
}

function drawSelectedReferenceArcs() {
  const { xCenterForVerse, baselineY, axisWidth, top, bottom, height } = state.layout;
  const { outgoingOffsets, outgoingTargets } = state.data;
  const viewStart = state.viewStart;
  const viewEnd = state.viewEnd;
  const theme = getThemeStyle();

  const start = outgoingOffsets[state.selectedIndex];
  const end = outgoingOffsets[state.selectedIndex + 1];
  const fromX = xCenterForVerse(state.selectedIndex);

  const maxArcUp = baselineY - top - 8;
  const maxArcDown = height - bottom - baselineY - 8;

  ctx.lineCap = "round";
  ctx.lineWidth = 1;

  const forwardTargets = [];
  const backwardTargets = [];
  for (let i = start; i < end; i += 1) {
    const targetIndex = outgoingTargets[i];
    if (!edgePassesFilters(state.selectedIndex, targetIndex)) {
      continue;
    }
    if (targetIndex < viewStart || targetIndex > viewEnd) {
      continue;
    }
    if (targetIndex > state.selectedIndex) {
      forwardTargets.push(targetIndex);
    } else if (targetIndex < state.selectedIndex) {
      backwardTargets.push(targetIndex);
    }
  }
  const visibleFilteredCount = forwardTargets.length + backwardTargets.length;
  const alphaBase = clamp(34 / (visibleFilteredCount + 34), 0.08, 0.52);

  const drawGroup = (targets, direction, maxArcHeight) => {
    targets.sort((a, b) => Math.abs(a - state.selectedIndex) - Math.abs(b - state.selectedIndex));
    const groupCount = targets.length;
    const sparseBoost = getSparseVisibilityBoost(groupCount);

    for (let rank = 0; rank < groupCount; rank += 1) {
      const targetIndex = targets[rank];
      const toX = xCenterForVerse(targetIndex);
      const distance = Math.abs(toX - fromX);
      if (distance < 0.35) {
        continue;
      }

      const distanceRatio = clamp(distance / axisWidth, 0, 1);
      const verseDistanceRatio = getVerseDistanceRatio(state.selectedIndex, targetIndex);
      const lane = groupCount > 1 ? rank / (groupCount - 1) : 0.5;
      const arcRatio = getArcHeightRatio(distanceRatio);
      const peakHeight = maxArcHeight * arcRatio;
      const controlX = (fromX + toX) * 0.5 + (lane - 0.5) * distance * 0.06;

      // For quadratic curves, visual peak is ~half the control-point offset.
      // Doubling keeps selected mode aligned with all-mode arc height behavior.
      const controlY = baselineY + direction * peakHeight * 2;

      const hue = state.bookHues[state.verseToBookIndex[targetIndex]];
      const innerAlpha = clamp(
        Math.max(theme.allArcInnerAlpha + 0.1, alphaBase + 0.2) + sparseBoost * 0.08,
        0.18,
        0.74,
      );
      const outerAlpha = clamp(
        Math.max(theme.allArcOuterAlpha + 0.05, alphaBase * 0.55) + sparseBoost * 0.055,
        0.1,
        0.58,
      );
      const alpha = getArcAlpha(verseDistanceRatio, innerAlpha, outerAlpha);
      const saturation = 62;
      const lightness = getArcLightness(
        verseDistanceRatio,
        theme.selectedArcInnerLightness,
        theme.selectedArcOuterLightness,
      );

      ctx.strokeStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
      ctx.beginPath();
      ctx.moveTo(fromX, baselineY);
      ctx.quadraticCurveTo(controlX, controlY, toX, baselineY);
      ctx.stroke();
    }
  };

  drawGroup(forwardTargets, -1, maxArcUp);
  drawGroup(backwardTargets, 1, maxArcDown);
}

function drawSelectionMarker() {
  if (state.mode === "all") {
    return;
  }
  if (state.selectedIndex < state.viewStart || state.selectedIndex > state.viewEnd) {
    return;
  }

  const { xCenterForVerse, baselineY, top, bottom, height } = state.layout;
  const x = xCenterForVerse(state.selectedIndex);
  const selectedBookHue = state.bookHues[state.verseToBookIndex[state.selectedIndex]];
  const theme = getThemeStyle();

  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = theme.selectionLine;
  ctx.beginPath();
  ctx.moveTo(x, top + 2);
  ctx.lineTo(x, height - bottom - 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = `hsla(${selectedBookHue}, 76%, ${theme.selectionDotLightness}%, 0.95)`;
  ctx.beginPath();
  ctx.arc(x, baselineY, 3.2, 0, Math.PI * 2);
  ctx.fill();
}

function render() {
  if (!state.data || !state.layout) {
    return;
  }
  drawBackground();
  if (state.mode === "all") {
    drawAllReferenceArcs();
  } else {
    drawSelectedReferenceArcs();
  }
  drawChapterBands();
  drawSelectionMarker();
}

function jumpToRandomVerse() {
  const { outgoingOffsets } = state.data;
  for (let attempts = 0; attempts < 1000; attempts += 1) {
    const randomIndex = Math.floor(Math.random() * state.data.totalVerses);
    if (outgoingOffsets[randomIndex + 1] > outgoingOffsets[randomIndex]) {
      setSelectedVerse(randomIndex);
      return;
    }
  }
  setSelectedVerse(Math.floor(Math.random() * state.data.totalVerses));
}

function wireEvents() {
  window.addEventListener("resize", () => {
    buildLayout();
    updateInfoPanel();
    queueRender();
  });

  canvas.addEventListener("pointermove", (event) => {
    const index = verseIndexFromClientX(event.clientX);
    state.hoverIndex = index;
    if (state.mode === "all") {
      return;
    }
    if (state.singlePinned) {
      return;
    }
    setSelectedVerse(index, { updateInput: false, activateSingle: false });
  });

  canvas.addEventListener("click", (event) => {
    const index = verseIndexFromClientX(event.clientX);
    if (state.mode === "single") {
      if (state.singlePinned) {
        state.singlePinned = false;
        setSelectedVerse(index, { updateInput: true, activateSingle: false });
        updateInfoPanel();
        return;
      }
      setSelectedVerse(index, { updateInput: true, activateSingle: false });
      state.singlePinned = true;
      updateInfoPanel();
      return;
    }
    setSelectedVerse(index, { updateInput: true, activateSingle: true });
  });

  canvas.addEventListener("wheel", (event) => {
    if (state.mode !== "all") {
      return;
    }
    event.preventDefault();
    const anchorIndex = verseIndexFromClientX(event.clientX);
    const zoomFactor = Math.exp(event.deltaY * 0.0012);
    const nextVisibleCount = state.layout.visibleCount * zoomFactor;
    setViewAroundAnchor(anchorIndex, nextVisibleCount);
    updateInfoPanel();
    queueRender();
  }, { passive: false });

  sliderEl.addEventListener("input", () => {
    const index = Number(sliderEl.value) - 1;
    setSelectedVerse(index);
  });

  goBtnEl.addEventListener("click", () => {
    const index = parseVerseInput(verseInputEl.value);
    if (index === null) {
      verseInputEl.select();
      return;
    }
    setSelectedVerse(index);
  });

  verseInputEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    const index = parseVerseInput(verseInputEl.value);
    if (index === null) {
      verseInputEl.select();
      return;
    }
    setSelectedVerse(index);
  });

  randomBtnEl.addEventListener("click", () => {
    jumpToRandomVerse();
  });

  filterToggleBtnEl.addEventListener("click", () => {
    setFilterPanelOpen(!state.filterPanelOpen);
  });
  themeToggleBtnEl?.addEventListener("click", cycleColorTheme);

  filterTestamentEl.addEventListener("change", applyFiltersFromControls);
  filterBookEl.addEventListener("change", applyFiltersFromControls);
  filterChapterEl.addEventListener("change", applyFiltersFromControls);
  filterScopeEl.addEventListener("change", applyFiltersFromControls);
  clearFiltersBtnEl.addEventListener("click", clearFilters);

  showAllBtnEl.addEventListener("click", () => {
    setMode("all");
  });

  resetZoomBtnEl.addEventListener("click", () => {
    resetView();
    updateInfoPanel();
    queueRender();
  });
}

async function bootstrap() {
  try {
    const [graphResponse, kjvResponse] = await Promise.all([
      fetch("./data/visualization-data.json"),
      fetch("./data/kjv-verse-texts.json"),
    ]);

    if (!graphResponse.ok) {
      throw new Error(`Graph HTTP ${graphResponse.status}`);
    }
    if (!kjvResponse.ok) {
      throw new Error(`KJV HTTP ${kjvResponse.status}`);
    }
    const [data, kjvPayload] = await Promise.all([
      graphResponse.json(),
      kjvResponse.json(),
    ]);

    if (!Array.isArray(kjvPayload.verses) || kjvPayload.verses.length !== data.totalVerses) {
      throw new Error(`KJV verse payload size mismatch: expected ${data.totalVerses}, got ${kjvPayload.verses?.length ?? "none"}`);
    }

    state.data = data;
    state.kjvVerses = kjvPayload.verses;
    state.bookHues = data.books.map((_, index) => getBookHue(index));
    state.bookAliasMap = buildBookAliasMap(data.books);
    state.bookNameByAbbr = new Map(data.books.map((book) => [book.abbr, book.name]));
    state.viewStart = 0;
    state.viewEnd = data.totalVerses - 1;

    state.refToIndex = new Map();
    for (let index = 0; index < data.verseRefs.length; index += 1) {
      state.refToIndex.set(data.verseRefs[index], index);
    }

    state.verseToBookIndex = new Uint8Array(data.totalVerses);
    state.verseToChapterId = new Uint16Array(data.totalVerses);
    state.chapterLabelById = new Map();
    state.chapterBands = [];
    let chapterId = 1;
    for (let bookIndex = 0; bookIndex < data.books.length; bookIndex += 1) {
      const book = data.books[bookIndex];
      for (let i = book.start; i <= book.end; i += 1) {
        state.verseToBookIndex[i] = bookIndex;
      }

      for (let chapterIndex = 0; chapterIndex < book.chapterStarts.length; chapterIndex += 1) {
        const chapterStart = book.chapterStarts[chapterIndex];
        const chapterEnd = chapterIndex === book.chapterStarts.length - 1
          ? book.end
          : book.chapterStarts[chapterIndex + 1] - 1;
        state.chapterBands.push({
          start: chapterStart,
          end: chapterEnd,
          bookIndex,
          chapterIndex,
        });
        state.chapterLabelById.set(chapterId, `${book.name} ${chapterIndex + 1}`);
        for (let verseIndex = chapterStart; verseIndex <= chapterEnd; verseIndex += 1) {
          state.verseToChapterId[verseIndex] = chapterId;
        }
        chapterId += 1;
      }
    }

    const totalReferenceCount = data.outgoingTargets.length;
    const bookReferenceCounts = new Uint32Array(data.books.length);
    const chapterReferenceCounts = new Uint32Array(chapterId);
    for (let i = 0; i < data.outgoingTargets.length; i += 1) {
      const targetVerseIndex = data.outgoingTargets[i];
      const targetBookIndex = state.verseToBookIndex[targetVerseIndex];
      const targetChapterId = state.verseToChapterId[targetVerseIndex];
      bookReferenceCounts[targetBookIndex] += 1;
      chapterReferenceCounts[targetChapterId] += 1;
    }

    let maxBookLabelWidth = "All Books".length;
    for (let bookIndex = 0; bookIndex < data.books.length; bookIndex += 1) {
      maxBookLabelWidth = Math.max(maxBookLabelWidth, data.books[bookIndex].name.length);
    }
    let maxBookCountWidth = totalReferenceCount.toLocaleString().length;
    for (let bookIndex = 0; bookIndex < data.books.length; bookIndex += 1) {
      maxBookCountWidth = Math.max(maxBookCountWidth, bookReferenceCounts[bookIndex].toLocaleString().length);
    }

    filterBookEl.innerHTML = "";
    const allBooksOption = document.createElement("option");
    allBooksOption.value = "all";
    allBooksOption.textContent = buildCountAlignedLabel("All Books", totalReferenceCount, maxBookLabelWidth, maxBookCountWidth);
    filterBookEl.append(allBooksOption);

    for (let bookIndex = 0; bookIndex < data.books.length; bookIndex += 1) {
      const bookOption = document.createElement("option");
      bookOption.value = String(bookIndex);
      bookOption.textContent = buildCountAlignedLabel(
        data.books[bookIndex].name,
        bookReferenceCounts[bookIndex],
        maxBookLabelWidth,
        maxBookCountWidth,
      );
      filterBookEl.append(bookOption);
    }

    let maxChapterLabelWidth = "All Chapters".length;
    for (let currentChapterId = 1; currentChapterId < chapterId; currentChapterId += 1) {
      const chapterLabel = state.chapterLabelById.get(currentChapterId) ?? `Chapter ${currentChapterId}`;
      if (chapterLabel) {
        maxChapterLabelWidth = Math.max(maxChapterLabelWidth, chapterLabel.length);
      }
    }
    let maxChapterCountWidth = totalReferenceCount.toLocaleString().length;
    for (let currentChapterId = 1; currentChapterId < chapterId; currentChapterId += 1) {
      maxChapterCountWidth = Math.max(maxChapterCountWidth, chapterReferenceCounts[currentChapterId].toLocaleString().length);
    }

    filterChapterEl.innerHTML = "";
    const allChapterOption = document.createElement("option");
    allChapterOption.value = "all";
    allChapterOption.textContent = buildCountAlignedLabel("All Chapters", totalReferenceCount, maxChapterLabelWidth, maxChapterCountWidth);
    filterChapterEl.append(allChapterOption);

    for (let currentChapterId = 1; currentChapterId < chapterId; currentChapterId += 1) {
      const chapterOption = document.createElement("option");
      chapterOption.value = String(currentChapterId);
      const chapterLabel = state.chapterLabelById.get(currentChapterId) ?? `Chapter ${currentChapterId}`;
      chapterOption.textContent = buildCountAlignedLabel(
        chapterLabel,
        chapterReferenceCounts[currentChapterId],
        maxChapterLabelWidth,
        maxChapterCountWidth,
      );
      filterChapterEl.append(chapterOption);
    }

    sliderEl.max = String(data.totalVerses);
    sourceLineEl.textContent = `Source: OpenBible.info cross-references (${data.source.updated || "date unknown"}) + KJV verse text (jsonbible/kjv)`;

    wireEvents();
    buildLayout();
    state.selectedIndex = state.refToIndex.get("John.3.16") ?? 0;
    sliderEl.value = String(state.selectedIndex + 1);
    verseInputEl.value = formatInputRef(state.data.verseRefs[state.selectedIndex]);
    showAllBtnEl.setAttribute("aria-pressed", "true");
    filterTestamentEl.value = state.filters.targetTestament;
    filterBookEl.value = state.filters.targetBook;
    filterChapterEl.value = state.filters.targetChapter;
    filterScopeEl.value = state.filters.scope;
    sizeAllFilterSelects();
    updateHasActiveFilters();
    setFilterPanelOpen(false);
    applyColorTheme("sepia", { queue: false });
    updateInfoPanel();
    queueRender();
    loadingEl.classList.add("hidden");
  } catch (error) {
    loadingEl.classList.remove("hidden");
    loadingEl.textContent = "Could not load data. Serve this folder over HTTP (example: python -m http.server).";
    console.error(error);
  }
}

bootstrap();
