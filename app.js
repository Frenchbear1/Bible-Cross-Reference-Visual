const canvas = document.getElementById("chart");
const ctx = canvas.getContext("2d");
const loadingEl = document.getElementById("loading");
const verseInputEl = document.getElementById("verse-input");
const showAllBtnEl = document.getElementById("show-all-btn");
const multiPinBtnEl = document.getElementById("multi-pin-btn");
const resetZoomBtnEl = document.getElementById("reset-zoom-btn");
const goBtnEl = document.getElementById("go-btn");
const randomBtnEl = document.getElementById("random-btn");
const filterToggleBtnEl = document.getElementById("filter-toggle-btn");
const orderCanonicalBtnEl = document.getElementById("order-canonical-btn");
const orderTimelineBtnEl = document.getElementById("order-timeline-btn");
const orderCompositionBtnEl = document.getElementById("order-composition-btn");
const compositionProfileRowEl = document.getElementById("composition-profile-row");
const compositionProfileSelectEl = document.getElementById("composition-profile-select");
const labelsOnBtnEl = document.getElementById("labels-on-btn");
const labelsOffBtnEl = document.getElementById("labels-off-btn");
const colorClassicBtnEl = document.getElementById("color-classic-btn");
const colorContrastBtnEl = document.getElementById("color-contrast-btn");
const themeToggleBtnEl = document.getElementById("theme-toggle-btn");
const filterRowEl = document.getElementById("filter-row");
const filterTestamentEl = document.getElementById("filter-testament");
const filterBookEl = document.getElementById("filter-book");
const filterChapterEl = document.getElementById("filter-chapter");
const filterScopeEl = document.getElementById("filter-scope");
const filterColoringEl = document.getElementById("filter-coloring");
const strengthMinSliderEl = document.getElementById("strength-min-slider");
const strengthMaxSliderEl = document.getElementById("strength-max-slider");
const strengthValueEl = document.getElementById("strength-value");
const clearFiltersBtnEl = document.getElementById("clear-filters-btn");
const snapshotBtnEl = document.getElementById("snapshot-btn");
const arcControlsToggleBtnEl = document.getElementById("arc-controls-toggle-btn");
const arcHoverTooltipEl = document.getElementById("arc-hover-tooltip");
const arcRadiusControlEl = document.getElementById("arc-radius-control");
const arcRadiusSliderEl = document.getElementById("arc-radius-slider");
const arcRadiusValueEl = document.getElementById("arc-radius-value");
const timelineWidthSliderEl = document.getElementById("timeline-width-slider");
const timelineWidthValueEl = document.getElementById("timeline-width-value");
const panLeftBtnEl = document.getElementById("pan-left-btn");
const panRightBtnEl = document.getElementById("pan-right-btn");
const sliderEl = document.getElementById("verse-slider");
const selectedLineEl = document.getElementById("selected-line");
const referenceLineEl = document.getElementById("reference-line");
const targetListEl = document.getElementById("target-list");
const selectedVerseTextEl = document.getElementById("selected-verse-text");
const selectedVerseEventsEl = document.getElementById("selected-verse-events");
const selectedVersePinBtnEl = document.getElementById("selected-verse-pin-btn");
const sourceLineEl = document.getElementById("source-line");

const UI_PREFS_STORAGE_KEY = "bible-crossrefs-ui-prefs-v1";
const ARC_HEIGHT_SCALE_MIN = 0.2;
const ARC_HEIGHT_SCALE_MAX = 1;
const ARC_HEIGHT_SCALE_DEFAULT = 1;
const TIMELINE_WIDTH_SCALE_MIN = 0.35;
const TIMELINE_WIDTH_SCALE_MAX = 1;
const TIMELINE_WIDTH_SCALE_DEFAULT = 1;
const SNAPSHOT_TARGET_WIDTH = 3840;
const SNAPSHOT_TARGET_HEIGHT = 2160;
const SNAPSHOT_MAX_SIDE = 7680;
const PAN_SECTION_RATIO = 0.85;
const PAN_ANIMATION_MIN_MS = 900;
const PAN_ANIMATION_MAX_MS = 1800;
const PAN_ANIMATION_BASE_MS = 840;
const PAN_ANIMATION_MS_PER_VERSE = 0.08;

function readUiPreferences() {
  try {
    const raw = localStorage.getItem(UI_PREFS_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const prefs = {};
    if (parsed.arcColoring === "classic" || parsed.arcColoring === "distance-brightness") {
      prefs.arcColoring = parsed.arcColoring;
    }
    if (
      parsed.orderMode === "canonical"
      || parsed.orderMode === "timeline"
      || parsed.orderMode === "composition"
    ) {
      prefs.orderMode = parsed.orderMode;
    }
    if (typeof parsed.compositionProfile === "string" && parsed.compositionProfile.trim()) {
      prefs.compositionProfile = parsed.compositionProfile.trim();
    }
    if (parsed.colorTheme === "sepia" || parsed.colorTheme === "white" || parsed.colorTheme === "dark") {
      prefs.colorTheme = parsed.colorTheme;
    }
    if (Number.isFinite(Number(parsed.arcHeightScale))) {
      const numeric = Number(parsed.arcHeightScale);
      prefs.arcHeightScale = Math.max(ARC_HEIGHT_SCALE_MIN, Math.min(ARC_HEIGHT_SCALE_MAX, numeric));
    }
    if (Number.isFinite(Number(parsed.timelineWidthScale))) {
      const numeric = Number(parsed.timelineWidthScale);
      prefs.timelineWidthScale = Math.max(TIMELINE_WIDTH_SCALE_MIN, Math.min(TIMELINE_WIDTH_SCALE_MAX, numeric));
    }
    if (typeof parsed.showArcRadiusControl === "boolean") {
      prefs.showArcRadiusControl = parsed.showArcRadiusControl;
    }
    if (typeof parsed.showTimelineDecorations === "boolean") {
      prefs.showTimelineDecorations = parsed.showTimelineDecorations;
    }
    return prefs;
  } catch (error) {
    return {};
  }
}

const storedUiPreferences = readUiPreferences();

const state = {
  data: null,
  refToIndex: null,
  verseToBookIndex: null,
  verseToChapterId: null,
  verseNumberInChapter: null,
  chapterBands: null,
  outgoingRankedOffsets: null,
  outgoingRankedTargets: null,
  verseDegree: null,
  bookHues: null,
  bookAliasMap: null,
  bookNameByAbbr: null,
  kjvVerses: null,
  verseYearExact: null,
  verseYearResolved: null,
  verseYearResolution: null,
  compositionProfileById: null,
  compositionProfileList: [],
  compositionDefaultProfileId: null,
  compositionProfileId: storedUiPreferences.compositionProfile ?? null,
  compositionYearExact: null,
  compositionYearResolved: null,
  compositionYearResolution: null,
  timelineYearsByPosition: null,
  compositionYearsByPosition: null,
  canonicalOrder: null,
  canonicalPositionByVerse: null,
  timelineOrder: null,
  timelinePositionByVerse: null,
  compositionOrder: null,
  compositionPositionByVerse: null,
  displayOrder: null,
  positionByVerse: null,
  orderMode: "canonical",
  preferredOrderMode: storedUiPreferences.orderMode ?? "canonical",
  timelineDataStatus: "missing",
  compositionDataStatus: "missing",
  events: null,
  verseEventOffsets: null,
  verseEventIds: null,
  timelineEventAnchors: null,
  eventDataStatus: "missing",
  filters: {
    targetTestament: "all",
    targetBook: "all",
    targetChapter: "all",
    scope: "all",
    arcColoring: storedUiPreferences.arcColoring ?? "classic",
  },
  hasActiveFilters: false,
  filterPanelOpen: false,
  chapterLabelById: null,
  selectedIndex: 0,
  pinnedIndices: [],
  hoverIndex: null,
  edgeRankLimit: 60,
  edgeRankMin: 1,
  edgeRankMax: 60,
  mode: "all",
  singlePinned: false,
  colorTheme: storedUiPreferences.colorTheme ?? "sepia",
  arcHeightScale: storedUiPreferences.arcHeightScale ?? ARC_HEIGHT_SCALE_DEFAULT,
  timelineWidthScale: storedUiPreferences.timelineWidthScale ?? TIMELINE_WIDTH_SCALE_DEFAULT,
  showArcRadiusControl: storedUiPreferences.showArcRadiusControl ?? false,
  showTimelineDecorations: storedUiPreferences.showTimelineDecorations ?? true,
  viewStart: 0,
  viewEnd: 0,
  renderQueued: false,
  layout: null,
  allModeRenderedArcs: [],
  allModeRangeListOpen: false,
  visibleReferenceCount: 0,
  activeVisibleVerseCount: 0,
  wheelZoomDelta: 0,
  wheelZoomAnchorPosition: null,
  wheelZoomAnchorResetTimer: null,
  wheelZoomFrameRequested: false,
  panAnimationFrame: null,
};

const THEME_ORDER = ["sepia", "white", "dark"];
const MAX_MULTI_PINS = 12;
const DEFAULT_EDGE_RANK_MAX = 60;
const ORDER_MODES = ["canonical", "timeline", "composition"];
const ARC_HOVER_PICK_RADIUS = 6;
const ARC_HOVER_PICK_PADDING = ARC_HOVER_PICK_RADIUS + 1;
const MAX_ALL_MODE_RANGE_CHIPS = 200;

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

function saveUiPreferences() {
  try {
    const payload = {
      arcColoring: state.filters.arcColoring,
      orderMode: state.preferredOrderMode || state.orderMode || "canonical",
      compositionProfile: state.compositionProfileId || null,
      colorTheme: state.colorTheme,
      arcHeightScale: state.arcHeightScale,
      timelineWidthScale: state.timelineWidthScale,
      showArcRadiusControl: state.showArcRadiusControl,
      showTimelineDecorations: state.showTimelineDecorations,
    };
    localStorage.setItem(UI_PREFS_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    // Ignore storage errors (private mode / blocked storage).
  }
}

function getPositionForVerse(verseIndex) {
  if (!state.positionByVerse) {
    return verseIndex;
  }
  return state.positionByVerse[verseIndex];
}

function getVerseAtPosition(position) {
  if (!state.displayOrder) {
    return position;
  }
  return state.displayOrder[position];
}

function isVerseVisible(verseIndex) {
  const position = getPositionForVerse(verseIndex);
  return position >= state.viewStart && position <= state.viewEnd;
}

function syncSliderToSelectedVerse() {
  if (!state.data) {
    return;
  }
  if (state.mode === "all" && state.layout) {
    const total = state.data.totalVerses;
    const maxStart = Math.max(0, total - state.layout.visibleCount);
    if (maxStart <= 0 || total <= 1) {
      sliderEl.value = "1";
      return;
    }
    const panRatio = clamp(state.viewStart / maxStart, 0, 1);
    const sliderPosition = Math.round(panRatio * (total - 1));
    sliderEl.value = String(sliderPosition + 1);
    return;
  }
  sliderEl.value = String(getPositionForVerse(state.selectedIndex) + 1);
}

function setSearchGoVisible(visible) {
  if (!goBtnEl) {
    return;
  }
  goBtnEl.classList.toggle("visible", Boolean(visible));
  goBtnEl.setAttribute("aria-hidden", visible ? "false" : "true");
  goBtnEl.tabIndex = visible ? 0 : -1;
}

function setVerseInputValue(value, options = {}) {
  const { userEdited = false } = options;
  verseInputEl.value = value;
  verseInputEl.dataset.userEdited = userEdited ? "true" : "false";
  const shouldShowGo = userEdited && value.trim().length > 0;
  setSearchGoVisible(shouldShowGo);
}

function formatYearLabel(yearValue) {
  if (!Number.isFinite(yearValue)) {
    return "Unknown date";
  }
  if (yearValue < 0) {
    return `${Math.abs(yearValue)} BC`;
  }
  if (yearValue > 0) {
    return `${yearValue} AD`;
  }
  return "Year 0";
}

function formatOrderModeLabel(mode) {
  if (mode === "timeline") {
    return "Timeline (BC->AD)";
  }
  if (mode === "composition") {
    const activeProfile = getActiveCompositionProfile();
    if (activeProfile?.label) {
      return `Composition (${activeProfile.label})`;
    }
    return "Composition (written-order)";
  }
  return "Canonical";
}

function isYearOrderedMode(mode = state.orderMode) {
  return mode === "timeline" || mode === "composition";
}

function getActiveSortedYearsByPosition(mode = state.orderMode) {
  if (mode === "composition") {
    return state.compositionYearsByPosition;
  }
  if (mode === "timeline") {
    return state.timelineYearsByPosition;
  }
  return null;
}

function normalizeYearArray(values, expectedLength) {
  if (!Array.isArray(values) || values.length !== expectedLength) {
    return null;
  }
  return values.map((value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) {
      return null;
    }
    return Math.trunc(numeric);
  });
}

function buildCompositionProfileRuntime(profileId, rawProfile, expectedLength, books, chapterBands) {
  if (!rawProfile || typeof rawProfile !== "object") {
    return null;
  }
  const years = normalizeYearArray(rawProfile.years, expectedLength);
  if (!years) {
    return null;
  }

  const resolved = resolveTimelineYears(years, books, chapterBands);
  const timeline = buildTimelineOrder(years, resolved.resolvedYears);
  const datedVerses = Number.isFinite(Number(rawProfile.datedVerses))
    ? Math.max(0, Math.trunc(Number(rawProfile.datedVerses)))
    : years.reduce((count, year) => (Number.isFinite(year) ? count + 1 : count), 0);
  const explicitCoverage = Number(rawProfile.coverage);

  return {
    id: profileId,
    label: typeof rawProfile.label === "string" && rawProfile.label.trim()
      ? rawProfile.label.trim()
      : profileId,
    framework: typeof rawProfile.framework === "string" ? rawProfile.framework : null,
    description: typeof rawProfile.description === "string"
      ? rawProfile.description
      : (typeof rawProfile.method === "string" ? rawProfile.method : null),
    source: rawProfile.source && typeof rawProfile.source === "object"
      ? rawProfile.source
      : null,
    datedVerses,
    coverage: Number.isFinite(explicitCoverage)
      ? explicitCoverage
      : Number((datedVerses / expectedLength).toFixed(6)),
    bookRanges: Array.isArray(rawProfile.bookRanges)
      ? rawProfile.bookRanges
      : (Array.isArray(rawProfile.books) ? rawProfile.books : null),
    years,
    resolvedYears: resolved.resolvedYears,
    resolutionSource: resolved.resolutionSource,
    order: timeline.timelineOrder,
    positionByVerse: timeline.timelinePositionByVerse,
    yearsByPosition: timeline.timelineYearsByPosition,
  };
}

function extractCompositionProfiles(payload, expectedLength, books, chapterBands) {
  if (!payload || typeof payload !== "object") {
    return { profiles: [], defaultProfileId: null };
  }

  const parsedProfiles = [];
  if (payload.profiles && typeof payload.profiles === "object" && !Array.isArray(payload.profiles)) {
    const payloadProfileOrder = Array.isArray(payload.profileOrder)
      ? payload.profileOrder.filter((value) => typeof value === "string" && value.trim())
      : [];
    const payloadProfileIds = Object.keys(payload.profiles);
    const orderedIds = payloadProfileOrder.length > 0
      ? [...new Set([...payloadProfileOrder, ...payloadProfileIds])]
      : payloadProfileIds;

    for (const rawId of orderedIds) {
      const rawProfile = payload.profiles[rawId];
      if (!rawProfile || typeof rawProfile !== "object") {
        continue;
      }
      const profileId = typeof rawProfile.id === "string" && rawProfile.id.trim()
        ? rawProfile.id.trim()
        : rawId;
      const runtimeProfile = buildCompositionProfileRuntime(
        profileId,
        rawProfile,
        expectedLength,
        books,
        chapterBands,
      );
      if (runtimeProfile) {
        parsedProfiles.push(runtimeProfile);
      }
    }
  }

  if (parsedProfiles.length === 0) {
    const inferredDefaultId = typeof payload.defaultProfile === "string" && payload.defaultProfile.trim()
      ? payload.defaultProfile.trim()
      : (typeof payload.profile === "string" && payload.profile.trim()
        ? payload.profile.trim()
        : "critical");
    const runtimeProfile = buildCompositionProfileRuntime(
      inferredDefaultId,
      {
        ...payload,
        id: inferredDefaultId,
        label: typeof payload.profileLabel === "string" && payload.profileLabel.trim()
          ? payload.profileLabel.trim()
          : (inferredDefaultId === "critical" ? "Critical" : inferredDefaultId),
        description: payload?.source?.method ?? payload?.method ?? null,
      },
      expectedLength,
      books,
      chapterBands,
    );
    if (runtimeProfile) {
      parsedProfiles.push(runtimeProfile);
    }
  }

  if (parsedProfiles.length === 0) {
    return { profiles: [], defaultProfileId: null };
  }

  const uniqueProfiles = [];
  const seenProfileIds = new Set();
  for (const profile of parsedProfiles) {
    if (seenProfileIds.has(profile.id)) {
      continue;
    }
    seenProfileIds.add(profile.id);
    uniqueProfiles.push(profile);
  }

  const requestedDefaultProfile = typeof payload.defaultProfile === "string" && payload.defaultProfile.trim()
    ? payload.defaultProfile.trim()
    : null;
  const defaultProfileId = requestedDefaultProfile && seenProfileIds.has(requestedDefaultProfile)
    ? requestedDefaultProfile
    : uniqueProfiles[0].id;

  return {
    profiles: uniqueProfiles,
    defaultProfileId,
  };
}

function getActiveCompositionProfile() {
  if (!state.compositionProfileById || !state.compositionProfileId) {
    return null;
  }
  return state.compositionProfileById.get(state.compositionProfileId) ?? null;
}

function syncCompositionProfileControl() {
  if (!compositionProfileSelectEl) {
    return;
  }

  const profiles = Array.isArray(state.compositionProfileList)
    ? state.compositionProfileList
    : [];
  compositionProfileSelectEl.innerHTML = "";
  for (const profile of profiles) {
    const option = document.createElement("option");
    option.value = profile.id;
    option.textContent = profile.label || profile.id;
    compositionProfileSelectEl.append(option);
  }

  const shouldShowControl = profiles.length > 1 && state.orderMode === "composition";
  if (compositionProfileRowEl) {
    compositionProfileRowEl.classList.toggle("hidden", !shouldShowControl);
  }

  compositionProfileSelectEl.disabled = profiles.length <= 1;
  if (profiles.length === 0) {
    return;
  }

  const hasSelected = Boolean(
    state.compositionProfileId
    && profiles.some((profile) => profile.id === state.compositionProfileId),
  );
  const selectedId = hasSelected
    ? state.compositionProfileId
    : profiles[0].id;
  compositionProfileSelectEl.value = selectedId;
}

function updateSourceLine() {
  if (!sourceLineEl || !state.data) {
    return;
  }

  const timelineSourceSuffix = state.timelineDataStatus === "ready"
    ? " + verse yearNum (Theographic)"
    : "";

  let compositionSourceSuffix = "";
  if (state.compositionDataStatus === "ready") {
    const activeProfile = getActiveCompositionProfile();
    if (activeProfile?.label && state.compositionProfileList.length > 1) {
      compositionSourceSuffix = ` + composition ranges (${activeProfile.label} profile)`;
    } else if (activeProfile?.label) {
      compositionSourceSuffix = ` + composition ranges (${activeProfile.label})`;
    } else {
      compositionSourceSuffix = " + composition ranges";
    }
  }

  const eventSourceSuffix = state.eventDataStatus === "ready"
    ? " + event titles (Theographic)"
    : "";
  const sourceUpdated = state.data.source?.updated || "date unknown";
  sourceLineEl.textContent = `Source: OpenBible.info cross-references (${sourceUpdated}) + KJV verse text (jsonbible/kjv)${timelineSourceSuffix}${compositionSourceSuffix}${eventSourceSuffix}`;
}

function setCompositionProfile(nextProfileId, options = {}) {
  const {
    queue = true,
    save = true,
    refreshInfo = true,
  } = options;

  if (!state.compositionProfileById || state.compositionProfileById.size === 0) {
    state.compositionProfileId = null;
    state.compositionYearExact = null;
    state.compositionYearResolved = null;
    state.compositionYearResolution = null;
    state.compositionOrder = null;
    state.compositionPositionByVerse = null;
    state.compositionYearsByPosition = null;
    syncCompositionProfileControl();
    syncOrderToggleButtons();
    updateSourceLine();
    if (refreshInfo && state.data) {
      updateInfoPanel();
    }
    if (save) {
      saveUiPreferences();
    }
    return false;
  }

  const fallbackProfileId = (
    state.compositionDefaultProfileId
    && state.compositionProfileById.has(state.compositionDefaultProfileId)
  )
    ? state.compositionDefaultProfileId
    : (state.compositionProfileList[0]?.id ?? null);

  let resolvedProfileId = typeof nextProfileId === "string" && nextProfileId.trim()
    ? nextProfileId.trim()
    : fallbackProfileId;
  if (!resolvedProfileId || !state.compositionProfileById.has(resolvedProfileId)) {
    resolvedProfileId = fallbackProfileId;
  }
  if (!resolvedProfileId || !state.compositionProfileById.has(resolvedProfileId)) {
    return false;
  }

  const activeProfile = state.compositionProfileById.get(resolvedProfileId);
  const profileChanged = state.compositionProfileId !== resolvedProfileId;
  state.compositionProfileId = resolvedProfileId;
  state.compositionYearExact = activeProfile.years;
  state.compositionYearResolved = activeProfile.resolvedYears;
  state.compositionYearResolution = activeProfile.resolutionSource;
  state.compositionOrder = activeProfile.order;
  state.compositionPositionByVerse = activeProfile.positionByVerse;
  state.compositionYearsByPosition = activeProfile.yearsByPosition;

  if (state.orderMode === "composition") {
    state.displayOrder = state.compositionOrder;
    state.positionByVerse = state.compositionPositionByVerse;
    if (state.layout && state.data) {
      const totalVerses = state.data.totalVerses;
      const visibleCount = clamp(state.layout.visibleCount, 1, totalVerses);
      const selectedPosition = getPositionForVerse(state.selectedIndex);
      const nextStart = clamp(selectedPosition - Math.floor(visibleCount / 2), 0, totalVerses - visibleCount);
      state.viewStart = nextStart;
      state.viewEnd = nextStart + visibleCount - 1;
      buildLayout();
      syncSliderToSelectedVerse();
    }
  }

  syncCompositionProfileControl();
  syncOrderToggleButtons();
  updateSourceLine();
  if (refreshInfo && state.data) {
    updateInfoPanel();
  }
  if (queue && profileChanged) {
    queueRender();
  }
  if (save) {
    saveUiPreferences();
  }
  return true;
}

function getEventIdsForVerse(verseIndex) {
  if (!state.verseEventOffsets || !state.verseEventIds) {
    return [];
  }
  const start = state.verseEventOffsets[verseIndex];
  const end = state.verseEventOffsets[verseIndex + 1];
  const ids = [];
  for (let cursor = start; cursor < end; cursor += 1) {
    ids.push(state.verseEventIds[cursor]);
  }
  return ids;
}

function getEventsForVerse(verseIndex) {
  if (!state.events) {
    return [];
  }
  return getEventIdsForVerse(verseIndex)
    .map((eventIndex) => state.events[eventIndex])
    .filter(Boolean);
}

function formatEventSummary(eventRecord) {
  const parts = [eventRecord.title];
  if (Number.isFinite(eventRecord.startYear)) {
    parts.push(formatYearLabel(eventRecord.startYear));
  }
  return parts.join(" - ");
}

function updateSelectedVerseEventSummary(verseIndex, options = {}) {
  if (!selectedVerseEventsEl) {
    return;
  }
  const { mode = "single" } = options;
  if (!state.events || !state.verseEventOffsets || !state.verseEventIds) {
    selectedVerseEventsEl.textContent = "Timeline events: event data unavailable.";
    return;
  }
  if (mode === "all") {
    selectedVerseEventsEl.textContent = "Timeline events: zoom in or select a verse to see details.";
    return;
  }
  if (mode === "multi") {
    const combined = new Set();
    for (const pinnedIndex of state.pinnedIndices) {
      for (const eventId of getEventIdsForVerse(pinnedIndex)) {
        combined.add(eventId);
      }
    }
    const labels = Array.from(combined)
      .slice(0, 4)
      .map((eventId) => formatEventSummary(state.events[eventId]));
    const suffix = combined.size > labels.length ? ` (+${combined.size - labels.length} more)` : "";
    selectedVerseEventsEl.textContent = labels.length
      ? `Timeline events (pins): ${labels.join(" | ")}${suffix}`
      : "Timeline events (pins): none mapped.";
    return;
  }

  const events = getEventsForVerse(verseIndex);
  const shown = events.slice(0, 4).map((eventRecord) => formatEventSummary(eventRecord));
  const suffix = events.length > shown.length ? ` (+${events.length - shown.length} more)` : "";
  selectedVerseEventsEl.textContent = shown.length
    ? `Timeline events: ${shown.join(" | ")}${suffix}`
    : "Timeline events: none mapped for this verse.";
}

function sampleEvenly(items, maxCount) {
  if (maxCount <= 0 || items.length <= maxCount) {
    return items;
  }
  const sampled = [];
  const step = items.length / maxCount;
  let lastTaken = -1;
  for (let slot = 0; slot < maxCount; slot += 1) {
    const index = Math.min(items.length - 1, Math.floor(slot * step));
    if (index === lastTaken) {
      continue;
    }
    sampled.push(items[index]);
    lastTaken = index;
  }
  return sampled;
}

function getTimelineDetailCaps() {
  const visible = state.layout?.visibleCount ?? state.data?.totalVerses ?? 31102;
  if (visible > 15000) {
    return { maxMarkers: 0, maxLabels: 0 };
  }
  if (visible > 7000) {
    return { maxMarkers: 40, maxLabels: 0 };
  }
  if (visible > 3000) {
    return { maxMarkers: 120, maxLabels: 0 };
  }
  if (visible > 1500) {
    return { maxMarkers: 220, maxLabels: 12 };
  }
  if (visible > 900) {
    return { maxMarkers: 320, maxLabels: 24 };
  }
  if (visible > 500) {
    return { maxMarkers: 460, maxLabels: 36 };
  }
  return { maxMarkers: 680, maxLabels: 60 };
}

function collectTimelineVisibleEvents() {
  if (!state.timelineEventAnchors || state.timelineEventAnchors.length === 0) {
    return [];
  }
  const eventsInView = [];
  for (const anchor of state.timelineEventAnchors) {
    const position = getPositionForVerse(anchor.anchorVerse);
    if (position < state.viewStart || position > state.viewEnd) {
      continue;
    }
    eventsInView.push({
      ...anchor,
      position,
    });
  }
  eventsInView.sort((left, right) => {
    if (left.position !== right.position) {
      return left.position - right.position;
    }
    return left.eventIndex - right.eventIndex;
  });
  return eventsInView;
}

function chooseNearestKnownIndex(anchorIndex, leftIndex, rightIndex) {
  if (leftIndex < 0) {
    return rightIndex;
  }
  if (rightIndex < 0) {
    return leftIndex;
  }
  const leftDistance = anchorIndex - leftIndex;
  const rightDistance = rightIndex - anchorIndex;
  return leftDistance <= rightDistance ? leftIndex : rightIndex;
}

function buildNearestKnownForRanges(hasExactYear, ranges) {
  const total = hasExactYear.length;
  const nearestLeft = new Int32Array(total);
  const nearestRight = new Int32Array(total);
  nearestLeft.fill(-1);
  nearestRight.fill(-1);

  for (const range of ranges) {
    let seen = -1;
    for (let index = range.start; index <= range.end; index += 1) {
      if (hasExactYear[index]) {
        seen = index;
      }
      nearestLeft[index] = seen;
    }
    seen = -1;
    for (let index = range.end; index >= range.start; index -= 1) {
      if (hasExactYear[index]) {
        seen = index;
      }
      nearestRight[index] = seen;
    }
  }

  return { nearestLeft, nearestRight };
}

function resolveTimelineYears(exactYears, books, chapterBands) {
  const total = exactYears.length;
  const hasExactYear = new Uint8Array(total);
  for (let index = 0; index < total; index += 1) {
    if (Number.isFinite(exactYears[index])) {
      hasExactYear[index] = 1;
    }
  }

  const chapterRanges = chapterBands.map((band) => ({ start: band.start, end: band.end }));
  const bookRanges = books.map((book) => ({ start: book.start, end: book.end }));
  const chapterNearest = buildNearestKnownForRanges(hasExactYear, chapterRanges);
  const bookNearest = buildNearestKnownForRanges(hasExactYear, bookRanges);
  const globalNearest = buildNearestKnownForRanges(hasExactYear, [{ start: 0, end: total - 1 }]);

  const resolvedYears = new Int32Array(total);
  const resolutionSource = new Uint8Array(total);
  // 0 exact, 1 same chapter, 2 same book, 3 nearest global, 4 none found.
  for (let index = 0; index < total; index += 1) {
    if (hasExactYear[index]) {
      resolvedYears[index] = Math.trunc(exactYears[index]);
      resolutionSource[index] = 0;
      continue;
    }

    const chapterMatch = chooseNearestKnownIndex(
      index,
      chapterNearest.nearestLeft[index],
      chapterNearest.nearestRight[index],
    );
    if (chapterMatch >= 0) {
      resolvedYears[index] = Math.trunc(exactYears[chapterMatch]);
      resolutionSource[index] = 1;
      continue;
    }

    const bookMatch = chooseNearestKnownIndex(
      index,
      bookNearest.nearestLeft[index],
      bookNearest.nearestRight[index],
    );
    if (bookMatch >= 0) {
      resolvedYears[index] = Math.trunc(exactYears[bookMatch]);
      resolutionSource[index] = 2;
      continue;
    }

    const globalMatch = chooseNearestKnownIndex(
      index,
      globalNearest.nearestLeft[index],
      globalNearest.nearestRight[index],
    );
    if (globalMatch >= 0) {
      resolvedYears[index] = Math.trunc(exactYears[globalMatch]);
      resolutionSource[index] = 3;
      continue;
    }

    resolvedYears[index] = 0;
    resolutionSource[index] = 4;
  }

  return {
    resolvedYears,
    resolutionSource,
  };
}

function buildTimelineOrder(exactYears, resolvedYears) {
  const total = resolvedYears.length;
  const sorted = Array.from({ length: total }, (_, index) => index);
  sorted.sort((left, right) => {
    const yearDelta = resolvedYears[left] - resolvedYears[right];
    if (yearDelta !== 0) {
      return yearDelta;
    }
    const leftExact = Number.isFinite(exactYears[left]) ? 1 : 0;
    const rightExact = Number.isFinite(exactYears[right]) ? 1 : 0;
    if (leftExact !== rightExact) {
      return rightExact - leftExact;
    }
    return left - right;
  });

  const timelineOrder = new Uint32Array(total);
  const timelinePositionByVerse = new Uint32Array(total);
  const timelineYearsByPosition = new Int32Array(total);
  for (let position = 0; position < total; position += 1) {
    const verseIndex = sorted[position];
    timelineOrder[position] = verseIndex;
    timelinePositionByVerse[verseIndex] = position;
    timelineYearsByPosition[position] = resolvedYears[verseIndex];
  }

  return {
    timelineOrder,
    timelinePositionByVerse,
    timelineYearsByPosition,
  };
}

function syncOrderToggleButtons(options = {}) {
  const {
    mode = state.orderMode,
    timelineReady = Boolean(
      state.timelineOrder
      && state.timelinePositionByVerse
      && state.verseYearResolved
    ),
    compositionReady = Boolean(
      state.compositionOrder
      && state.compositionPositionByVerse
      && state.compositionYearResolved
    ),
  } = options;

  if (orderCanonicalBtnEl) {
    orderCanonicalBtnEl.setAttribute("aria-pressed", mode === "canonical" ? "true" : "false");
  }
  if (orderTimelineBtnEl) {
    orderTimelineBtnEl.setAttribute("aria-pressed", mode === "timeline" ? "true" : "false");
    orderTimelineBtnEl.disabled = !timelineReady;
    orderTimelineBtnEl.title = timelineReady
      ? "Order verses by timeline"
      : "Timeline order unavailable (timeline data missing)";
  }
  if (orderCompositionBtnEl) {
    const activeProfile = getActiveCompositionProfile();
    orderCompositionBtnEl.setAttribute("aria-pressed", mode === "composition" ? "true" : "false");
    orderCompositionBtnEl.disabled = !compositionReady;
    orderCompositionBtnEl.title = compositionReady
      ? (activeProfile?.label
        ? `Order verses by estimated composition dates (${activeProfile.label})`
        : "Order verses by estimated composition dates")
      : "Composition order unavailable (composition data missing)";
  }
}

function syncArcColorToggleButtons(mode = state.filters.arcColoring) {
  if (colorClassicBtnEl) {
    colorClassicBtnEl.setAttribute("aria-pressed", mode === "classic" ? "true" : "false");
  }
  if (colorContrastBtnEl) {
    colorContrastBtnEl.setAttribute("aria-pressed", mode === "distance-brightness" ? "true" : "false");
  }
}

function syncLabelsToggleButtons(visible = state.showTimelineDecorations) {
  if (labelsOnBtnEl) {
    labelsOnBtnEl.setAttribute("aria-pressed", visible ? "true" : "false");
  }
  if (labelsOffBtnEl) {
    labelsOffBtnEl.setAttribute("aria-pressed", visible ? "false" : "true");
  }
}

function setTimelineDecorationsVisible(visible, options = {}) {
  const {
    queue = true,
    save = true,
  } = options;
  state.showTimelineDecorations = Boolean(visible);
  syncLabelsToggleButtons(state.showTimelineDecorations);
  if (queue) {
    queueRender();
  }
  if (save) {
    saveUiPreferences();
  }
}

function setArcColoring(mode, options = {}) {
  const {
    queue = true,
    save = true,
    refreshInfo = true,
  } = options;
  const normalized = mode === "distance-brightness" ? "distance-brightness" : "classic";
  state.filters.arcColoring = normalized;
  if (filterColoringEl) {
    filterColoringEl.value = normalized;
  }
  syncArcColorToggleButtons(normalized);
  if (refreshInfo) {
    updateInfoPanel();
  }
  if (queue) {
    queueRender();
  }
  if (save) {
    saveUiPreferences();
  }
}

function setOrderMode(nextMode, options = {}) {
  const { preserveWindow = true, persist = true } = options;
  const requestedMode = ORDER_MODES.includes(nextMode) ? nextMode : "canonical";
  state.preferredOrderMode = requestedMode;
  if (!state.data || !state.canonicalOrder || !state.canonicalPositionByVerse) {
    if (persist) {
      saveUiPreferences();
    }
    return;
  }

  const timelineReady = Boolean(
    state.timelineOrder
    && state.timelinePositionByVerse
    && state.verseYearResolved,
  );
  const compositionReady = Boolean(
    state.compositionOrder
    && state.compositionPositionByVerse
    && state.compositionYearResolved,
  );
  let normalizedMode = "canonical";
  if (requestedMode === "timeline" && timelineReady) {
    normalizedMode = "timeline";
  } else if (requestedMode === "composition" && compositionReady) {
    normalizedMode = "composition";
  }

  if (state.orderMode === normalizedMode && state.displayOrder && state.positionByVerse) {
    syncCompositionProfileControl();
    syncOrderToggleButtons({ mode: normalizedMode, timelineReady, compositionReady });
    if (persist) {
      saveUiPreferences();
    }
    return;
  }

  const totalVerses = state.data.totalVerses;
  const currentVisible = state.layout?.visibleCount ?? totalVerses;

  state.orderMode = normalizedMode;
  if (normalizedMode === "timeline") {
    state.displayOrder = state.timelineOrder;
    state.positionByVerse = state.timelinePositionByVerse;
  } else if (normalizedMode === "composition") {
    state.displayOrder = state.compositionOrder;
    state.positionByVerse = state.compositionPositionByVerse;
  } else {
    state.displayOrder = state.canonicalOrder;
    state.positionByVerse = state.canonicalPositionByVerse;
  }

  syncCompositionProfileControl();
  syncOrderToggleButtons({ mode: normalizedMode, timelineReady, compositionReady });

  const nextVisible = clamp(currentVisible, 1, totalVerses);
  if (!preserveWindow || !state.layout) {
    state.viewStart = 0;
    state.viewEnd = totalVerses - 1;
  } else {
    const selectedPosition = getPositionForVerse(state.selectedIndex);
    const nextStart = clamp(selectedPosition - Math.floor(nextVisible / 2), 0, totalVerses - nextVisible);
    state.viewStart = nextStart;
    state.viewEnd = nextStart + nextVisible - 1;
  }

  buildLayout();
  syncSliderToSelectedVerse();
  updateInfoPanel();
  if (persist) {
    saveUiPreferences();
  }
  queueRender();
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
    || state.filters.scope !== "all"
    || state.edgeRankMin !== 1
    || state.edgeRankMax !== state.edgeRankLimit;

  if (clearFiltersBtnEl) {
    clearFiltersBtnEl.classList.toggle("hidden", !state.hasActiveFilters);
    clearFiltersBtnEl.disabled = !state.hasActiveFilters;
    clearFiltersBtnEl.setAttribute("aria-hidden", state.hasActiveFilters ? "false" : "true");
  }
}

function setFilterPanelOpen(nextOpen) {
  state.filterPanelOpen = Boolean(nextOpen);
  filterRowEl.classList.toggle("open", state.filterPanelOpen);
  filterRowEl.setAttribute("aria-hidden", state.filterPanelOpen ? "false" : "true");
  filterToggleBtnEl.setAttribute("aria-expanded", state.filterPanelOpen ? "true" : "false");
  filterToggleBtnEl.textContent = state.filterPanelOpen ? "Hide Filters" : "Filter";
}

function formatEdgeRangeLabel(
  minRank = state.edgeRankMin,
  maxRank = state.edgeRankMax,
) {
  return `${minRank}-${maxRank}`;
}

function updateStrengthLabel() {
  if (strengthValueEl) {
    strengthValueEl.textContent = formatEdgeRangeLabel();
  }
}

function formatArcHeightScaleLabel(scale = state.arcHeightScale) {
  return `Arc Radius ${Math.round(scale * 100)}%`;
}

function formatTimelineWidthScaleLabel(scale = state.timelineWidthScale) {
  return `Timeline Width ${Math.round(scale * 100)}%`;
}

function setArcRadiusControlVisible(visible, options = {}) {
  const { save = true } = options;
  state.showArcRadiusControl = Boolean(visible);
  if (arcRadiusControlEl) {
    arcRadiusControlEl.classList.toggle("open", state.showArcRadiusControl);
    arcRadiusControlEl.setAttribute("aria-hidden", state.showArcRadiusControl ? "false" : "true");
  }
  if (arcControlsToggleBtnEl) {
    arcControlsToggleBtnEl.setAttribute("aria-expanded", state.showArcRadiusControl ? "true" : "false");
  }
  if (save) {
    saveUiPreferences();
  }
}

function applyTimelineWidthScale(scaleValue, options = {}) {
  const {
    queue = true,
    save = true,
    rebuild = true,
  } = options;
  const numeric = Number(scaleValue);
  const nextScale = Number.isFinite(numeric)
    ? clamp(numeric, TIMELINE_WIDTH_SCALE_MIN, TIMELINE_WIDTH_SCALE_MAX)
    : TIMELINE_WIDTH_SCALE_DEFAULT;
  state.timelineWidthScale = nextScale;
  if (timelineWidthSliderEl) {
    timelineWidthSliderEl.value = String(Math.round(nextScale * 100));
  }
  if (timelineWidthValueEl) {
    timelineWidthValueEl.textContent = formatTimelineWidthScaleLabel(nextScale);
  }
  if (rebuild && state.data) {
    buildLayout();
  }
  if (queue) {
    queueRender();
  }
  if (save) {
    saveUiPreferences();
  }
}

function applyArcHeightScale(scaleValue, options = {}) {
  const {
    queue = true,
    save = true,
  } = options;
  const numeric = Number(scaleValue);
  const nextScale = Number.isFinite(numeric)
    ? clamp(numeric, ARC_HEIGHT_SCALE_MIN, ARC_HEIGHT_SCALE_MAX)
    : ARC_HEIGHT_SCALE_DEFAULT;
  state.arcHeightScale = nextScale;
  if (arcRadiusSliderEl) {
    arcRadiusSliderEl.value = String(Math.round(nextScale * 100));
  }
  if (arcRadiusValueEl) {
    arcRadiusValueEl.textContent = formatArcHeightScaleLabel(nextScale);
  }
  if (queue) {
    queueRender();
  }
  if (save) {
    saveUiPreferences();
  }
}

function updateMultiPinButton() {
  if (!multiPinBtnEl) {
    return;
  }
  const pressed = state.mode === "multi";
  multiPinBtnEl.setAttribute("aria-pressed", pressed ? "true" : "false");
  if (pressed) {
    multiPinBtnEl.textContent = `Multi Pin: On (${state.pinnedIndices.length})`;
    return;
  }
  multiPinBtnEl.textContent = "Multi Pin: Off";
}

function updateSelectedVersePinButton() {
  if (!selectedVersePinBtnEl) {
    return;
  }
  if (!state.data) {
    selectedVersePinBtnEl.classList.add("hidden");
    return;
  }
  selectedVersePinBtnEl.classList.remove("hidden");
  const isPinned = state.pinnedIndices.includes(state.selectedIndex);
  selectedVersePinBtnEl.textContent = isPinned ? "Unpin" : "Pin";
}

function getThemeStyle() {
  return THEME_STYLES[state.colorTheme] ?? THEME_STYLES.sepia;
}

function applyColorTheme(themeName, { queue = true, save = true } = {}) {
  const nextTheme = THEME_STYLES[themeName] ? themeName : "sepia";
  state.colorTheme = nextTheme;
  document.body.setAttribute("data-theme", nextTheme);
  if (themeToggleBtnEl) {
    themeToggleBtnEl.textContent = getThemeStyle().buttonLabel;
  }
  if (save) {
    saveUiPreferences();
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

  if (state.filters.arcColoring === "distance-brightness") {
    labels.push("color contrast");
  }

  if (state.edgeRankMin !== 1 || state.edgeRankMax !== state.edgeRankLimit) {
    labels.push(`refs/verse ${formatEdgeRangeLabel(state.edgeRankMin, state.edgeRankMax)}`);
  }

  if (labels.length === 0) {
    return "none";
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

function getAdjacencyStore(useRanked = false) {
  if (useRanked && state.outgoingRankedOffsets && state.outgoingRankedTargets) {
    return {
      offsets: state.outgoingRankedOffsets,
      values: state.outgoingRankedTargets,
    };
  }
  return {
    offsets: state.data.outgoingOffsets,
    values: state.data.outgoingTargets,
  };
}

function sourceVersePassesRefCountRange(anchorIndex, options = {}) {
  const { useRanked = true } = options;
  const { offsets } = getAdjacencyStore(useRanked);
  const totalOutgoing = offsets[anchorIndex + 1] - offsets[anchorIndex];
  return totalOutgoing >= state.edgeRankMin && totalOutgoing <= state.edgeRankMax;
}

function forEachDirectionalNeighbor(anchorIndex, visitor, options = {}) {
  const {
    applyRange = true,
    useRanked = true,
  } = options;

  const { offsets, values } = getAdjacencyStore(useRanked);
  const start = offsets[anchorIndex];
  const end = offsets[anchorIndex + 1];
  const availableCount = end - start;

  if (applyRange && !sourceVersePassesRefCountRange(anchorIndex, { useRanked })) {
    return;
  }

  for (let local = 0; local < availableCount; local += 1) {
    visitor(values[start + local], "outgoing");
  }
}

function collectDirectionalNeighbors(anchorIndex, options = {}) {
  const {
    applyFilters = false,
    restrictToView = false,
    applyRange = true,
  } = options;

  const results = [];

  forEachDirectionalNeighbor(anchorIndex, (neighborIndex, relation) => {
    if (applyFilters && !edgePassesFilters(anchorIndex, neighborIndex)) {
      return;
    }
    if (restrictToView && !isVerseVisible(neighborIndex)) {
      return;
    }
    results.push({ index: neighborIndex, relation });
  }, { applyRange, useRanked: true });

  return results;
}

function countDirectionalNeighbors(anchorIndex, options = {}) {
  const {
    applyFilters = false,
    applyRange = true,
  } = options;
  return collectDirectionalNeighbors(anchorIndex, {
    applyFilters,
    applyRange,
    restrictToView: false,
  }).length;
}

function collectSourceVersesByRefCountRange(limit = MAX_ALL_MODE_RANGE_CHIPS) {
  const { offsets } = getAdjacencyStore(true);
  const totalVerses = state.data.totalVerses;
  const capped = Math.max(0, Math.floor(limit));
  const matches = [];
  let totalMatches = 0;

  for (let position = 0; position < totalVerses; position += 1) {
    const verseIndex = getVerseAtPosition(position);
    const outgoingCount = offsets[verseIndex + 1] - offsets[verseIndex];
    if (outgoingCount < state.edgeRankMin || outgoingCount > state.edgeRankMax) {
      continue;
    }
    totalMatches += 1;
    if (matches.length < capped) {
      matches.push({
        index: verseIndex,
        outgoingCount,
      });
    }
  }

  return {
    totalMatches,
    matches,
  };
}

function buildIncomingCounts(totalVerses, outgoingTargets) {
  const incomingCounts = new Uint32Array(totalVerses);
  for (let i = 0; i < outgoingTargets.length; i += 1) {
    incomingCounts[outgoingTargets[i]] += 1;
  }

  return incomingCounts;
}

function buildRankedAdjacency(totalVerses, offsets, values, verseDegree) {
  const rankedOffsets = new Uint32Array(totalVerses + 1);
  const rankedValues = new Uint32Array(values.length);
  let writeCursor = 0;

  for (let fromIndex = 0; fromIndex < totalVerses; fromIndex += 1) {
    const start = offsets[fromIndex];
    const end = offsets[fromIndex + 1];
    const neighbors = [];
    for (let i = start; i < end; i += 1) {
      neighbors.push(values[i]);
    }

    neighbors.sort((left, right) => {
      const degreeDelta = verseDegree[right] - verseDegree[left];
      if (degreeDelta !== 0) {
        return degreeDelta;
      }
      const distanceDelta = Math.abs(left - fromIndex) - Math.abs(right - fromIndex);
      if (distanceDelta !== 0) {
        return distanceDelta;
      }
      return left - right;
    });

    for (const neighbor of neighbors) {
      rankedValues[writeCursor] = neighbor;
      writeCursor += 1;
    }
    rankedOffsets[fromIndex + 1] = writeCursor;
  }

  return {
    rankedOffsets,
    rankedValues,
  };
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
  sizeSelectToWidestOption(filterColoringEl);
}

function applyFiltersFromControls() {
  state.filters.targetTestament = filterTestamentEl.value;
  state.filters.targetBook = filterBookEl.value;
  state.filters.targetChapter = filterChapterEl.value;
  state.filters.scope = filterScopeEl.value;
  if (filterColoringEl) {
    setArcColoring(filterColoringEl.value, { queue: false, save: false, refreshInfo: false });
  } else {
    syncArcColorToggleButtons(state.filters.arcColoring);
  }
  updateHasActiveFilters();
  updateInfoPanel();
  saveUiPreferences();
  queueRender();
}

function clearFilters() {
  filterTestamentEl.value = "all";
  filterBookEl.value = "all";
  filterChapterEl.value = "all";
  filterScopeEl.value = "all";
  if (filterColoringEl) {
    filterColoringEl.value = "classic";
  }
  setArcColoring("classic", { queue: false, save: false, refreshInfo: false });
  applyEdgeRankRange(1, state.edgeRankLimit, { queue: false });
  applyFiltersFromControls();
}

function applyEdgeRankRange(minValue, maxValue, options = {}) {
  const {
    queue = true,
  } = options;

  const rankLimit = Math.max(1, state.edgeRankLimit || DEFAULT_EDGE_RANK_MAX);
  const boundedMin = clamp(Math.round(Number(minValue) || 1), 1, rankLimit);
  const boundedMax = clamp(Math.round(Number(maxValue) || rankLimit), 1, rankLimit);

  state.edgeRankMin = Math.min(boundedMin, boundedMax);
  state.edgeRankMax = Math.max(boundedMin, boundedMax);

  if (strengthMinSliderEl) {
    strengthMinSliderEl.value = String(state.edgeRankMin);
  }
  if (strengthMaxSliderEl) {
    strengthMaxSliderEl.value = String(state.edgeRankMax);
  }
  updateHasActiveFilters();
  updateStrengthLabel();
  updateInfoPanel();
  if (queue) {
    queueRender();
  }
}

function togglePinnedVerse(index) {
  const bounded = clamp(index, 0, state.data.totalVerses - 1);
  const existingIndex = state.pinnedIndices.indexOf(bounded);
  if (existingIndex >= 0) {
    state.pinnedIndices.splice(existingIndex, 1);
    updateMultiPinButton();
    updateSelectedVersePinButton();
    return false;
  }

  state.pinnedIndices.push(bounded);
  if (state.pinnedIndices.length > MAX_MULTI_PINS) {
    state.pinnedIndices.shift();
  }
  updateMultiPinButton();
  updateSelectedVersePinButton();
  return true;
}

function setMultiPinMode(enabled) {
  const nextEnabled = Boolean(enabled);
  if (!nextEnabled) {
    if (state.mode === "multi") {
      state.mode = "single";
      state.singlePinned = true;
    }
    if (state.pinnedIndices.length > 0) {
      state.selectedIndex = state.pinnedIndices[state.pinnedIndices.length - 1];
      syncSliderToSelectedVerse();
      setVerseInputValue(formatInputRef(state.data.verseRefs[state.selectedIndex]));
    }
    showAllBtnEl.setAttribute("aria-pressed", "false");
    updateMultiPinButton();
    updateSelectedVersePinButton();
    updateInfoPanel();
    queueRender();
    return;
  }

  state.mode = "multi";
  state.singlePinned = true;
  if (!state.pinnedIndices.length) {
    state.pinnedIndices.push(state.selectedIndex);
  } else if (!state.pinnedIndices.includes(state.selectedIndex)) {
    state.pinnedIndices.push(state.selectedIndex);
  }
  if (state.pinnedIndices.length > MAX_MULTI_PINS) {
    state.pinnedIndices = state.pinnedIndices.slice(-MAX_MULTI_PINS);
  }
  showAllBtnEl.setAttribute("aria-pressed", "false");
  updateMultiPinButton();
  updateSelectedVersePinButton();
  updateInfoPanel();
  queueRender();
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
  cancelPanAnimation();
  state.mode = mode;
  if (mode !== "all") {
    state.allModeRangeListOpen = false;
  }
  if (mode !== "all") {
    state.allModeRenderedArcs = [];
    hideArcHoverTooltip();
  }
  if (mode === "all") {
    state.singlePinned = false;
  } else if (mode === "single") {
    state.singlePinned = false;
  }
  showAllBtnEl.setAttribute("aria-pressed", mode === "all" ? "true" : "false");
  updateMultiPinButton();
  updateSelectedVersePinButton();
  updatePanButtons();
  updateInfoPanel();
  queueRender();
}

function updateResetZoomControl() {
  if (!state.data) {
    if (panLeftBtnEl) {
      panLeftBtnEl.disabled = true;
    }
    if (panRightBtnEl) {
      panRightBtnEl.disabled = true;
    }
    return;
  }
  const zoomed = state.viewStart !== 0 || state.viewEnd !== state.data.totalVerses - 1;
  resetZoomBtnEl.classList.toggle("hidden", !zoomed);
  resetZoomBtnEl.disabled = !zoomed;
  updatePanButtons();
}

function updatePanButtons() {
  if (!panLeftBtnEl || !panRightBtnEl || !state.data || !state.layout) {
    if (panLeftBtnEl) {
      panLeftBtnEl.disabled = true;
    }
    if (panRightBtnEl) {
      panRightBtnEl.disabled = true;
    }
    return;
  }
  const hasMultipleSections = state.layout.visibleCount < state.data.totalVerses;
  const canPan = state.mode === "all" && hasMultipleSections;
  panLeftBtnEl.disabled = !canPan || state.viewStart <= 0;
  panRightBtnEl.disabled = !canPan || state.viewEnd >= state.data.totalVerses - 1;
}

function cancelPanAnimation() {
  if (state.panAnimationFrame !== null) {
    window.cancelAnimationFrame(state.panAnimationFrame);
    state.panAnimationFrame = null;
  }
}

function easeInOutCubic(value) {
  const t = clamp(value, 0, 1);
  if (t < 0.5) {
    return 4 * t * t * t;
  }
  return 1 - (Math.pow(-2 * t + 2, 3) / 2);
}

function animatePanBySection(direction) {
  if (!state.data || !state.layout || state.mode !== "all") {
    return;
  }
  const normalizedDirection = direction < 0 ? -1 : 1;
  const total = state.data.totalVerses;
  const visibleCount = state.layout.visibleCount;
  if (visibleCount >= total) {
    return;
  }
  const maxStart = Math.max(0, total - visibleCount);
  const sectionStep = Math.max(1, Math.floor(visibleCount * PAN_SECTION_RATIO));
  const targetStart = clamp(state.viewStart + normalizedDirection * sectionStep, 0, maxStart);
  if (targetStart === state.viewStart) {
    return;
  }

  cancelPanAnimation();
  const startViewStart = state.viewStart;
  const delta = targetStart - startViewStart;
  const duration = clamp(
    PAN_ANIMATION_BASE_MS + Math.abs(delta) * PAN_ANIMATION_MS_PER_VERSE,
    PAN_ANIMATION_MIN_MS,
    PAN_ANIMATION_MAX_MS,
  );
  let animationStart = null;

  const step = (timestamp) => {
    if (animationStart === null) {
      animationStart = timestamp;
    }
    const progress = clamp((timestamp - animationStart) / duration, 0, 1);
    const easedProgress = easeInOutCubic(progress);
    const nextStart = clamp(Math.round(startViewStart + delta * easedProgress), 0, maxStart);
    state.viewStart = nextStart;
    state.viewEnd = nextStart + visibleCount - 1;
    buildLayout();
    render();

    if (progress < 1) {
      state.panAnimationFrame = window.requestAnimationFrame(step);
      return;
    }
    state.panAnimationFrame = null;
    updateInfoPanel();
  };

  state.panAnimationFrame = window.requestAnimationFrame(step);
}

function buildLayout(options = {}) {
  const {
    widthOverride = null,
    heightOverride = null,
    dprOverride = null,
    applyStyleSize = true,
  } = options;
  const hasWidthOverride = widthOverride !== null && widthOverride !== undefined && Number.isFinite(Number(widthOverride));
  const hasHeightOverride = heightOverride !== null && heightOverride !== undefined && Number.isFinite(Number(heightOverride));
  const hasDprOverride = dprOverride !== null && dprOverride !== undefined && Number.isFinite(Number(dprOverride));
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = hasWidthOverride
    ? Math.max(320, Math.floor(Number(widthOverride)))
    : Math.max(320, Math.floor(rect.width));
  const height = hasHeightOverride
    ? Math.max(500, Math.floor(Number(heightOverride)))
    : Math.max(500, Math.min(980, Math.floor(window.innerHeight * 0.82)));
  const dpr = hasDprOverride
    ? Math.max(1, Number(dprOverride))
    : Math.min(window.devicePixelRatio || 1, 2);

  const pixelWidth = Math.floor(width * dpr);
  const pixelHeight = Math.floor(height * dpr);
  if (canvas.width !== pixelWidth) {
    canvas.width = pixelWidth;
  }
  if (canvas.height !== pixelHeight) {
    canvas.height = pixelHeight;
  }
  if (applyStyleSize) {
    canvas.style.height = `${height}px`;
    canvas.style.width = `${width}px`;
  }

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const outerLeft = 24;
  const outerRight = 24;
  const top = 18;
  const bottom = 18;
  const outerAxisWidth = width - outerLeft - outerRight;
  const axisWidth = Math.max(1, outerAxisWidth * state.timelineWidthScale);
  const sideInset = (outerAxisWidth - axisWidth) * 0.5;
  const left = outerLeft + sideInset;
  const right = outerRight + sideInset;
  const baselineY = Math.round(height * 0.5);
  const barsHeight = 14;
  const barsY = baselineY - Math.floor(barsHeight / 2);
  const totalVerses = state.data.totalVerses;
  const visibleCount = Math.max(1, state.viewEnd - state.viewStart + 1);
  const sortedYears = isYearOrderedMode() ? getActiveSortedYearsByPosition() : null;

  let yearScale = null;
  if (
    sortedYears
    && sortedYears.length === totalVerses
    && state.viewEnd >= state.viewStart
  ) {
    const startYear = sortedYears[state.viewStart];
    const endYear = sortedYears[state.viewEnd];
    const minYear = Math.min(startYear, endYear);
    const maxYear = Math.max(startYear, endYear);
    const hasSpan = maxYear > minYear;
    const span = Math.max(1, maxYear - minYear);
    const yearAtPosition = (position) => {
      const clampedPosition = clamp(position, state.viewStart, state.viewEnd);
      return sortedYears[clampedPosition];
    };
    const xForYear = (yearValue) => {
      if (!hasSpan) {
        return left + (axisWidth * 0.5);
      }
      return left + ((yearValue - minYear) / span) * axisWidth;
    };
    const positionXByOffset = new Float64Array(visibleCount);
    if (!hasSpan) {
      for (let position = state.viewStart; position <= state.viewEnd; position += 1) {
        const offset = position - state.viewStart;
        const ratio = visibleCount <= 1
          ? 0.5
          : offset / (visibleCount - 1);
        positionXByOffset[offset] = left + (ratio * axisWidth);
      }
    } else {
      let cursor = state.viewStart;
      while (cursor <= state.viewEnd) {
        const yearValue = sortedYears[cursor];
        let clusterEnd = cursor;
        while (clusterEnd < state.viewEnd && sortedYears[clusterEnd + 1] === yearValue) {
          clusterEnd += 1;
        }

        const clusterCount = clusterEnd - cursor + 1;
        const yearCenterX = xForYear(yearValue);
        const leftBoundary = cursor > state.viewStart
          ? (xForYear(sortedYears[cursor - 1]) + yearCenterX) * 0.5
          : left;
        const rightBoundary = clusterEnd < state.viewEnd
          ? (yearCenterX + xForYear(sortedYears[clusterEnd + 1])) * 0.5
          : (left + axisWidth);
        const segmentWidth = Math.max(0, rightBoundary - leftBoundary);

        if (clusterCount === 1 || segmentWidth <= 1e-6) {
          positionXByOffset[cursor - state.viewStart] = clamp(yearCenterX, leftBoundary, rightBoundary);
        } else {
          const step = segmentWidth / clusterCount;
          for (let index = 0; index < clusterCount; index += 1) {
            const position = cursor + index;
            positionXByOffset[position - state.viewStart] = leftBoundary + ((index + 0.5) * step);
          }
        }
        cursor = clusterEnd + 1;
      }
    }

    const xForPosition = (position) => {
      const clampedPosition = clamp(position, state.viewStart, state.viewEnd);
      return positionXByOffset[clampedPosition - state.viewStart];
    };
    const findInterpolatedPositionForX = (targetX) => {
      const clampedX = clamp(targetX, left, left + axisWidth);
      if (visibleCount <= 1) {
        return state.viewStart;
      }
      if (clampedX <= positionXByOffset[0]) {
        return state.viewStart;
      }
      const lastOffset = visibleCount - 1;
      if (clampedX >= positionXByOffset[lastOffset]) {
        return state.viewEnd;
      }

      let low = 0;
      let high = lastOffset;
      let lowerBound = lastOffset;
      while (low <= high) {
        const middle = low + Math.floor((high - low) / 2);
        if (positionXByOffset[middle] >= clampedX) {
          lowerBound = middle;
          high = middle - 1;
        } else {
          low = middle + 1;
        }
      }

      const rightOffset = clamp(lowerBound, 0, lastOffset);
      const leftOffset = clamp(rightOffset - 1, 0, lastOffset);
      const leftX = positionXByOffset[leftOffset];
      const rightX = positionXByOffset[rightOffset];
      const spanX = Math.max(1e-9, rightX - leftX);
      const ratio = clamp((clampedX - leftX) / spanX, 0, 1);
      return state.viewStart + leftOffset + ratio;
    };
    const findNearestPositionForX = (targetX) => {
      const interpolatedPosition = findInterpolatedPositionForX(targetX);
      const leftPosition = clamp(Math.floor(interpolatedPosition), state.viewStart, state.viewEnd);
      const rightPosition = clamp(Math.ceil(interpolatedPosition), state.viewStart, state.viewEnd);
      if (leftPosition === rightPosition) {
        return leftPosition;
      }
      const clampedX = clamp(targetX, left, left + axisWidth);
      const leftDistance = Math.abs(xForPosition(leftPosition) - clampedX);
      const rightDistance = Math.abs(xForPosition(rightPosition) - clampedX);
      return leftDistance <= rightDistance ? leftPosition : rightPosition;
    };
    yearScale = {
      sortedYears,
      minYear,
      maxYear,
      span,
      hasSpan,
      yearAtPosition,
      xForYear,
      xForPosition,
      findInterpolatedPositionForX,
      findNearestPositionForX,
    };
  }

  const xCenterForPosition = (position) => {
    if (yearScale) {
      return yearScale.xForPosition(position);
    }
    return left + ((position - state.viewStart) / (visibleCount - 1 || 1)) * axisWidth;
  };

  const xCenterForVerse = (verseIndex) => {
    const position = getPositionForVerse(verseIndex);
    return xCenterForPosition(position);
  };

  const xEdgeForPositionBoundary = (boundaryPosition) => {
    if (yearScale) {
      if (boundaryPosition <= state.viewStart) {
        return left;
      }
      if (boundaryPosition >= state.viewEnd + 1) {
        return left + axisWidth;
      }
      const leftPosition = clamp(boundaryPosition - 1, state.viewStart, state.viewEnd);
      const rightPosition = clamp(boundaryPosition, state.viewStart, state.viewEnd);
      const leftX = yearScale.xForYear(yearScale.yearAtPosition(leftPosition));
      const rightX = yearScale.xForYear(yearScale.yearAtPosition(rightPosition));
      return (leftX + rightX) * 0.5;
    }
    return left + ((boundaryPosition - state.viewStart) / visibleCount) * axisWidth;
  };

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
    yearScale,
    xCenterForVerse,
    xCenterForPosition,
    xEdgeForPositionBoundary,
  };
  syncSliderToSelectedVerse();
  updateResetZoomControl();
}

function positionFromClientX(clientX, options = {}) {
  const { snap = false } = options;
  if (!state.layout) {
    return getPositionForVerse(state.selectedIndex);
  }
  const rect = canvas.getBoundingClientRect();
  const localX = clientX - rect.left;
  const { left, axisWidth, yearScale } = state.layout;
  const safeAxisWidth = Math.max(1e-6, axisWidth);
  const normalized = clamp((localX - left) / safeAxisWidth, 0, 1);

  if (yearScale) {
    const targetX = left + (normalized * safeAxisWidth);
    if (snap) {
      return yearScale.findNearestPositionForX(targetX);
    }
    if (yearScale.findInterpolatedPositionForX) {
      return yearScale.findInterpolatedPositionForX(targetX);
    }
    return yearScale.findNearestPositionForX(targetX);
  }

  const span = Math.max(0, state.layout.visibleCount - 1);
  const position = state.viewStart + normalized * span;
  if (snap) {
    return clamp(Math.round(position), state.viewStart, state.viewEnd);
  }
  return clamp(position, state.viewStart, state.viewEnd);
}

function verseIndexFromClientX(clientX) {
  const nearestPosition = positionFromClientX(clientX, { snap: true });
  return getVerseAtPosition(nearestPosition);
}

function resetView() {
  cancelPanAnimation();
  state.viewStart = 0;
  state.viewEnd = state.data.totalVerses - 1;
  buildLayout();
}

function setViewAroundAnchor(anchorPosition, nextVisibleCount) {
  cancelPanAnimation();
  const total = state.data.totalVerses;
  const clampedCount = clamp(Math.round(nextVisibleCount), 1, total);
  const boundedAnchorPosition = clamp(Number(anchorPosition), 0, total - 1);
  const ratio = clamp((boundedAnchorPosition - state.viewStart) / Math.max(1, state.layout.visibleCount - 1), 0, 1);

  let nextStart = Math.round(boundedAnchorPosition - ratio * (clampedCount - 1));
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

function queueWheelZoom(anchorPosition, deltaY) {
  cancelPanAnimation();
  const numericAnchorPosition = Number(anchorPosition);
  if (state.wheelZoomAnchorResetTimer === null && Number.isFinite(numericAnchorPosition)) {
    state.wheelZoomAnchorPosition = numericAnchorPosition;
  }
  if (state.wheelZoomAnchorResetTimer !== null) {
    window.clearTimeout(state.wheelZoomAnchorResetTimer);
  }
  state.wheelZoomAnchorResetTimer = window.setTimeout(() => {
    state.wheelZoomAnchorPosition = null;
    state.wheelZoomAnchorResetTimer = null;
  }, 120);

  state.wheelZoomDelta += Number.isFinite(deltaY) ? deltaY : 0;

  if (state.wheelZoomFrameRequested) {
    return;
  }
  state.wheelZoomFrameRequested = true;

  window.requestAnimationFrame(() => {
    state.wheelZoomFrameRequested = false;
    if (!state.data || !state.layout || state.mode !== "all") {
      state.wheelZoomDelta = 0;
      if (state.wheelZoomAnchorResetTimer !== null) {
        window.clearTimeout(state.wheelZoomAnchorResetTimer);
        state.wheelZoomAnchorResetTimer = null;
      }
      state.wheelZoomAnchorPosition = null;
      return;
    }

    const accumulatedDelta = state.wheelZoomDelta;
    state.wheelZoomDelta = 0;
    const fallbackAnchorPosition = getPositionForVerse(state.selectedIndex);
    const anchor = Number.isFinite(Number(state.wheelZoomAnchorPosition))
      ? clamp(Number(state.wheelZoomAnchorPosition), 0, state.data.totalVerses - 1)
      : clamp(fallbackAnchorPosition, 0, state.data.totalVerses - 1);

    const zoomFactor = Math.exp(clamp(accumulatedDelta, -220, 220) * 0.0012);
    const nextVisibleCount = state.layout.visibleCount * zoomFactor;
    setViewAroundAnchor(anchor, nextVisibleCount);
    updateInfoPanel();
    queueRender();
  });
}

function ensureIndexVisible(index) {
  const position = getPositionForVerse(index);
  if (position >= state.viewStart && position <= state.viewEnd) {
    return;
  }
  const half = Math.floor(state.layout.visibleCount / 2);
  const targetStart = clamp(position - half, 0, state.data.totalVerses - state.layout.visibleCount);
  state.viewStart = targetStart;
  state.viewEnd = targetStart + state.layout.visibleCount - 1;
  buildLayout();
}

function setSelectedVerse(index, options = {}) {
  const { updateInput = true, activateSingle = true } = options;
  const bounded = clamp(index, 0, state.data.totalVerses - 1);
  if (bounded === state.selectedIndex && updateInput) {
    setVerseInputValue(formatInputRef(state.data.verseRefs[bounded]));
  }
  if (bounded === state.selectedIndex && !updateInput && (!activateSingle || state.mode === "single")) {
    return;
  }

  if (activateSingle && state.mode !== "multi") {
    state.mode = "single";
    state.singlePinned = false;
    showAllBtnEl.setAttribute("aria-pressed", "false");
    updateMultiPinButton();
    updateSelectedVersePinButton();
  }

  state.selectedIndex = bounded;
  syncSliderToSelectedVerse();

  if (state.layout) {
    ensureIndexVisible(bounded);
  }

  if (updateInput) {
    setVerseInputValue(formatInputRef(state.data.verseRefs[bounded]));
  }

  updateSelectedVersePinButton();
  updateInfoPanel();
  queueRender();
}

function updateInfoPanel() {
  const { verseRefs } = state.data;
  const filterSummary = describeActiveFilters();
  const refCountLabel = formatEdgeRangeLabel();
  const orderLabel = formatOrderModeLabel(state.orderMode);
  updateSelectedVersePinButton();

  if (state.mode === "all") {
    const refCountRangeActive = state.edgeRankMin !== 1 || state.edgeRankMax !== state.edgeRankLimit;
    let timelineEventSummary = "";
    if (state.orderMode === "timeline" && state.timelineEventAnchors) {
      const visibleEvents = collectTimelineVisibleEvents();
      const detailCaps = getTimelineDetailCaps();
      timelineEventSummary = ` Timeline events in view: ${visibleEvents.length.toLocaleString()} (markers up to ${detailCaps.maxMarkers.toLocaleString()}, labels up to ${detailCaps.maxLabels.toLocaleString()}).`;
    }
    selectedLineEl.textContent = `Showing: All verse-to-verse arcs (${state.data.totalVerses.toLocaleString()} verses)`;
    referenceLineEl.textContent = `Wheel to zoom at cursor. Use the top arrows to pan sections. Source refs/verse range: ${refCountLabel}. Max refs/verse: ${state.edgeRankLimit.toLocaleString()}. Filters: ${filterSummary}. Order: ${orderLabel}.${timelineEventSummary}`;
    targetListEl.innerHTML = "";
    if (refCountRangeActive) {
      const { totalMatches, matches } = collectSourceVersesByRefCountRange(MAX_ALL_MODE_RANGE_CHIPS);
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "chip";
      toggle.textContent = state.allModeRangeListOpen
        ? `Hide Range Matches (${totalMatches.toLocaleString()})`
        : `Show Range Matches (${totalMatches.toLocaleString()})`;
      toggle.addEventListener("click", () => {
        state.allModeRangeListOpen = !state.allModeRangeListOpen;
        updateInfoPanel();
      });
      targetListEl.append(toggle);

      if (state.allModeRangeListOpen) {
        if (totalMatches === 0) {
          const none = document.createElement("span");
          none.className = "chip";
          none.textContent = "No source verses match current refs/verse range";
          none.style.cursor = "default";
          targetListEl.append(none);
        } else {
          for (const match of matches) {
            const chip = document.createElement("button");
            chip.type = "button";
            chip.className = "chip";
            chip.textContent = `${formatRef(verseRefs[match.index])} (${match.outgoingCount})`;
            chip.addEventListener("click", () => {
              setSelectedVerse(match.index);
            });
            targetListEl.append(chip);
          }
          if (totalMatches > matches.length) {
            const more = document.createElement("span");
            more.className = "chip";
            more.textContent = `+${(totalMatches - matches.length).toLocaleString()} more (cap ${MAX_ALL_MODE_RANGE_CHIPS})`;
            more.style.cursor = "default";
            targetListEl.append(more);
          }
        }
      }
    } else {
      state.allModeRangeListOpen = false;
    }
    selectedVerseTextEl.textContent = "Click a verse or use search to view the exact KJV verse text here.";
    updateSelectedVerseEventSummary(state.selectedIndex, { mode: "all" });
    return;
  }

  if (state.mode === "multi") {
    const pinned = [...state.pinnedIndices];
    const pinLabels = pinned
      .slice(0, 5)
      .map((index) => formatRef(verseRefs[index]));
    const hiddenPinCount = Math.max(0, pinned.length - pinLabels.length);
    const selectedRef = verseRefs[state.selectedIndex];

    const pinSets = pinned.map((index) => {
      const neighbors = collectDirectionalNeighbors(index, {
        applyFilters: true,
        applyRange: true,
        restrictToView: false,
      });
      return new Set(neighbors.map((item) => item.index));
    });

    let sharedTargets = [];
    if (pinSets.length > 0) {
      sharedTargets = Array.from(pinSets[0]).filter((targetIndex) => {
        for (let i = 1; i < pinSets.length; i += 1) {
          if (!pinSets[i].has(targetIndex)) {
            return false;
          }
        }
        return true;
      });
      sharedTargets.sort((a, b) => getPositionForVerse(a) - getPositionForVerse(b));
    }

    const pinSummary = pinLabels.length ? pinLabels.join(" | ") : "none";
    const overflowSuffix = hiddenPinCount > 0 ? ` | +${hiddenPinCount} more` : "";
    selectedLineEl.textContent = `Pinned: ${pinSummary}${overflowSuffix}`;
    referenceLineEl.textContent = `Shared outgoing references: ${sharedTargets.length.toLocaleString()} | Pins: ${pinned.length}/${MAX_MULTI_PINS} | Source refs/verse range: ${refCountLabel} | Max refs/verse: ${state.edgeRankLimit.toLocaleString()} | Filters: ${filterSummary} | Order: ${orderLabel}`;
    selectedVerseTextEl.textContent = state.kjvVerses?.[state.selectedIndex] || "KJV text unavailable for this verse.";
    updateSelectedVerseEventSummary(state.selectedIndex, { mode: "multi" });

    targetListEl.innerHTML = "";
    const appendTargetListSubtitle = (label) => {
      const subtitle = document.createElement("span");
      subtitle.className = "target-list-subtitle";
      subtitle.textContent = label;
      targetListEl.append(subtitle);
    };

    appendTargetListSubtitle("Pins:");
    for (const pinnedIndex of pinned) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = `${formatRef(verseRefs[pinnedIndex])} (remove)`;
      chip.addEventListener("click", () => {
        const idx = state.pinnedIndices.indexOf(pinnedIndex);
        if (idx >= 0) {
          state.pinnedIndices.splice(idx, 1);
          if (state.selectedIndex === pinnedIndex && state.pinnedIndices.length > 0) {
            state.selectedIndex = state.pinnedIndices[state.pinnedIndices.length - 1];
            setVerseInputValue(formatInputRef(state.data.verseRefs[state.selectedIndex]));
            syncSliderToSelectedVerse();
          }
        }
        if (state.pinnedIndices.length === 0) {
          state.mode = "single";
          state.singlePinned = true;
        }
        updateMultiPinButton();
        updateInfoPanel();
        queueRender();
      });
      targetListEl.append(chip);
    }

    appendTargetListSubtitle("Shared:");
    const maxSharedShown = 96;
    const sharedShown = Math.min(maxSharedShown, sharedTargets.length);
    for (let i = 0; i < sharedShown; i += 1) {
      const targetIndex = sharedTargets[i];
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = formatRef(verseRefs[targetIndex]);
      chip.addEventListener("click", () => {
        setSelectedVerse(targetIndex, { activateSingle: false });
      });
      targetListEl.append(chip);
    }

    if (sharedTargets.length > sharedShown) {
      const more = document.createElement("span");
      more.className = "chip";
      more.textContent = `+${(sharedTargets.length - sharedShown).toLocaleString()} shared more`;
      more.style.cursor = "default";
      targetListEl.append(more);
    }
    if (sharedTargets.length === 0) {
      const none = document.createElement("span");
      none.className = "chip";
      none.textContent = "No shared references under current filters/cap";
      none.style.cursor = "default";
      targetListEl.append(none);
    }

    if (selectedRef) {
      setVerseInputValue(formatInputRef(selectedRef));
    }
    return;
  }

  const selectedRef = verseRefs[state.selectedIndex];
  const totalTargets = countDirectionalNeighbors(state.selectedIndex, {
    applyFilters: false,
    applyRange: false,
  });
  const filteredTargets = collectDirectionalNeighbors(state.selectedIndex, {
    applyFilters: true,
    applyRange: true,
    restrictToView: false,
  });
  filteredTargets.sort((left, right) => getPositionForVerse(left.index) - getPositionForVerse(right.index));
  const filteredCount = filteredTargets.length;
  const hoverState = state.singlePinned ? "frozen (click map to unfreeze)" : "live hover (click map to freeze)";
  const selectedPosition = getPositionForVerse(state.selectedIndex) + 1;

  const exactYear = state.verseYearExact?.[state.selectedIndex];
  const resolvedYear = state.verseYearResolved?.[state.selectedIndex];
  const resolutionSource = state.verseYearResolution?.[state.selectedIndex];
  const selectedEvents = getEventsForVerse(state.selectedIndex);
  let yearSummary = "";
  if (Number.isFinite(exactYear)) {
    yearSummary = ` | Date: ${formatYearLabel(exactYear)} (exact yearNum)`;
  } else if (Number.isFinite(resolvedYear)) {
    let sourceLabel = "nearest dated verse";
    if (resolutionSource === 1) {
      sourceLabel = "same chapter fallback";
    } else if (resolutionSource === 2) {
      sourceLabel = "same book fallback";
    } else if (resolutionSource === 3) {
      sourceLabel = "global nearest fallback";
    }
    yearSummary = ` | Date: ${formatYearLabel(resolvedYear)} (${sourceLabel})`;
  }

  selectedLineEl.textContent = `Selected: ${formatRef(selectedRef)} (${selectedPosition}/${state.data.totalVerses}, ${orderLabel})`;
  referenceLineEl.textContent = `Outgoing references: ${filteredCount.toLocaleString()} shown of ${totalTargets.toLocaleString()} | ${hoverState} | Source refs/verse range: ${refCountLabel} | Max refs/verse: ${state.edgeRankLimit.toLocaleString()} | Filters: ${filterSummary}${yearSummary} | Events: ${selectedEvents.length}`;
  selectedVerseTextEl.textContent = state.kjvVerses?.[state.selectedIndex] || "KJV text unavailable for this verse.";
  updateSelectedVerseEventSummary(state.selectedIndex, { mode: "single" });

  targetListEl.innerHTML = "";
  const maxShown = 120;
  const shownCount = Math.min(maxShown, filteredCount);

  for (let i = 0; i < shownCount; i += 1) {
    const targetIndex = filteredTargets[i].index;
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = formatRef(verseRefs[targetIndex]);
    chip.addEventListener("click", () => {
      setSelectedVerse(targetIndex);
    });
    targetListEl.append(chip);
  }

  if (shownCount === 0) {
    const none = document.createElement("span");
    none.className = "chip";
    none.textContent = "No references match current direction/filters/cap";
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

function getArcPeakHeight(distance, maxArcHeight) {
  // 100% maps to semicircle height (peak = half the chord length).
  const circularPeak = distance * 0.5 * state.arcHeightScale;
  return clamp(circularPeak, 1.5, maxArcHeight);
}

function drawHalfEllipseArc(fromX, toX, baselineY, peakHeight, direction) {
  const radiusX = Math.abs(toX - fromX) * 0.5;
  if (radiusX <= 0.001) {
    return null;
  }
  const centerX = (fromX + toX) * 0.5;
  const fromLeftToRight = fromX <= toX;
  const startAngle = fromLeftToRight ? Math.PI : 0;
  const endAngle = fromLeftToRight ? 0 : Math.PI;
  const anticlockwise = fromLeftToRight ? direction > 0 : direction < 0;

  ctx.beginPath();
  ctx.moveTo(fromX, baselineY);
  ctx.ellipse(
    centerX,
    baselineY,
    radiusX,
    peakHeight,
    0,
    startAngle,
    endAngle,
    anticlockwise,
  );
  ctx.stroke();

  return {
    centerX,
    halfDx: (fromX - toX) * 0.5,
    radiusY: peakHeight,
  };
}

function getVerseDistanceRatio(fromIndex, targetIndex) {
  const total = Math.max(1, state.data.totalVerses - 1);
  const fromPosition = getPositionForVerse(fromIndex);
  const targetPosition = getPositionForVerse(targetIndex);
  return clamp(Math.abs(targetPosition - fromPosition) / total, 0, 1);
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

function useDistanceBrightnessArcColoring() {
  return state.filters.arcColoring === "distance-brightness";
}

function getDistanceSpectrumColor(distanceRatio) {
  const stops = [
    { at: 0, hue: 276, saturation: 74, lightness: 56 },
    { at: 0.18, hue: 236, saturation: 79, lightness: 60 },
    { at: 0.38, hue: 196, saturation: 82, lightness: 63 },
    { at: 0.58, hue: 148, saturation: 84, lightness: 66 },
    { at: 0.76, hue: 95, saturation: 88, lightness: 70 },
    { at: 0.9, hue: 36, saturation: 90, lightness: 74 },
    { at: 1, hue: 8, saturation: 88, lightness: 76 },
  ];
  const clamped = clamp(distanceRatio, 0, 1);
  for (let index = 1; index < stops.length; index += 1) {
    const right = stops[index];
    if (clamped > right.at) {
      continue;
    }
    const left = stops[index - 1];
    const span = Math.max(1e-6, right.at - left.at);
    const t = (clamped - left.at) / span;
    return {
      hue: left.hue + (right.hue - left.hue) * t,
      saturation: left.saturation + (right.saturation - left.saturation) * t,
      lightness: left.lightness + (right.lightness - left.lightness) * t,
    };
  }
  const last = stops[stops.length - 1];
  return {
    hue: last.hue,
    saturation: last.saturation,
    lightness: last.lightness,
  };
}

function getDistanceBrightnessArcStroke(distanceRatio) {
  const easedDistance = Math.pow(clamp(distanceRatio, 0, 1), 0.86);
  const color = getDistanceSpectrumColor(easedDistance);
  const tonedSaturation = clamp(color.saturation * 0.86, 0, 100);
  const tonedLightness = clamp(color.lightness * 0.82, 0, 100);
  return `hsla(${color.hue}, ${tonedSaturation}%, ${tonedLightness}%, 1)`;
}

function getDirectionalArcStrokeStyle({
  fromX,
  toX,
  baselineY,
  direction,
  hue,
  saturation,
  lightness,
  alpha,
  topSourceFactor = 0.28,
  topMiddleFactor = 0.62,
  topTargetFactor = 1.08,
  topMiddleStop = 0.65,
  minAlpha = 0.012,
}) {
  const solid = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;

  // Flip top-half emphasis so strands read as "moving toward" references:
  // lighter/fainter near source, stronger near the target endpoint.
  if (direction >= 0) {
    return solid;
  }

  const sourceAlpha = clamp(alpha * topSourceFactor, minAlpha, 1);
  const middleAlpha = clamp(alpha * topMiddleFactor, minAlpha, 1);
  const targetAlpha = clamp(alpha * topTargetFactor, minAlpha, 1);

  const gradient = ctx.createLinearGradient(fromX, baselineY, toX, baselineY);
  gradient.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${sourceAlpha})`);
  gradient.addColorStop(topMiddleStop, `hsla(${hue}, ${saturation}%, ${lightness}%, ${middleAlpha})`);
  gradient.addColorStop(1, `hsla(${hue}, ${saturation}%, ${lightness}%, ${targetAlpha})`);
  return gradient;
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

function findFirstTimelinePositionForYear(yearTarget, startPosition, endPosition, sortedYears) {
  if (!sortedYears || sortedYears[endPosition] < yearTarget) {
    return -1;
  }

  let low = startPosition;
  let high = endPosition;
  let answer = endPosition;
  while (low <= high) {
    const middle = low + Math.floor((high - low) / 2);
    if (sortedYears[middle] >= yearTarget) {
      answer = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }
  return answer;
}

function findNearestTimelinePositionForYear(yearTarget, startPosition, endPosition, sortedYears) {
  if (!sortedYears || startPosition > endPosition) {
    return -1;
  }
  if (yearTarget <= sortedYears[startPosition]) {
    return startPosition;
  }
  if (yearTarget >= sortedYears[endPosition]) {
    return endPosition;
  }

  let low = startPosition;
  let high = endPosition;
  let lowerBound = endPosition;
  while (low <= high) {
    const middle = low + Math.floor((high - low) / 2);
    if (sortedYears[middle] >= yearTarget) {
      lowerBound = middle;
      high = middle - 1;
    } else {
      low = middle + 1;
    }
  }

  const rightPosition = clamp(lowerBound, startPosition, endPosition);
  const leftPosition = clamp(rightPosition - 1, startPosition, endPosition);
  const rightDistance = Math.abs(sortedYears[rightPosition] - yearTarget);
  const leftDistance = Math.abs(sortedYears[leftPosition] - yearTarget);
  return leftDistance <= rightDistance ? leftPosition : rightPosition;
}

function drawTimelineEventMarkers() {
  if (!state.timelineEventAnchors || state.timelineEventAnchors.length === 0) {
    return;
  }

  const {
    barsY,
    barsHeight,
    xCenterForPosition,
  } = state.layout;
  const theme = getThemeStyle();
  const visibleEvents = collectTimelineVisibleEvents();
  const detailCaps = getTimelineDetailCaps();
  if (visibleEvents.length === 0 || detailCaps.maxMarkers <= 0) {
    return;
  }

  const markerEvents = sampleEvenly(visibleEvents, detailCaps.maxMarkers);
  ctx.setLineDash([]);
  ctx.lineWidth = 1;
  ctx.strokeStyle = theme.bookStroke.replace(/[\d.]+\)$/u, "0.45)");
  ctx.fillStyle = theme.bookStroke.replace(/[\d.]+\)$/u, "0.58)");
  for (const eventAnchor of markerEvents) {
    const x = xCenterForPosition(eventAnchor.position);
    ctx.beginPath();
    ctx.moveTo(x, barsY + barsHeight + 3);
    ctx.lineTo(x, barsY + barsHeight + 10);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, barsY + barsHeight + 10, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  if (detailCaps.maxLabels <= 0) {
    return;
  }

  const labelEvents = sampleEvenly(markerEvents, detailCaps.maxLabels);
  const labelRowHeight = 12;
  const baseLabelY = barsY + barsHeight + 24;
  const availableLabelDepth = Math.max(0, state.layout.height - state.layout.bottom - baseLabelY);
  const maxLabelRows = Math.max(1, Math.floor(availableLabelDepth / labelRowHeight) + 1);
  const labelGap = state.layout.visibleCount > 1000 ? 10 : 8;
  const laneLastRight = [];
  ctx.font = "10px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = theme.bookLabel;
  for (const eventAnchor of labelEvents) {
    const x = xCenterForPosition(eventAnchor.position);
    const maxChars = state.layout.visibleCount > 1000 ? 20 : 30;
    const title = eventAnchor.title.length > maxChars
      ? `${eventAnchor.title.slice(0, maxChars - 3)}...`
      : eventAnchor.title;
    const width = ctx.measureText(title).width;
    const left = x - (width * 0.5);
    const right = x + (width * 0.5);

    let laneIndex = -1;
    for (let index = 0; index < laneLastRight.length; index += 1) {
      if (left >= laneLastRight[index] + labelGap) {
        laneIndex = index;
        break;
      }
    }
    if (laneIndex < 0) {
      if (laneLastRight.length < maxLabelRows) {
        laneIndex = laneLastRight.length;
        laneLastRight.push(-Infinity);
      } else {
        let bestIndex = 0;
        let bestOverlap = Number.POSITIVE_INFINITY;
        for (let index = 0; index < laneLastRight.length; index += 1) {
          const overlap = laneLastRight[index] - left;
          if (overlap < bestOverlap) {
            bestOverlap = overlap;
            bestIndex = index;
          }
        }
        laneIndex = bestIndex;
      }
    }

    const y = baseLabelY + (laneIndex * labelRowHeight);
    ctx.fillText(title, x, y);
    laneLastRight[laneIndex] = Math.max(laneLastRight[laneIndex], right);
  }
}

function drawTimelineAxis(options = {}) {
  const { showEvents = false } = options;
  const {
    barsY,
    barsHeight,
    baselineY,
    left,
    right,
    width,
    xCenterForPosition,
  } = state.layout;
  const theme = getThemeStyle();

  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  ctx.strokeStyle = theme.axisStroke;
  ctx.beginPath();
  ctx.moveTo(left, baselineY);
  ctx.lineTo(width - right, baselineY);
  ctx.stroke();

  const sortedYears = state.orderMode === "composition"
    ? state.compositionYearsByPosition
    : state.timelineYearsByPosition;

  if (!sortedYears || state.viewStart >= state.viewEnd) {
    return;
  }

  const startYear = sortedYears[state.viewStart];
  const endYear = sortedYears[state.viewEnd];
  const minYear = Math.min(startYear, endYear);
  const maxYear = Math.max(startYear, endYear);
  if (!Number.isFinite(minYear) || !Number.isFinite(maxYear)) {
    return;
  }

  const span = Math.max(1, maxYear - minYear);
  const roughStep = span / 7;
  const magnitude = 10 ** Math.floor(Math.log10(roughStep || 1));
  const normalized = roughStep / magnitude;
  let step = magnitude;
  if (normalized > 5) {
    step = 10 * magnitude;
  } else if (normalized > 2) {
    step = 5 * magnitude;
  } else if (normalized > 1) {
    step = 2 * magnitude;
  }

  ctx.font = "10px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = theme.bookLabel;
  ctx.strokeStyle = theme.bookStroke;

  let labelYear = Math.ceil(minYear / step) * step;
  let lastLabelX = -Infinity;
  while (labelYear <= maxYear) {
    const position = findFirstTimelinePositionForYear(labelYear, state.viewStart, state.viewEnd, sortedYears);
    if (position >= state.viewStart && position <= state.viewEnd) {
      const x = xCenterForPosition(position);
      if (x - lastLabelX >= 46) {
        ctx.beginPath();
        ctx.moveTo(x, barsY - 4);
        ctx.lineTo(x, barsY + barsHeight + 4);
        ctx.stroke();
        ctx.fillText(formatYearLabel(labelYear), x, barsY - 10);
        lastLabelX = x;
      }
    }
    labelYear += step;
  }

  if (showEvents) {
    drawTimelineEventMarkers();
  }
}

function drawChapterBands() {
  const { barsY, barsHeight, baselineY, xEdgeForPositionBoundary, left, right, width } = state.layout;
  const { books } = state.data;
  const viewStart = state.viewStart;
  const viewEnd = state.viewEnd;
  const theme = getThemeStyle();

  if (state.orderMode === "timeline" || state.orderMode === "composition") {
    drawTimelineAxis({ showEvents: state.orderMode === "timeline" });
    return;
  }

  ctx.lineWidth = 1;
  ctx.setLineDash([]);
  const visibleChapterBands = [];

  for (const chapter of state.chapterBands) {
    if (chapter.end < viewStart || chapter.start > viewEnd) {
      continue;
    }
    const x1 = xEdgeForPositionBoundary(chapter.start);
    const x2 = xEdgeForPositionBoundary(chapter.end + 1);
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
    const chapterId = state.verseToChapterId[chapter.start];
    visibleChapterBands.push({
      chapterId,
      chapterNumber: chapter.chapterIndex + 1,
      centerX: (clampedX1 + clampedX2) * 0.5,
      width: bandWidth,
      hasVerseLabels: false,
    });
  }

  ctx.strokeStyle = theme.axisStroke;
  ctx.beginPath();
  ctx.moveTo(left, baselineY);
  ctx.lineTo(width - right, baselineY);
  ctx.stroke();

  const chapterBandById = new Map();
  for (const chapterBand of visibleChapterBands) {
    chapterBandById.set(chapterBand.chapterId, chapterBand);
  }

  if (state.verseNumberInChapter && viewEnd >= viewStart) {
    ctx.font = "8.5px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = theme.bookLabel;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const verseLabelWidthByNumber = new Map();
    for (let position = viewStart; position <= viewEnd; position += 1) {
      const x1 = xEdgeForPositionBoundary(position);
      const x2 = xEdgeForPositionBoundary(position + 1);
      const clampedX1 = clamp(x1, left, width - right);
      const clampedX2 = clamp(x2, left, width - right);
      const slotWidth = Math.max(0, clampedX2 - clampedX1);
      if (slotWidth <= 0) {
        continue;
      }

      const verseIndex = getVerseAtPosition(position);
      const verseNumber = state.verseNumberInChapter[verseIndex];
      if (!verseNumber) {
        continue;
      }
      const label = String(verseNumber);
      let labelWidth = verseLabelWidthByNumber.get(verseNumber);
      if (labelWidth === undefined) {
        labelWidth = ctx.measureText(label).width;
        verseLabelWidthByNumber.set(verseNumber, labelWidth);
      }
      if (slotWidth < labelWidth + 6) {
        continue;
      }
      const chapterId = state.verseToChapterId[verseIndex];
      const chapterBand = chapterBandById.get(chapterId);
      if (chapterBand) {
        chapterBand.hasVerseLabels = true;
      }
      ctx.fillText(label, (clampedX1 + clampedX2) * 0.5, baselineY);
    }
  }

  if (visibleChapterBands.length > 0) {
    ctx.font = "9px 'Segoe UI', Arial, sans-serif";
    ctx.fillStyle = theme.bookLabel;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const bookLabelY = barsY - 10;
    const chapterLabelBelowY = baselineY + (baselineY - bookLabelY);
    for (const chapterBand of visibleChapterBands) {
      const label = String(chapterBand.chapterNumber);
      const labelWidth = ctx.measureText(label).width;
      if (chapterBand.width >= labelWidth + 4) {
        const chapterLabelY = chapterBand.hasVerseLabels ? chapterLabelBelowY : baselineY;
        ctx.fillText(label, chapterBand.centerX, chapterLabelY);
      }
    }
  }

  ctx.font = "10px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let bookIndex = 0; bookIndex < books.length; bookIndex += 1) {
    const book = books[bookIndex];
    if (book.end < viewStart || book.start > viewEnd) {
      continue;
    }
    const x1 = xEdgeForPositionBoundary(book.start);
    const x2 = xEdgeForPositionBoundary(book.end + 1);
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

function pointToSegmentDistanceSquared(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  if (dx === 0 && dy === 0) {
    const offsetX = px - x1;
    const offsetY = py - y1;
    return offsetX * offsetX + offsetY * offsetY;
  }
  const projection = clamp(((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy), 0, 1);
  const nearestX = x1 + projection * dx;
  const nearestY = y1 + projection * dy;
  const offsetX = px - nearestX;
  const offsetY = py - nearestY;
  return offsetX * offsetX + offsetY * offsetY;
}

function getHalfEllipseDistanceSquared(px, py, baselineY, arc) {
  let previousX = arc.fromX;
  let previousY = baselineY;
  let bestDistanceSquared = Infinity;

  for (let step = 1; step <= arc.pickSegments; step += 1) {
    const t = step / arc.pickSegments;
    const angle = Math.PI * t;
    const pointX = arc.centerX + arc.halfDx * Math.cos(angle);
    const pointY = baselineY + arc.direction * arc.radiusY * Math.sin(angle);
    const segmentDistance = pointToSegmentDistanceSquared(px, py, previousX, previousY, pointX, pointY);
    if (segmentDistance < bestDistanceSquared) {
      bestDistanceSquared = segmentDistance;
    }
    previousX = pointX;
    previousY = pointY;
  }

  return bestDistanceSquared;
}

function findHoveredAllModeArc(localX, localY) {
  if (!state.layout || !state.allModeRenderedArcs.length) {
    return null;
  }
  const thresholdSquared = ARC_HOVER_PICK_RADIUS * ARC_HOVER_PICK_RADIUS;
  let bestArc = null;
  let bestDistanceSquared = thresholdSquared;
  const baselineY = state.layout.baselineY;

  for (let index = state.allModeRenderedArcs.length - 1; index >= 0; index -= 1) {
    const arc = state.allModeRenderedArcs[index];
    if (
      localX < arc.minX
      || localX > arc.maxX
      || localY < arc.minY
      || localY > arc.maxY
    ) {
      continue;
    }
    const distanceSquared = getHalfEllipseDistanceSquared(localX, localY, baselineY, arc);
    if (distanceSquared > bestDistanceSquared) {
      continue;
    }
    bestDistanceSquared = distanceSquared;
    bestArc = arc;
  }

  return bestArc;
}

function hideArcHoverTooltip() {
  if (arcHoverTooltipEl) {
    arcHoverTooltipEl.classList.add("hidden");
    arcHoverTooltipEl.textContent = "";
  }
  canvas.style.cursor = "crosshair";
}

function showArcHoverTooltip(arc, clientX, clientY) {
  if (!arcHoverTooltipEl || !state.data) {
    return;
  }
  const fromRef = formatRef(state.data.verseRefs[arc.fromIndex]);
  const toRef = formatRef(state.data.verseRefs[arc.targetIndex]);
  arcHoverTooltipEl.textContent = `From ${fromRef} to ${toRef}`;
  arcHoverTooltipEl.classList.remove("hidden");

  const hostRect = canvas.parentElement.getBoundingClientRect();
  const tooltipWidth = arcHoverTooltipEl.offsetWidth;
  const tooltipHeight = arcHoverTooltipEl.offsetHeight;
  let left = clientX - hostRect.left + 14;
  let top = clientY - hostRect.top + 14;
  left = clamp(left, 8, Math.max(8, hostRect.width - tooltipWidth - 8));
  top = clamp(top, 8, Math.max(8, hostRect.height - tooltipHeight - 8));
  arcHoverTooltipEl.style.left = `${left}px`;
  arcHoverTooltipEl.style.top = `${top}px`;
  canvas.style.cursor = "pointer";
}

function updateAllModeArcHover(event) {
  if (state.mode !== "all") {
    hideArcHoverTooltip();
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const localX = event.clientX - rect.left;
  const localY = event.clientY - rect.top;
  if (localX < 0 || localY < 0 || localX > rect.width || localY > rect.height) {
    hideArcHoverTooltip();
    return;
  }
  const hoveredArc = findHoveredAllModeArc(localX, localY);
  if (!hoveredArc) {
    hideArcHoverTooltip();
    return;
  }
  showArcHoverTooltip(hoveredArc, event.clientX, event.clientY);
}

function drawAllReferenceArcs() {
  const { xCenterForVerse, baselineY, top, bottom, height, axisWidth } = state.layout;
  const viewStart = state.viewStart;
  const viewEnd = state.viewEnd;
  const maxArcUp = baselineY - top - 6;
  const maxArcDown = height - bottom - baselineY - 6;
  const theme = getThemeStyle();
  const useDistanceBrightness = useDistanceBrightnessArcColoring();
  const useRanked = true;
  const outgoingStore = getAdjacencyStore(useRanked);
  const renderedArcs = [];
  let visibleReferenceCount = 0;
  const activeVisibleVerseFlags = new Uint8Array(viewEnd - viewStart + 1);
  let activeVisibleVerseCount = 0;

  ctx.lineCap = "round";
  ctx.lineWidth = 0.55;

  for (let fromPosition = viewStart; fromPosition <= viewEnd; fromPosition += 1) {
    const fromIndex = getVerseAtPosition(fromPosition);
    const availableCount = outgoingStore.offsets[fromIndex + 1] - outgoingStore.offsets[fromIndex];
    if (availableCount < state.edgeRankMin || availableCount > state.edgeRankMax) {
      continue;
    }
    const localCount = availableCount;
    const sparseBoost = getSparseVisibilityBoost(localCount);

    const fromX = xCenterForVerse(fromIndex);
    const fromHue = state.bookHues[state.verseToBookIndex[fromIndex]];

    forEachDirectionalNeighbor(fromIndex, (targetIndex) => {
      if (!edgePassesFilters(fromIndex, targetIndex)) {
        return;
      }
      if (!isVerseVisible(targetIndex)) {
        return;
      }
      visibleReferenceCount += 1;
      const sourceOffset = fromPosition - viewStart;
      if (activeVisibleVerseFlags[sourceOffset] === 0) {
        activeVisibleVerseFlags[sourceOffset] = 1;
        activeVisibleVerseCount += 1;
      }
      const targetPosition = getPositionForVerse(targetIndex);
      const targetOffset = targetPosition - viewStart;
      if (activeVisibleVerseFlags[targetOffset] === 0) {
        activeVisibleVerseFlags[targetOffset] = 1;
        activeVisibleVerseCount += 1;
      }
      const toX = xCenterForVerse(targetIndex);
      const distance = Math.abs(toX - fromX);
      if (distance < 0.35) {
        return;
      }

      const distanceRatio = clamp(distance / axisWidth, 0, 1);
      const verseDistanceRatio = getVerseDistanceRatio(fromIndex, targetIndex);

      const seed = (Math.imul(fromIndex + 1, 2654435761) ^ Math.imul(targetIndex + 1, 2246822519)) >>> 0;
      const keepRoll = (seed & 1023) / 1023;
      const keepChance = 0.13 + distanceRatio * 0.44;
      if (keepRoll > keepChance) {
        return;
      }

      const direction = targetPosition > fromPosition ? -1 : 1;
      const maxArcHeight = direction < 0 ? maxArcUp : maxArcDown;
      const peakHeight = getArcPeakHeight(distance, maxArcHeight);

      if (useDistanceBrightness) {
        ctx.strokeStyle = getDistanceBrightnessArcStroke(distanceRatio);
      } else {
        const innerAlpha = theme.allArcInnerAlpha + sparseBoost * 0.04;
        const outerAlpha = theme.allArcOuterAlpha + sparseBoost * 0.03;
        const alpha = getArcAlpha(verseDistanceRatio, innerAlpha, outerAlpha);
        const lightness = getArcLightness(
          verseDistanceRatio,
          theme.allArcInnerLightness,
          theme.allArcOuterLightness,
        );
        ctx.strokeStyle = getDirectionalArcStrokeStyle({
          fromX,
          toX,
          baselineY,
          direction,
          hue: fromHue,
          saturation: 60,
          lightness,
          alpha,
          topSourceFactor: 0.1,
          topMiddleFactor: 0.45,
          topTargetFactor: 1.25,
          topMiddleStop: 0.62,
          minAlpha: 0.002,
        });
      }
      const geometry = drawHalfEllipseArc(fromX, toX, baselineY, peakHeight, direction);
      if (!geometry) {
        return;
      }

      const peakY = baselineY + direction * peakHeight;
      renderedArcs.push({
        fromIndex,
        targetIndex,
        fromX,
        toX,
        centerX: geometry.centerX,
        halfDx: geometry.halfDx,
        radiusY: geometry.radiusY,
        direction,
        minX: Math.min(fromX, toX) - ARC_HOVER_PICK_PADDING,
        maxX: Math.max(fromX, toX) + ARC_HOVER_PICK_PADDING,
        minY: Math.min(baselineY, peakY) - ARC_HOVER_PICK_PADDING,
        maxY: Math.max(baselineY, peakY) + ARC_HOVER_PICK_PADDING,
        pickSegments: clamp(Math.ceil(distance / 40), 10, 28),
      });
    }, { applyRange: true, useRanked: true });
  }

  state.allModeRenderedArcs = renderedArcs;
  state.visibleReferenceCount = visibleReferenceCount;
  state.activeVisibleVerseCount = activeVisibleVerseCount;
}

function drawFocusedReferenceArcs(anchorIndex, options = {}) {
  const {
    lineWidth = 1,
    alphaScale = 1,
  } = options;

  if (!isVerseVisible(anchorIndex)) {
    return;
  }

  const { xCenterForVerse, baselineY, axisWidth, top, bottom, height } = state.layout;
  const theme = getThemeStyle();
  const neighbors = collectDirectionalNeighbors(anchorIndex, {
    applyFilters: true,
    restrictToView: true,
    applyRange: true,
  });

  const fromX = xCenterForVerse(anchorIndex);
  const anchorPosition = getPositionForVerse(anchorIndex);
  const maxArcUp = baselineY - top - 8;
  const maxArcDown = height - bottom - baselineY - 8;

  ctx.lineCap = "round";
  ctx.lineWidth = lineWidth;

  const forwardTargets = [];
  const backwardTargets = [];
  for (const entry of neighbors) {
    const targetPosition = getPositionForVerse(entry.index);
    if (targetPosition > anchorPosition) {
      forwardTargets.push(entry.index);
    } else if (targetPosition < anchorPosition) {
      backwardTargets.push(entry.index);
    }
  }

  const visibleFilteredCount = forwardTargets.length + backwardTargets.length;
  const alphaBase = clamp(34 / (visibleFilteredCount + 34), 0.08, 0.52);
  const useDistanceBrightness = useDistanceBrightnessArcColoring();

  const drawGroup = (targets, direction, maxArcHeight) => {
    targets.sort((a, b) => {
      const deltaA = Math.abs(getPositionForVerse(a) - anchorPosition);
      const deltaB = Math.abs(getPositionForVerse(b) - anchorPosition);
      return deltaA - deltaB;
    });
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
      const verseDistanceRatio = getVerseDistanceRatio(anchorIndex, targetIndex);
      const peakHeight = getArcPeakHeight(distance, maxArcHeight);

      const hue = state.bookHues[state.verseToBookIndex[targetIndex]];
      const saturation = 62;
      if (useDistanceBrightness) {
        ctx.strokeStyle = getDistanceBrightnessArcStroke(distanceRatio);
      } else {
        const innerAlpha = clamp(
          (Math.max(theme.allArcInnerAlpha + 0.1, alphaBase + 0.2) + sparseBoost * 0.08) * alphaScale,
          0.08,
          0.78,
        );
        const outerAlpha = clamp(
          (Math.max(theme.allArcOuterAlpha + 0.05, alphaBase * 0.55) + sparseBoost * 0.055) * alphaScale,
          0.05,
          0.62,
        );
        const alpha = getArcAlpha(verseDistanceRatio, innerAlpha, outerAlpha);
        const lightness = getArcLightness(
          verseDistanceRatio,
          theme.selectedArcInnerLightness,
          theme.selectedArcOuterLightness,
        );
        ctx.strokeStyle = getDirectionalArcStrokeStyle({
          fromX,
          toX,
          baselineY,
          direction,
          hue,
          saturation,
          lightness,
          alpha,
        });
      }
      drawHalfEllipseArc(fromX, toX, baselineY, peakHeight, direction);
    }
  };

  drawGroup(forwardTargets, -1, maxArcUp);
  drawGroup(backwardTargets, 1, maxArcDown);
}

function drawSelectedReferenceArcs() {
  drawFocusedReferenceArcs(state.selectedIndex, {
    lineWidth: 1,
    alphaScale: 1,
  });
}

function drawMultiPinnedReferenceArcs() {
  const pinCount = state.pinnedIndices.length;
  if (!pinCount) {
    return;
  }

  for (const pinnedIndex of state.pinnedIndices) {
    drawFocusedReferenceArcs(pinnedIndex, {
      lineWidth: 0.9,
      alphaScale: 0.68,
    });
  }
}

function drawSelectionMarker() {
  if (state.mode === "all") {
    return;
  }
  const { xCenterForVerse, baselineY, top, bottom, height } = state.layout;
  const theme = getThemeStyle();

  const drawMarker = (verseIndex, options = {}) => {
    const {
      lineAlpha = 1,
      radius = 3.2,
    } = options;
    if (!isVerseVisible(verseIndex)) {
      return;
    }
    const x = xCenterForVerse(verseIndex);
    const hue = state.bookHues[state.verseToBookIndex[verseIndex]];

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = theme.selectionLine.replace(/[\d.]+\)$/u, `${clamp(lineAlpha, 0.2, 1)})`);
    ctx.beginPath();
    ctx.moveTo(x, top + 2);
    ctx.lineTo(x, height - bottom - 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = `hsla(${hue}, 76%, ${theme.selectionDotLightness}%, ${clamp(0.6 + lineAlpha * 0.35, 0.45, 0.98)})`;
    ctx.beginPath();
    ctx.arc(x, baselineY, radius, 0, Math.PI * 2);
    ctx.fill();
  };

  if (state.mode === "multi") {
    for (const pinnedIndex of state.pinnedIndices) {
      const isSelected = pinnedIndex === state.selectedIndex;
      drawMarker(pinnedIndex, {
        lineAlpha: isSelected ? 1 : 0.66,
        radius: isSelected ? 3.4 : 2.7,
      });
    }
    return;
  }

  drawMarker(state.selectedIndex, {
    lineAlpha: 1,
    radius: 3.2,
  });
}

function drawViewportStatsOverlay() {
  if (state.mode !== "all" || !state.layout || !state.data) {
    return;
  }
  const theme = getThemeStyle();
  const visibleReferences = Math.max(0, Number(state.visibleReferenceCount) || 0);
  const activeVerses = Math.max(0, Number(state.activeVisibleVerseCount) || 0);
  const line1 = `References: ${visibleReferences.toLocaleString()}`;
  const line2 = `Verses: ${activeVerses.toLocaleString()}`;
  const x = state.layout.width - 10;
  const y = 10;
  const lineHeight = 15;

  ctx.save();
  ctx.font = "11px 'Segoe UI', Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = theme.bookLabel;
  ctx.fillText(line1, x, y);
  ctx.fillText(line2, x, y + lineHeight);
  ctx.restore();
}

function render() {
  if (!state.data || !state.layout) {
    return;
  }
  drawBackground();
  if (state.mode === "all") {
    drawAllReferenceArcs();
  } else if (state.mode === "multi") {
    state.allModeRenderedArcs = [];
    hideArcHoverTooltip();
    drawMultiPinnedReferenceArcs();
  } else {
    state.allModeRenderedArcs = [];
    hideArcHoverTooltip();
    drawSelectedReferenceArcs();
  }
  if (state.showTimelineDecorations) {
    drawChapterBands();
    drawSelectionMarker();
  }
  drawViewportStatsOverlay();
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

function snapshotStateSummary() {
  const parts = [
    `mode ${state.mode}`,
    `order ${state.orderMode}`,
    `refcount ${formatEdgeRangeLabel()}`,
  ];
  if (state.orderMode === "composition" && state.compositionProfileId) {
    parts.push(`composition profile ${state.compositionProfileId}`);
  }
  if (state.mode === "single") {
    parts.push(`selected ${formatRef(state.data.verseRefs[state.selectedIndex])}`);
  } else if (state.mode === "multi") {
    parts.push(`pins ${state.pinnedIndices.length}`);
  }
  return parts.join(", ");
}

function computeSnapshotDimensions() {
  const layoutWidth = state.layout?.width ?? canvas.clientWidth ?? 1;
  const layoutHeight = state.layout?.height ?? canvas.clientHeight ?? 1;
  const safeWidth = Math.max(1, Math.floor(layoutWidth));
  const safeHeight = Math.max(1, Math.floor(layoutHeight));
  const aspectRatio = safeWidth / safeHeight;

  let targetWidth = SNAPSHOT_TARGET_WIDTH;
  let targetHeight = Math.round(targetWidth / aspectRatio);
  if (targetHeight < SNAPSHOT_TARGET_HEIGHT) {
    targetHeight = SNAPSHOT_TARGET_HEIGHT;
    targetWidth = Math.round(targetHeight * aspectRatio);
  }

  if (targetWidth > SNAPSHOT_MAX_SIDE) {
    targetWidth = SNAPSHOT_MAX_SIDE;
    targetHeight = Math.round(targetWidth / aspectRatio);
  }
  if (targetHeight > SNAPSHOT_MAX_SIDE) {
    targetHeight = SNAPSHOT_MAX_SIDE;
    targetWidth = Math.round(targetHeight * aspectRatio);
  }

  return {
    width: Math.max(1, Math.floor(targetWidth)),
    height: Math.max(1, Math.floor(targetHeight)),
  };
}

async function captureSnapshotBlob() {
  const { width, height } = computeSnapshotDimensions();
  const originalStyleWidth = canvas.style.width;
  const originalStyleHeight = canvas.style.height;
  const previousAllModeRenderedArcs = state.allModeRenderedArcs;

  try {
    // Render at a fixed high resolution without resizing the visible element.
    buildLayout({
      widthOverride: width,
      heightOverride: height,
      dprOverride: 1,
      applyStyleSize: false,
    });
    render();
    return await new Promise((resolve) => {
      canvas.toBlob((result) => resolve(result), "image/png");
    });
  } finally {
    canvas.style.width = originalStyleWidth;
    canvas.style.height = originalStyleHeight;
    state.allModeRenderedArcs = previousAllModeRenderedArcs;
    buildLayout();
    render();
  }
}

function downloadBlobPng(blob, filename) {
  if (!blob) {
    return;
  }
  const link = document.createElement("a");
  const objectUrl = URL.createObjectURL(blob);
  link.download = filename;
  link.href = objectUrl;
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

async function snapshotCurrentGraph() {
  if (!state.data) {
    return;
  }

  const now = new Date();
  const timestamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
    "-",
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const compositionProfileSuffix = state.orderMode === "composition" && state.compositionProfileId
    ? `-${state.compositionProfileId}`
    : "";
  const fileName = `bible-crossrefs-${state.mode}-${state.orderMode}${compositionProfileSuffix}-refcount-${state.edgeRankMin}-${state.edgeRankMax}-${timestamp}.png`;
  const blob = await captureSnapshotBlob();
  if (!blob) {
    return;
  }

  if (navigator.share && navigator.canShare && window.File && canvas.toBlob) {
    const file = new File([blob], fileName, { type: "image/png" });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          title: "Bible Cross-Reference Snapshot",
          text: snapshotStateSummary(),
          files: [file],
        });
        return;
      } catch (error) {
        // User cancel or share-target error; silently fall back to download.
      }
    }
  }

  downloadBlobPng(blob, fileName);
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
      updateAllModeArcHover(event);
      return;
    }
    hideArcHoverTooltip();
    if (state.mode === "multi") {
      return;
    }
    if (state.singlePinned) {
      return;
    }
    setSelectedVerse(index, { updateInput: false, activateSingle: false });
  });

  canvas.addEventListener("pointerleave", () => {
    hideArcHoverTooltip();
  });

  canvas.addEventListener("click", (event) => {
    const index = verseIndexFromClientX(event.clientX);
    if (state.mode === "all") {
      hideArcHoverTooltip();
      setSelectedVerse(index, { updateInput: true, activateSingle: true });
      return;
    }
    if (state.mode === "multi") {
      const wasAdded = togglePinnedVerse(index);
      state.selectedIndex = index;
      syncSliderToSelectedVerse();
      setVerseInputValue(formatInputRef(state.data.verseRefs[state.selectedIndex]));
      if (!wasAdded && state.pinnedIndices.length === 0) {
        state.mode = "single";
        state.singlePinned = true;
        updateMultiPinButton();
      }
      updateInfoPanel();
      queueRender();
      return;
    }
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
  });

  canvas.addEventListener("wheel", (event) => {
    if (state.mode !== "all") {
      return;
    }
    event.preventDefault();
    hideArcHoverTooltip();
    const anchorPosition = positionFromClientX(event.clientX, { snap: false });
    queueWheelZoom(anchorPosition, event.deltaY);
  }, { passive: false });

  panLeftBtnEl?.addEventListener("click", () => {
    animatePanBySection(-1);
  });
  panRightBtnEl?.addEventListener("click", () => {
    animatePanBySection(1);
  });

  sliderEl.addEventListener("input", () => {
    cancelPanAnimation();
    if (state.mode === "all" && state.layout) {
      const total = state.data.totalVerses;
      const maxStart = Math.max(0, total - state.layout.visibleCount);
      if (maxStart <= 0 || total <= 1) {
        state.viewStart = 0;
        state.viewEnd = total - 1;
        buildLayout();
        updateInfoPanel();
        queueRender();
        return;
      }
      const sliderPosition = clamp(Number(sliderEl.value) - 1, 0, total - 1);
      const panRatio = sliderPosition / Math.max(1, total - 1);
      const nextStart = clamp(Math.round(panRatio * maxStart), 0, maxStart);
      state.viewStart = nextStart;
      state.viewEnd = nextStart + state.layout.visibleCount - 1;
      buildLayout();
      updateInfoPanel();
      queueRender();
      return;
    }
    const position = clamp(Number(sliderEl.value) - 1, 0, state.data.totalVerses - 1);
    const index = getVerseAtPosition(position);
    setSelectedVerse(index, { activateSingle: state.mode !== "multi" });
  });

  const submitVerseInput = () => {
    const index = parseVerseInput(verseInputEl.value);
    if (index === null) {
      verseInputEl.select();
      return false;
    }
    setSelectedVerse(index, { activateSingle: state.mode !== "multi" });
    return true;
  };

  goBtnEl.addEventListener("click", () => {
    submitVerseInput();
  });

  verseInputEl.addEventListener("input", () => {
    const hasValue = verseInputEl.value.trim().length > 0;
    setSearchGoVisible(hasValue);
  });

  verseInputEl.addEventListener("blur", () => {
    window.setTimeout(() => {
      if (document.activeElement === goBtnEl || document.activeElement === verseInputEl) {
        return;
      }
      setSearchGoVisible(false);
    }, 80);
  });

  verseInputEl.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }
    submitVerseInput();
  });

  randomBtnEl?.addEventListener("click", () => {
    jumpToRandomVerse();
  });

  filterToggleBtnEl.addEventListener("click", () => {
    setFilterPanelOpen(!state.filterPanelOpen);
  });
  strengthMinSliderEl?.addEventListener("input", () => {
    applyEdgeRankRange(strengthMinSliderEl.value, strengthMaxSliderEl?.value ?? state.edgeRankLimit);
  });
  strengthMaxSliderEl?.addEventListener("input", () => {
    applyEdgeRankRange(strengthMinSliderEl?.value ?? 1, strengthMaxSliderEl.value);
  });
  multiPinBtnEl?.addEventListener("click", () => {
    setMultiPinMode(state.mode !== "multi");
  });
  selectedVersePinBtnEl?.addEventListener("click", () => {
    const wasAdded = togglePinnedVerse(state.selectedIndex);
    if (wasAdded && state.mode !== "multi") {
      setMultiPinMode(true);
      return;
    }
    if (!wasAdded && state.mode === "multi" && state.pinnedIndices.length === 0) {
      state.mode = "single";
      state.singlePinned = true;
      updateMultiPinButton();
      updateSelectedVersePinButton();
    }
    updateInfoPanel();
    queueRender();
  });
  themeToggleBtnEl?.addEventListener("click", cycleColorTheme);
  orderCanonicalBtnEl?.addEventListener("click", () => {
    setOrderMode("canonical");
  });
  orderTimelineBtnEl?.addEventListener("click", () => {
    if (orderTimelineBtnEl.disabled) {
      return;
    }
    setOrderMode("timeline");
  });
  orderCompositionBtnEl?.addEventListener("click", () => {
    if (orderCompositionBtnEl.disabled) {
      return;
    }
    setOrderMode("composition");
  });
  compositionProfileSelectEl?.addEventListener("change", () => {
    setCompositionProfile(compositionProfileSelectEl.value);
  });
  colorClassicBtnEl?.addEventListener("click", () => {
    setArcColoring("classic");
  });
  colorContrastBtnEl?.addEventListener("click", () => {
    setArcColoring("distance-brightness");
  });
  labelsOnBtnEl?.addEventListener("click", () => {
    setTimelineDecorationsVisible(true);
  });
  labelsOffBtnEl?.addEventListener("click", () => {
    setTimelineDecorationsVisible(false);
  });

  filterTestamentEl.addEventListener("change", applyFiltersFromControls);
  filterBookEl.addEventListener("change", applyFiltersFromControls);
  filterChapterEl.addEventListener("change", applyFiltersFromControls);
  filterScopeEl.addEventListener("change", applyFiltersFromControls);
  filterColoringEl?.addEventListener("change", applyFiltersFromControls);
  arcControlsToggleBtnEl?.addEventListener("click", () => {
    setArcRadiusControlVisible(!state.showArcRadiusControl);
  });
  arcRadiusSliderEl?.addEventListener("input", () => {
    const sliderScale = (Number(arcRadiusSliderEl.value) || Math.round(ARC_HEIGHT_SCALE_DEFAULT * 100)) / 100;
    applyArcHeightScale(sliderScale);
  });
  timelineWidthSliderEl?.addEventListener("input", () => {
    const sliderScale = (Number(timelineWidthSliderEl.value) || Math.round(TIMELINE_WIDTH_SCALE_DEFAULT * 100)) / 100;
    applyTimelineWidthScale(sliderScale);
  });
  clearFiltersBtnEl.addEventListener("click", clearFilters);

  showAllBtnEl.addEventListener("click", () => {
    if (!state.hasActiveFilters) {
      applyEdgeRankRange(1, state.edgeRankLimit, { queue: false });
    }
    setMode("all");
  });

  resetZoomBtnEl.addEventListener("click", () => {
    resetView();
    updateInfoPanel();
    queueRender();
  });

  snapshotBtnEl?.addEventListener("click", async () => {
    await snapshotCurrentGraph();
  });
}

async function bootstrap() {
  try {
    const [graphResponse, kjvResponse, verseYearsResponse, verseCompositionYearsResponse, verseEventsResponse] = await Promise.all([
      fetch("./data/visualization-data.json"),
      fetch("./data/kjv-verse-texts.json"),
      fetch("./data/verse-years.json").catch(() => null),
      fetch("./data/verse-composition-years.json").catch(() => null),
      fetch("./data/verse-events.json").catch(() => null),
    ]);

    if (!graphResponse.ok) {
      throw new Error(`Graph HTTP ${graphResponse.status}`);
    }
    if (!kjvResponse.ok) {
      throw new Error(`KJV HTTP ${kjvResponse.status}`);
    }
    const [data, kjvPayload, verseYearsPayload, verseCompositionYearsPayload, verseEventsPayload] = await Promise.all([
      graphResponse.json(),
      kjvResponse.json(),
      verseYearsResponse?.ok ? verseYearsResponse.json() : Promise.resolve(null),
      verseCompositionYearsResponse?.ok ? verseCompositionYearsResponse.json() : Promise.resolve(null),
      verseEventsResponse?.ok ? verseEventsResponse.json() : Promise.resolve(null),
    ]);

    if (!Array.isArray(kjvPayload.verses) || kjvPayload.verses.length !== data.totalVerses) {
      throw new Error(`KJV verse payload size mismatch: expected ${data.totalVerses}, got ${kjvPayload.verses?.length ?? "none"}`);
    }

    state.data = data;
    state.kjvVerses = kjvPayload.verses;
    state.bookHues = data.books.map((_, index) => getBookHue(index));
    state.bookAliasMap = buildBookAliasMap(data.books);
    state.bookNameByAbbr = new Map(data.books.map((book) => [book.abbr, book.name]));
    state.canonicalOrder = new Uint32Array(data.totalVerses);
    state.canonicalPositionByVerse = new Uint32Array(data.totalVerses);
    for (let index = 0; index < data.totalVerses; index += 1) {
      state.canonicalOrder[index] = index;
      state.canonicalPositionByVerse[index] = index;
    }
    state.timelineOrder = null;
    state.timelinePositionByVerse = null;
    state.compositionProfileById = null;
    state.compositionProfileList = [];
    state.compositionDefaultProfileId = null;
    state.compositionOrder = null;
    state.compositionPositionByVerse = null;
    state.compositionYearExact = null;
    state.compositionYearResolved = null;
    state.compositionYearResolution = null;
    state.compositionYearsByPosition = null;
    state.displayOrder = state.canonicalOrder;
    state.positionByVerse = state.canonicalPositionByVerse;
    state.orderMode = "canonical";
    state.viewStart = 0;
    state.viewEnd = data.totalVerses - 1;
    state.pinnedIndices = [];

    const incomingCounts = buildIncomingCounts(
      data.totalVerses,
      data.outgoingTargets,
    );

    const verseDegree = new Uint32Array(data.totalVerses);
    let maxOutgoingPerVerse = 0;
    for (let verseIndex = 0; verseIndex < data.totalVerses; verseIndex += 1) {
      const outgoingCount = data.outgoingOffsets[verseIndex + 1] - data.outgoingOffsets[verseIndex];
      if (outgoingCount > maxOutgoingPerVerse) {
        maxOutgoingPerVerse = outgoingCount;
      }
      verseDegree[verseIndex] = outgoingCount + incomingCounts[verseIndex];
    }
    state.verseDegree = verseDegree;
    state.edgeRankLimit = Math.max(1, maxOutgoingPerVerse);
    state.edgeRankMin = 1;
    state.edgeRankMax = state.edgeRankLimit;

    const outgoingRanked = buildRankedAdjacency(
      data.totalVerses,
      data.outgoingOffsets,
      data.outgoingTargets,
      verseDegree,
    );
    state.outgoingRankedOffsets = outgoingRanked.rankedOffsets;
    state.outgoingRankedTargets = outgoingRanked.rankedValues;

    state.refToIndex = new Map();
    for (let index = 0; index < data.verseRefs.length; index += 1) {
      state.refToIndex.set(data.verseRefs[index], index);
    }

    state.verseToBookIndex = new Uint8Array(data.totalVerses);
    state.verseToChapterId = new Uint16Array(data.totalVerses);
    state.verseNumberInChapter = new Uint16Array(data.totalVerses);
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
          state.verseNumberInChapter[verseIndex] = verseIndex - chapterStart + 1;
        }
        chapterId += 1;
      }
    }

    let timelineReady = false;
    const exactYears = normalizeYearArray(verseYearsPayload?.years, data.totalVerses);
    if (exactYears) {
      state.verseYearExact = exactYears;

      const resolved = resolveTimelineYears(exactYears, data.books, state.chapterBands);
      state.verseYearResolved = resolved.resolvedYears;
      state.verseYearResolution = resolved.resolutionSource;

      const timeline = buildTimelineOrder(exactYears, resolved.resolvedYears);
      state.timelineOrder = timeline.timelineOrder;
      state.timelinePositionByVerse = timeline.timelinePositionByVerse;
      state.timelineYearsByPosition = timeline.timelineYearsByPosition;
      state.timelineDataStatus = "ready";
      timelineReady = true;
    } else {
      state.verseYearExact = null;
      state.verseYearResolved = null;
      state.verseYearResolution = null;
      state.timelineOrder = null;
      state.timelinePositionByVerse = null;
      state.timelineYearsByPosition = null;
      state.timelineDataStatus = verseYearsPayload ? "invalid" : "missing";
    }

    let compositionReady = false;
    const compositionProfiles = extractCompositionProfiles(
      verseCompositionYearsPayload,
      data.totalVerses,
      data.books,
      state.chapterBands,
    );
    if (compositionProfiles.profiles.length > 0) {
      state.compositionProfileList = compositionProfiles.profiles;
      state.compositionProfileById = new Map(
        compositionProfiles.profiles.map((profile) => [profile.id, profile]),
      );
      state.compositionDefaultProfileId = compositionProfiles.defaultProfileId;

      const requestedProfileId = state.compositionProfileId;
      const initialProfileId = requestedProfileId && state.compositionProfileById.has(requestedProfileId)
        ? requestedProfileId
        : compositionProfiles.defaultProfileId;

      setCompositionProfile(initialProfileId, {
        queue: false,
        save: false,
        refreshInfo: false,
      });
      state.compositionDataStatus = "ready";
      compositionReady = Boolean(
        state.compositionOrder
        && state.compositionPositionByVerse
        && state.compositionYearResolved,
      );
    } else {
      state.compositionProfileById = null;
      state.compositionProfileList = [];
      state.compositionDefaultProfileId = null;
      state.compositionProfileId = null;
      state.compositionYearExact = null;
      state.compositionYearResolved = null;
      state.compositionYearResolution = null;
      state.compositionOrder = null;
      state.compositionPositionByVerse = null;
      state.compositionYearsByPosition = null;
      state.compositionDataStatus = verseCompositionYearsPayload ? "invalid" : "missing";
      syncCompositionProfileControl();
    }

    if (
      verseEventsPayload
      && Array.isArray(verseEventsPayload.events)
      && Array.isArray(verseEventsPayload.verseEventOffsets)
      && Array.isArray(verseEventsPayload.verseEventIds)
      && verseEventsPayload.verseEventOffsets.length === data.totalVerses + 1
    ) {
      state.events = verseEventsPayload.events.map((eventRecord) => {
        const startYearRaw = Number(eventRecord?.startYear);
        const sortKeyRaw = Number(eventRecord?.sortKey);
        const anchorVerseRaw = Number(eventRecord?.anchorVerse);
        return {
          id: eventRecord?.id ?? null,
          eventID: Number.isFinite(Number(eventRecord?.eventID)) ? Math.trunc(Number(eventRecord.eventID)) : null,
          title: typeof eventRecord?.title === "string" ? eventRecord.title : "Untitled Event",
          startDate: typeof eventRecord?.startDate === "string" ? eventRecord.startDate : null,
          startYear: Number.isFinite(startYearRaw) ? Math.trunc(startYearRaw) : null,
          sortKey: Number.isFinite(sortKeyRaw) ? sortKeyRaw : null,
          rangeFlag: Boolean(eventRecord?.rangeFlag),
          verseCount: Number.isFinite(Number(eventRecord?.verseCount)) ? Math.max(0, Math.trunc(Number(eventRecord.verseCount))) : 0,
          anchorVerse: Number.isFinite(anchorVerseRaw) ? clamp(Math.trunc(anchorVerseRaw), 0, data.totalVerses - 1) : 0,
        };
      });
      state.verseEventOffsets = Uint32Array.from(
        verseEventsPayload.verseEventOffsets.map((value) => Math.max(0, Math.trunc(Number(value) || 0))),
      );
      state.verseEventIds = Uint32Array.from(
        verseEventsPayload.verseEventIds.map((value) => Math.max(0, Math.trunc(Number(value) || 0))),
      );

      state.timelineEventAnchors = [];
      for (let eventIndex = 0; eventIndex < state.events.length; eventIndex += 1) {
        const eventRecord = state.events[eventIndex];
        state.timelineEventAnchors.push({
          eventIndex,
          anchorVerse: eventRecord.anchorVerse,
          title: eventRecord.title,
          startYear: eventRecord.startYear,
          sortKey: eventRecord.sortKey,
        });
      }
      state.timelineEventAnchors.sort((left, right) => {
        if (left.anchorVerse !== right.anchorVerse) {
          return left.anchorVerse - right.anchorVerse;
        }
        if (left.startYear !== null && right.startYear !== null && left.startYear !== right.startYear) {
          return left.startYear - right.startYear;
        }
        if (left.sortKey !== null && right.sortKey !== null && left.sortKey !== right.sortKey) {
          return left.sortKey - right.sortKey;
        }
        return left.eventIndex - right.eventIndex;
      });
      state.eventDataStatus = "ready";
    } else {
      state.events = null;
      state.verseEventOffsets = null;
      state.verseEventIds = null;
      state.timelineEventAnchors = null;
      state.eventDataStatus = verseEventsPayload ? "invalid" : "missing";
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
    strengthMinSliderEl.max = String(state.edgeRankLimit);
    strengthMaxSliderEl.max = String(state.edgeRankLimit);
    syncCompositionProfileControl();
    syncOrderToggleButtons({ mode: "canonical", timelineReady, compositionReady });
    updateSourceLine();

    wireEvents();
    buildLayout();
    state.selectedIndex = state.refToIndex.get("John.3.16") ?? 0;
    syncSliderToSelectedVerse();
    setVerseInputValue(formatInputRef(state.data.verseRefs[state.selectedIndex]));
    showAllBtnEl.setAttribute("aria-pressed", "true");
    strengthMinSliderEl.value = String(state.edgeRankMin);
    strengthMaxSliderEl.value = String(state.edgeRankMax);
    updateStrengthLabel();
    updateMultiPinButton();
    updateSelectedVersePinButton();
    filterTestamentEl.value = state.filters.targetTestament;
    filterBookEl.value = state.filters.targetBook;
    filterChapterEl.value = state.filters.targetChapter;
    filterScopeEl.value = state.filters.scope;
    setArcColoring(state.filters.arcColoring, { queue: false, save: false, refreshInfo: false });
    setTimelineDecorationsVisible(state.showTimelineDecorations, { queue: false, save: false });
    applyArcHeightScale(state.arcHeightScale, { queue: false, save: false });
    applyTimelineWidthScale(state.timelineWidthScale, { queue: false, save: false, rebuild: false });
    setArcRadiusControlVisible(state.showArcRadiusControl, { save: false });
    sizeAllFilterSelects();
    updateHasActiveFilters();
    setFilterPanelOpen(false);
    applyColorTheme(state.colorTheme, { queue: false, save: false });
    setOrderMode(state.preferredOrderMode, { preserveWindow: false, persist: false });
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
