const form = document.querySelector("#searchForm");
const apiStatus = document.querySelector("#apiStatus");
const results = document.querySelector("#results");
const improvements = document.querySelector("#improvements");
const summary = document.querySelector("#summary");
const submitButton = document.querySelector("#submitButton");
const modButtons = document.querySelector("#modButtons");
const clearMods = document.querySelector("#clearMods");
const viewTabs = document.querySelector(".view-tabs");
const languageSelect = document.querySelector("#languageSelect");

const selectedMods = new Set();
const languageStorageKey = "osu-mod-score-finder-language";
let currentLanguage = readStoredLanguage();
let lastSearchData = null;
let isLoading = false;

const modNames = {
  NM: "No Mod",
  NF: "No Fail",
  EZ: "Easy",
  HD: "Hidden",
  HR: "Hard Rock",
  DT: "Double Time",
  NC: "Nightcore",
  HT: "Half Time",
  FL: "Flashlight",
  SD: "Sudden Death",
  PF: "Perfect",
  SO: "Spun Out",
  CL: "Classic",
  DA: "Difficulty Adjust",
  RA: "Rate Adjust",
  AL: "Alternate",
  SG: "Single Tap",
  MR: "Mirror",
  TC: "Traceable",
  AS: "Adaptive Speed",
  MG: "Magnetised",
  RP: "Repel",
};

const translations = {
  de: {
    "app.eyebrow": "Lokale Beta",
    "field.language": "Sprache",
    "field.username": "Spielername",
    "field.search": "Suche",
    "field.purpose": "Gepasste Maps mit Mod",
    "field.mode": "Modus",
    "field.sort": "Sortierung",
    "field.match": "Mod-Match",
    "field.scanPages": "Scan-Seiten",
    "field.dateRange": "Zeitraum",
    "field.rankNumber": "Rangnummer",
    "field.rankFrom": "Rang von",
    "field.rankTo": "Rang bis",
    "field.limit": "Anzeige-Limit",
    "field.bestTry": "Bester Try",
    "field.improvement": "Improvement",
    "field.mods": "Mods",
    "placeholder.username": "z. B. WhiteCat",
    "option.sort.date": "Datum",
    "option.match.contains": "enthaelt alle",
    "option.match.exact": "exakt",
    "option.match.any": "enthaelt einen",
    "option.date.all": "alle Tage",
    "option.date.today": "heute",
    "option.rank.none": "aus",
    "option.rank.pp": "PP-Rang",
    "option.best.date": "neuster",
    "option.improvement.lastTry": "letzter Try",
    "option.improvement.lastHour": "letzte Stunde",
    "option.improvement.today": "heute",
    "toggle.includeLazer": "stable + lazer",
    "toggle.useApiV2": "osu!api v2",
    "toggle.includeHuis": "pp.huismetbenen",
    "toggle.recalculatePp": "PP neu berechnen",
    "toggle.bestPerMap": "beste pro Map",
    "toggle.rankedOnly": "ranked/approved",
    "toggle.includeLoved": "loved mitnehmen",
    "button.clear": "clear",
    "button.search": "Passes suchen",
    "button.loading": "Laedt Passes...",
    "notice.label": "Hinweis:",
    "notice.text": "osu! gibt keine komplette alte Score-Historie aus. Diese lokale Beta speichert gefundene Recent-Passes und baut daraus ab jetzt eine History pro Spieler und Mod.",
    "status.checking": "API wird geprueft",
    "status.ready": "API bereit",
    "status.missing": ".env fehlt",
    "status.offline": "Server nicht erreichbar",
    "aria.mods": "Mods auswaehlen",
    "aria.view": "Ansicht",
    "help.currentSelection": "Aktuelle Auswahl",
    "help.username": "osu!-Name oder User-ID, fuer den die gespeicherten und erreichbaren Scores gesucht werden.",
    "help.mode": "Waehlt den osu!-Ruleset-Modus: osu!standard, taiko, catch oder mania.",
    "help.mode.osu": "osu!standard filtert normale Circle/Slider/Spinner-Scores.",
    "help.mode.taiko": "taiko filtert nur Taiko-Scores dieses Spielers.",
    "help.mode.fruits": "catch filtert nur Catch-the-Beat-Scores.",
    "help.mode.mania": "mania filtert nur osu!mania-Scores.",
    "help.sort": "Bestimmt die Reihenfolge der Ergebnisliste: Datum, PP, Accuracy oder Score.",
    "help.sort.date": "Datum zeigt die neuesten gespeicherten oder neu gefundenen Scores zuerst.",
    "help.sort.pp": "PP sortiert nach dem besten verfuegbaren PP-Wert, inklusive nachberechneter PP.",
    "help.sort.acc": "Accuracy sortiert nach Genauigkeit, unabhaengig davon ob der Score viele PP hat.",
    "help.sort.score": "Score sortiert nach dem Ingame-Scorewert, also der lokalen Ranglisten-Logik.",
    "help.match": "enthaelt alle: Score muss alle gewaehlten Mods haben. exakt: nur genau diese Mods. enthaelt einen: mindestens einer passt.",
    "help.match.contains": "Score muss alle ausgewaehlten Mods enthalten. Zusaetzliche Mods sind erlaubt.",
    "help.match.exact": "Score muss genau diese Mod-Kombination haben. Keine zusaetzlichen Mods.",
    "help.match.any": "Score reicht aus, wenn mindestens einer der ausgewaehlten Mods vorkommt.",
    "help.scanPages": "Wie viele Seiten Recent-Scores aus der osu!api neu eingesammelt werden. Eine Seite kann bis zu 100 Online-Scores liefern.",
    "help.dateRange": "alle Tage nutzt die lokale Datenbank. heute zeigt nur Scores, deren Datum heute in deiner lokalen Zeitzone liegt.",
    "help.date.all": "Sucht ueber alle gespeicherten Tage in der lokalen Datenbank.",
    "help.date.today": "Zeigt nur Scores, deren Datum heute in deiner lokalen Zeitzone liegt.",
    "help.rankNumber": "Blendet eine Nummerierung nach PP ein und erlaubt ein Rangfenster wie 1 bis 100.",
    "help.rank.none": "Keine Rangnummern; die Ergebnisliste wird nur normal sortiert.",
    "help.rank.pp": "Nummeriert alle Treffer nach PP und erlaubt ein Fenster wie Rang 1 bis 100.",
    "help.rankFrom": "Start des PP-Rangfensters, wenn Rangnummer auf PP-Rang steht.",
    "help.rankTo": "Ende des PP-Rangfensters, wenn Rangnummer auf PP-Rang steht.",
    "help.limit": "Wie viele Treffer auf der Seite angezeigt werden. Das ist getrennt von Scan-Seiten.",
    "help.bestTry": "Wenn beste pro Map aktiv ist: bestimmt, welcher Try pro Difficulty behalten wird. Standard ist Score.",
    "help.best.score": "Behaelt pro Difficulty den Try mit dem hoechsten Ingame-Score. Das passt am besten zur lokalen osu!-Rangliste.",
    "help.best.pp": "Behaelt pro Difficulty den Try mit dem hoechsten PP-Wert. Gut fuer Top-Play-Listen.",
    "help.best.acc": "Behaelt pro Difficulty den Try mit der besten Accuracy; bei Gleichstand zaehlen weniger Misses.",
    "help.best.date": "Behaelt pro Difficulty den neuesten gespeicherten Try.",
    "help.improvement": "Vergleicht Von -> Zu fuer den letzten Try, die letzte Stunde oder den heutigen Tag.",
    "help.improvement.lastTry": "Vergleicht den neuesten Try einer Map mit dem direkt vorherigen gespeicherten Try.",
    "help.improvement.lastHour": "Vergleicht den besten Try aus der letzten Stunde mit dem besten gespeicherten Stand davor.",
    "help.improvement.today": "Vergleicht den besten Try von heute mit dem besten gespeicherten Stand vor heute.",
    "help.toggle.includeLazer": "Liest stable- und lazer-Scores ein. Ohne Haken werden moeglichst nur stable-kompatible Scores genutzt.",
    "help.toggle.useApiV2": "Holt aktuelle Recent-Scores aus der offiziellen osu!api und speichert sie lokal.",
    "help.toggle.includeHuis": "Ergaenzt Top-Scores aus pp.huismetbenen, wenn verfuegbar.",
    "help.toggle.recalculatePp": "Berechnet PP mit lokalen .osu-Dateien und rosu-pp-js nach.",
    "help.toggle.bestPerMap": "Zeigt pro Map-Difficulty nur den besten Try nach dem Feld Bester Try.",
    "help.toggle.rankedOnly": "Zeigt nur ranked/approved Maps. Loved kann separat dazugeschaltet werden.",
    "help.toggle.includeLoved": "Nimmt Loved-Maps in den ranked/approved Filter mit auf.",
    "label.allMods": "alle Mods",
    "label.allMapStatuses": "alle Map-Status",
    "label.rankedMaps": "ranked/approved Maps",
    "label.noRank": "kein Rank",
    "label.matches": "Treffer",
    "label.savedPasses": "gespeicherten Passes",
    "label.newCollected": "neu gesammelt",
    "label.local": "lokal",
    "label.ppFilled": "PP ergaenzt",
    "label.ppCalculated": "PP berechnet",
    "label.bestPerMap": "beste pro Map",
    "label.multiplePerMap": "mehrere pro Map",
    "label.unknownArtist": "Unbekannter Artist",
    "label.unknownMap": "Unbekannte Map",
    "label.ppMissing": "PP fehlt",
    "label.ppNotStored": "PP nicht lokal gespeichert",
    "label.openMap": "Map oeffnen",
    "label.openScore": "Score oeffnen",
    "label.ppSourceCalculated": "PP berechnet",
    "label.ppSourceHuis": "PP huis",
    "label.ppSourceApi": "PP aus API",
    "label.ppSourceCache": "PP Cache",
    "label.ppSourceOnline": "PP online",
    "label.noOnlineId": "keine Online-ID",
    "label.apiWithoutPp": "API ohne PP",
    "label.combo": "Combo",
    "label.miss": "Miss",
    "label.score": "Score",
    "label.accuracy": "Accuracy",
    "label.new": "neu",
    "label.noPreviousTry": "kein alter gespeicherter Try",
    "label.from": "Von",
    "label.to": "Zu",
    "empty.noPasses": "Keine gespeicherten Passes fuer {mods} auf {ranked}. Suche spaeter erneut, damit die lokale Datenbank weiter waechst, oder lockere den Filter.",
    "empty.noImprovements.lastTry": "Keine gespeicherten Vergleiche seit dem letzten Try fuer diese Filter.",
    "empty.noImprovements.lastHour": "Keine gespeicherten Vergleiche in der letzten Stunde fuer diese Filter.",
    "empty.noImprovements.today": "Keine gespeicherten Vergleiche heute fuer diese Filter.",
    "loading.search": "Passes werden geladen und in der lokalen Datenbank gespeichert.",
    "error.searchFailed": "Suche fehlgeschlagen.",
  },
  en: {
    "app.eyebrow": "Local Beta",
    "field.language": "Language",
    "field.username": "Player name",
    "field.search": "Search",
    "field.purpose": "Passed maps with mod",
    "field.mode": "Mode",
    "field.sort": "Sort",
    "field.match": "Mod match",
    "field.scanPages": "Scan pages",
    "field.dateRange": "Date range",
    "field.rankNumber": "Rank numbers",
    "field.rankFrom": "Rank from",
    "field.rankTo": "Rank to",
    "field.limit": "Display limit",
    "field.bestTry": "Best try",
    "field.improvement": "Improvement",
    "field.mods": "Mods",
    "placeholder.username": "e.g. WhiteCat",
    "option.sort.date": "Date",
    "option.match.contains": "contains all",
    "option.match.exact": "exact",
    "option.match.any": "contains any",
    "option.date.all": "all dates",
    "option.date.today": "today",
    "option.rank.none": "off",
    "option.rank.pp": "PP rank",
    "option.best.date": "newest",
    "option.improvement.lastTry": "last try",
    "option.improvement.lastHour": "last hour",
    "option.improvement.today": "today",
    "toggle.includeLazer": "stable + lazer",
    "toggle.useApiV2": "osu!api v2",
    "toggle.includeHuis": "pp.huismetbenen",
    "toggle.recalculatePp": "recalculate PP",
    "toggle.bestPerMap": "best per map",
    "toggle.rankedOnly": "ranked/approved",
    "toggle.includeLoved": "include loved",
    "button.clear": "clear",
    "button.search": "Search passes",
    "button.loading": "Loading passes...",
    "notice.label": "Note:",
    "notice.text": "osu! does not expose a complete old score history. This local beta stores found recent passes and builds a local history per player and mod from now on.",
    "status.checking": "Checking API",
    "status.ready": "API ready",
    "status.missing": ".env missing",
    "status.offline": "Server unreachable",
    "aria.mods": "Select mods",
    "aria.view": "View",
    "help.currentSelection": "Current selection",
    "help.username": "osu! name or user ID whose stored and reachable scores should be searched.",
    "help.mode": "Selects the osu! ruleset: osu!standard, taiko, catch, or mania.",
    "help.mode.osu": "osu!standard filters normal circle, slider, and spinner scores.",
    "help.mode.taiko": "taiko filters only this player's Taiko scores.",
    "help.mode.fruits": "catch filters only Catch the Beat scores.",
    "help.mode.mania": "mania filters only osu!mania scores.",
    "help.sort": "Controls the result order: date, PP, accuracy, or score.",
    "help.sort.date": "Date shows the newest stored or newly found scores first.",
    "help.sort.pp": "PP sorts by the best available PP value, including recalculated PP.",
    "help.sort.acc": "Accuracy sorts by accuracy, independent of how much PP the score has.",
    "help.sort.score": "Score sorts by the in-game score value, matching the local leaderboard logic.",
    "help.match": "contains all: score must include every selected mod. exact: only this exact mod set. contains any: at least one selected mod is enough.",
    "help.match.contains": "The score must include every selected mod. Extra mods are allowed.",
    "help.match.exact": "The score must have exactly this mod combination. No extra mods.",
    "help.match.any": "A score matches when at least one selected mod is present.",
    "help.scanPages": "How many recent-score pages are collected from osu!api. One page can provide up to 100 online scores.",
    "help.dateRange": "all dates uses the local database. today only shows scores whose date is today in your local time zone.",
    "help.date.all": "Searches across all stored days in the local database.",
    "help.date.today": "Shows only scores dated today in your local time zone.",
    "help.rankNumber": "Shows PP-based numbering and enables a rank window like 1 to 100.",
    "help.rank.none": "No rank numbers; the result list is only sorted normally.",
    "help.rank.pp": "Numbers all results by PP and allows a window like rank 1 to 100.",
    "help.rankFrom": "Start of the PP rank window when rank numbers are set to PP rank.",
    "help.rankTo": "End of the PP rank window when rank numbers are set to PP rank.",
    "help.limit": "How many results are shown on the page. This is separate from scan pages.",
    "help.bestTry": "When best per map is enabled, this decides which try is kept per difficulty. Default is score.",
    "help.best.score": "Keeps the try with the highest in-game score per difficulty. This best matches the local osu! leaderboard.",
    "help.best.pp": "Keeps the try with the highest PP value per difficulty. Good for top-play style lists.",
    "help.best.acc": "Keeps the try with the best accuracy per difficulty; fewer misses win ties.",
    "help.best.date": "Keeps the newest stored try per difficulty.",
    "help.improvement": "Compares From -> To for the last try, last hour, or today.",
    "help.improvement.lastTry": "Compares the newest try on a map with the directly previous stored try.",
    "help.improvement.lastHour": "Compares the best try from the last hour with the best stored state before that.",
    "help.improvement.today": "Compares today's best try with the best stored state before today.",
    "help.toggle.includeLazer": "Reads stable and lazer scores. Without this, the app tries to use stable-compatible scores only.",
    "help.toggle.useApiV2": "Fetches recent scores from the official osu!api and stores them locally.",
    "help.toggle.includeHuis": "Adds top scores from pp.huismetbenen when available.",
    "help.toggle.recalculatePp": "Recalculates PP using local .osu files and rosu-pp-js.",
    "help.toggle.bestPerMap": "Shows only the best try per map difficulty according to the Best try field.",
    "help.toggle.rankedOnly": "Shows only ranked/approved maps. Loved maps can be added separately.",
    "help.toggle.includeLoved": "Includes loved maps in the ranked/approved filter.",
    "label.allMods": "all mods",
    "label.allMapStatuses": "all map statuses",
    "label.rankedMaps": "ranked/approved maps",
    "label.noRank": "no rank",
    "label.matches": "matches",
    "label.savedPasses": "stored passes",
    "label.newCollected": "newly collected",
    "label.local": "local",
    "label.ppFilled": "PP filled",
    "label.ppCalculated": "PP calculated",
    "label.bestPerMap": "best per map",
    "label.multiplePerMap": "multiple per map",
    "label.unknownArtist": "Unknown artist",
    "label.unknownMap": "Unknown map",
    "label.ppMissing": "PP missing",
    "label.ppNotStored": "PP not stored locally",
    "label.openMap": "Open map",
    "label.openScore": "Open score",
    "label.ppSourceCalculated": "PP calculated",
    "label.ppSourceHuis": "PP huis",
    "label.ppSourceApi": "PP from API",
    "label.ppSourceCache": "PP cache",
    "label.ppSourceOnline": "PP online",
    "label.noOnlineId": "no online ID",
    "label.apiWithoutPp": "API without PP",
    "label.combo": "Combo",
    "label.miss": "Miss",
    "label.score": "Score",
    "label.accuracy": "Accuracy",
    "label.new": "new",
    "label.noPreviousTry": "no previous stored try",
    "label.from": "From",
    "label.to": "To",
    "empty.noPasses": "No stored passes for {mods} on {ranked}. Search again later so the local database can grow, or loosen the filters.",
    "empty.noImprovements.lastTry": "No stored comparisons since the last try for these filters.",
    "empty.noImprovements.lastHour": "No stored comparisons in the last hour for these filters.",
    "empty.noImprovements.today": "No stored comparisons today for these filters.",
    "loading.search": "Loading passes and storing them in the local database.",
    "error.searchFailed": "Search failed.",
  },
};

function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(languageStorageKey);
    return stored === "en" || stored === "de" ? stored : "de";
  } catch {
    return "de";
  }
}

function storeLanguage(language) {
  try {
    localStorage.setItem(languageStorageKey, language);
  } catch {
    // Language persistence is optional; the UI can still switch for this session.
  }
}

function t(key, values = {}) {
  const template = translations[currentLanguage]?.[key] ?? translations.de[key] ?? key;
  return Object.entries(values).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

function locale() {
  return currentLanguage === "en" ? "en-US" : "de-DE";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;");
}

function formatNumber(value) {
  if (value === null || value === undefined || value === "") return "-";
  return new Intl.NumberFormat(locale()).format(value);
}

function formatPp(value) {
  return value ? `${Number(value).toFixed(2)}pp` : t("label.ppMissing");
}

function formatAccuracy(value) {
  if (value === null || value === undefined) return "-";
  const percent = value > 1 ? value : value * 100;
  return `${percent.toFixed(2)}%`;
}

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale(), {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Berlin",
  }).format(date);
}

function secondsToTime(totalSeconds) {
  if (!Number.isFinite(Number(totalSeconds))) return "-";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.trunc(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function coverUrl(score) {
  const set = score.beatmapset || {};
  const covers = set.covers || {};
  if (covers.list) return covers.list;
  if (covers.card) return covers.card;
  if (covers.cover) return covers.cover;
  if (score.beatmap?.beatmapset_id) {
    return `https://assets.ppy.sh/beatmaps/${score.beatmap.beatmapset_id}/covers/list.jpg`;
  }
  return "";
}

function beatmapUrl(score) {
  if (score.beatmap?.url) return score.beatmap.url;
  const id = score.beatmap_id || score.beatmap?.id;
  return id ? `https://osu.ppy.sh/beatmaps/${id}` : "#";
}

function scoreUrl(score, mode) {
  if (score.local_source || score.external_source) {
    return beatmapUrl(score);
  }

  const scoreId = score.legacy_score_id || score.id;
  if (scoreId && !String(scoreId).startsWith("local:")) {
    return `https://osu.ppy.sh/scores/${mode}/${scoreId}`;
  }
  return beatmapUrl(score);
}

function scoreLinkLabel(score) {
  return score.local_source || score.external_source ? t("label.openMap") : t("label.openScore");
}

function missCount(score) {
  const stats = score.statistics || {};
  return stats.miss || stats.count_miss || 0;
}

function renderMods(score) {
  const mods = score.normalized_mods || [];
  if (mods.length === 0) {
    return '<span class="mod-badge" title="No Mod">NM</span>';
  }

  return mods
    .map((mod) => {
      const label = escapeHtml(mod.acronym);
      const title = escapeHtml(modNames[mod.acronym] || mod.acronym);
      return `<span class="mod-badge" title="${title}">${label}</span>`;
    })
    .join("");
}

function clientLabel(score) {
  if (score.client === "lazer") return "lazer";
  if (score.client === "stable") return "stable";
  if (score.local_source?.startsWith("lazer")) return "lazer";
  return score.legacy_score_id ? "stable" : "lazer";
}

function storageLabel(score) {
  if (score.external_source === "huismetbenen") return "huis";
  return score.local_source ? t("label.local") : "online";
}

function ppSourceLabel(score) {
  if (score.pp_source === "rosu-current") return t("label.ppSourceCalculated");
  if (score.pp_source === "huismetbenen-live") return t("label.ppSourceHuis");
  if (score.pp_source === "osu-api") return t("label.ppSourceApi");
  if (score.pp_source === "cache") return t("label.ppSourceCache");
  if (score.pp) return t("label.ppSourceOnline");
  if (score.local_source && !score.legacy_score_id) return t("label.noOnlineId");
  if (score.local_source) return t("label.apiWithoutPp");
  return t("label.ppMissing");
}

function setLoading(nextLoading) {
  isLoading = nextLoading;
  submitButton.disabled = nextLoading;
  submitButton.textContent = nextLoading ? t("button.loading") : t("button.search");
}

function setResultsState(html) {
  results.innerHTML = html;
}

function setImprovementState(html) {
  improvements.innerHTML = html;
}

function updateModButtons() {
  for (const button of modButtons.querySelectorAll("button")) {
    const mods = button.dataset.mods.split(",");
    const active = mods.length > 0 && mods.every((mod) => selectedMods.has(mod));
    button.classList.toggle("active", active);
  }
}

function updateFieldHelp(field) {
  const icon = field.querySelector(".help-icon");
  if (!icon) return;

  const baseText = icon.dataset.helpKey
    ? t(icon.dataset.helpKey)
    : icon.dataset.baseHelp || icon.getAttribute("title") || icon.dataset.help || "";
  icon.dataset.baseHelp = baseText;
  icon.removeAttribute("title");
  icon.tabIndex = 0;

  const select = field.querySelector("select");
  const selectedOption = select?.selectedOptions?.[0];
  const selectedHelp = selectedOption?.dataset.helpKey
    ? t(selectedOption.dataset.helpKey)
    : selectedOption?.dataset.help || "";
  icon.dataset.help = selectedHelp
    ? `${baseText}\n\n${t("help.currentSelection")}: ${selectedHelp}`
    : baseText;
  icon.setAttribute("aria-label", icon.dataset.help);
}

function refreshHelp() {
  for (const field of document.querySelectorAll(".field")) {
    updateFieldHelp(field);
  }

  for (const label of document.querySelectorAll(".toggles label")) {
    const help = label.dataset.helpKey
      ? t(label.dataset.helpKey)
      : label.getAttribute("title") || label.dataset.help || "";
    if (!help) continue;
    label.dataset.help = help;
    label.removeAttribute("title");
  }
}

function initHelp() {
  for (const field of document.querySelectorAll(".field")) {
    const select = field.querySelector("select");
    if (select && !field.dataset.helpBound) {
      select.addEventListener("change", () => updateFieldHelp(field));
      field.dataset.helpBound = "1";
    }
  }
  refreshHelp();
}

function applyLanguage(language, { rerender = true } = {}) {
  currentLanguage = language === "en" ? "en" : "de";
  document.documentElement.lang = currentLanguage;
  if (languageSelect) languageSelect.value = currentLanguage;

  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }

  for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
    element.setAttribute("placeholder", t(element.dataset.i18nPlaceholder));
  }

  for (const element of document.querySelectorAll("[data-i18n-aria-label]")) {
    element.setAttribute("aria-label", t(element.dataset.i18nAriaLabel));
  }

  refreshHelp();
  setLoading(isLoading);
  if (rerender && lastSearchData) renderSearchData(lastSearchData);
}

async function checkStatus() {
  try {
    const response = await fetch("/api/status");
    const data = await response.json();
    apiStatus.className = `status-pill ${data.hasCredentials ? "ready" : "missing"}`;
    apiStatus.textContent = data.hasCredentials ? t("status.ready") : t("status.missing");
  } catch {
    apiStatus.className = "status-pill missing";
    apiStatus.textContent = t("status.offline");
  }
}

function buildSearchParams() {
  const params = new URLSearchParams();
  params.set("username", document.querySelector("#username").value.trim());
  params.set("type", "recent");
  params.set("mode", document.querySelector("#mode").value);
  params.set("sort", document.querySelector("#sort").value);
  params.set("match", document.querySelector("#match").value);
  params.set("pages", document.querySelector("#pages").value || "2");
  params.set("dateFilter", document.querySelector("#dateFilter").value);
  params.set("rankMode", document.querySelector("#rankMode").value);
  params.set("rankFrom", document.querySelector("#rankFrom").value || "1");
  params.set("rankTo", document.querySelector("#rankTo").value || "100");
  params.set("limit", document.querySelector("#limit").value || "100");
  params.set("bestMode", document.querySelector("#bestMode").value);
  params.set("improvementScope", document.querySelector("#improvementScope").value);
  params.set("mods", [...selectedMods].join(","));
  params.set("includeLazer", document.querySelector("#includeLazer").checked ? "1" : "0");
  params.set("useApiV2", document.querySelector("#useApiV2").checked ? "1" : "0");
  params.set("includeHuis", document.querySelector("#includeHuis").checked ? "1" : "0");
  params.set("recalculatePp", document.querySelector("#recalculatePp").checked ? "1" : "0");
  params.set("bestPerMap", document.querySelector("#bestPerMap").checked ? "1" : "0");
  params.set("passesOnly", "1");
  params.set("rankedOnly", document.querySelector("#rankedOnly").checked ? "1" : "0");
  params.set("includeLoved", document.querySelector("#includeLoved").checked ? "1" : "0");
  return params;
}

function emptyMessage(meta) {
  const modText = meta.selectedMods.length ? meta.selectedMods.join("+") : t("label.allMods");
  const rankedText = meta.rankedOnly ? t("label.rankedMaps") : t("label.allMapStatuses");

  return `
    <div class="empty-state">
      ${escapeHtml(t("empty.noPasses", { mods: modText, ranked: rankedText }))}
    </div>
  `;
}

function renderSummary(data) {
  const stats = data.user.statistics || {};
  const globalRank = stats.global_rank ? `#${formatNumber(stats.global_rank)}` : t("label.noRank");
  const avatar = data.user.avatar_url
    ? `<img src="${escapeHtml(data.user.avatar_url)}" alt="" />`
    : '<div class="avatar-fallback"></div>';

  summary.classList.remove("hidden");
  summary.innerHTML = `
    <div class="user-card">
      ${avatar}
      <div>
        <h2>${escapeHtml(data.user.username)}</h2>
        <p>${escapeHtml(data.user.country_code || "--")} - ${escapeHtml(globalRank)}</p>
      </div>
    </div>
    <div class="summary-stat">
      ${formatNumber(data.meta.returned)} ${t("label.matches")} ${data.meta.historyTotal ? `${currentLanguage === "de" ? "aus" : "from"} ${formatNumber(data.meta.historyTotal)} ${t("label.savedPasses")}` : ""} -
      ${formatNumber(data.meta.savedNow)} ${t("label.newCollected")} -
      ${formatNumber(data.meta.localImported || 0)} ${t("label.local")} -
      ${formatNumber(data.meta.huisFetched || 0)} huis -
      ${formatNumber(data.meta.ppFilled || 0)} ${t("label.ppFilled")} -
      ${formatNumber(data.meta.ppCalculated || 0)} ${t("label.ppCalculated")} -
      ${data.meta.bestPerMap ? `${t("label.bestPerMap")} (${data.meta.bestMode || "score"})` : t("label.multiplePerMap")} -
      ${data.meta.selectedMods.length ? data.meta.selectedMods.join("+") : t("label.allMods")}
    </div>
  `;
}

function renderScore(score, mode) {
  const beatmap = score.beatmap || {};
  const set = score.beatmapset || {};
  const artist = set.artist || beatmap.artist || t("label.unknownArtist");
  const title = set.title || beatmap.title || t("label.unknownMap");
  const version = beatmap.version || "Difficulty";
  const star = beatmap.difficulty_rating ? `${Number(beatmap.difficulty_rating).toFixed(2)}*` : "-";
  const bpm = beatmap.bpm ? `${Math.round(beatmap.bpm)} BPM` : "-";
  const length = secondsToTime(beatmap.total_length || beatmap.hit_length);
  const status = beatmap.status || "unknown";
  const scoreLink = scoreUrl(score, mode);
  const scoreLinkText = scoreLinkLabel(score);
  const mapLink = beatmapUrl(score);
  const cover = coverUrl(score);
  const coverHtml = cover
    ? `<img class="cover" src="${escapeHtml(cover)}" alt="" loading="lazy" />`
    : '<div class="cover cover-fallback"></div>';
  const client = clientLabel(score);
  const sourceLabel = storageLabel(score);
  const ppLabel = ppSourceLabel(score);
  const ppTitle = score.pp_source ? ppLabel : t("label.ppNotStored");
  const ppRank = score.pp_rank ? `<span class="pp-rank-badge">#${formatNumber(score.pp_rank)}</span>` : "";

  return `
    <article class="score-card">
      ${coverHtml}
      <div class="score-main">
        <div class="map-title">
          ${ppRank}
          <span class="rank-badge">${escapeHtml(score.rank || "")}</span>
          <a href="${escapeHtml(mapLink)}" target="_blank" rel="noreferrer">
            ${escapeHtml(artist)} - ${escapeHtml(title)}
          </a>
        </div>
        <div class="diff">[${escapeHtml(version)}]</div>
        <div class="mods">${renderMods(score)}</div>
        <div class="meta-line">
          <span class="source-chip client-${escapeHtml(client)}">${escapeHtml(client)}</span>
          <span class="source-chip">${escapeHtml(sourceLabel)}</span>
          <span>${escapeHtml(status)}</span>
          <span class="source-chip pp-source">${escapeHtml(ppLabel)}</span>
          <span>${star}</span>
          <span>${bpm}</span>
          <span>${length}</span>
          <span>${formatDate(score.ended_at || score.created_at)}</span>
        </div>
        <div class="stat-line">
          <span>${formatNumber(score.max_combo)}x ${t("label.combo")}</span>
          <span>${missCount(score)} ${t("label.miss")}</span>
          <span>${formatNumber(score.score)} ${t("label.score")}</span>
          <a href="${escapeHtml(scoreLink)}" target="_blank" rel="noreferrer">${escapeHtml(scoreLinkText)}</a>
        </div>
      </div>
      <div class="score-side">
        <div class="pp" title="${escapeHtml(ppTitle)}">${formatPp(score.pp)}</div>
        <div class="acc">${formatAccuracy(score.accuracy)}</div>
        <div class="small">${t("label.accuracy")}</div>
      </div>
    </article>
  `;
}

function signedNumber(value, suffix = "") {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return t("label.new");
  const number = Number(value);
  return `${number >= 0 ? "+" : ""}${formatNumber(number)}${suffix}`;
}

function signedPp(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return t("label.new");
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}pp`;
}

function signedAccuracy(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return t("label.new");
  return `${value >= 0 ? "+" : ""}${(value * 100).toFixed(2)}%`;
}

function scoreSnapshot(label, score) {
  if (!score) {
    return `
      <div class="score-snapshot muted-snapshot">
        <span>${escapeHtml(label)}</span>
        <strong>${t("label.noPreviousTry")}</strong>
      </div>
    `;
  }

  return `
    <div class="score-snapshot">
      <span>${escapeHtml(label)}</span>
      <strong>${formatPp(score.pp)} - ${formatAccuracy(score.accuracy)}</strong>
      <small>${formatNumber(score.score)} ${t("label.score")} - ${formatNumber(score.max_combo)}x - ${missCount(score)} ${t("label.miss")}</small>
      <small>${formatDate(score.ended_at || score.created_at)}</small>
    </div>
  `;
}

function renderImprovement(item, mode) {
  const score = item.score;
  const previous = item.previous;
  const beatmap = score.beatmap || {};
  const set = score.beatmapset || {};
  const artist = set.artist || beatmap.artist || t("label.unknownArtist");
  const title = set.title || beatmap.title || t("label.unknownMap");
  const version = beatmap.version || "Difficulty";
  const accDelta = signedAccuracy(item.acc_delta);
  const ppDelta = signedPp(item.pp_delta);
  const missDelta =
    item.miss_delta === null
      ? t("label.new")
      : item.miss_delta >= 0
        ? `-${formatNumber(item.miss_delta)} ${t("label.miss")}`
        : `+${formatNumber(Math.abs(item.miss_delta))} ${t("label.miss")}`;
  const scoreDelta = signedNumber(item.score_delta, ` ${t("label.score")}`);
  const comboDelta = signedNumber(item.combo_delta, "x");
  const linkText = scoreLinkLabel(score);

  return `
    <article class="improvement-card">
      <div>
        <div class="map-title">
          <span class="rank-badge">${escapeHtml(score.rank || "")}</span>
          <a href="${escapeHtml(scoreUrl(score, mode))}" target="_blank" rel="noreferrer">
            ${escapeHtml(artist)} - ${escapeHtml(title)}
          </a>
          <span class="source-chip">${escapeHtml(linkText)}</span>
        </div>
        <div class="diff">[${escapeHtml(version)}]</div>
        <div class="mods">${renderMods(score)}</div>
        <div class="improvement-flow">
          ${scoreSnapshot(t("label.from"), previous)}
          ${scoreSnapshot(t("label.to"), score)}
        </div>
      </div>
      <div class="improvement-stats">
        <span>${escapeHtml(ppDelta)}</span>
        <span>${escapeHtml(accDelta)}</span>
        <span>${escapeHtml(missDelta)}</span>
        <span>${escapeHtml(scoreDelta)}</span>
        <span>${escapeHtml(comboDelta)}</span>
      </div>
    </article>
  `;
}

function renderImprovements(data) {
  if (!data.improvements?.length) {
    const key = data.meta.improvementScope === "lastHour"
      ? "empty.noImprovements.lastHour"
      : data.meta.improvementScope === "today"
        ? "empty.noImprovements.today"
        : "empty.noImprovements.lastTry";
    setImprovementState(`<div class="empty-state">${escapeHtml(t(key))}</div>`);
    return;
  }

  setImprovementState(data.improvements.map((item) => renderImprovement(item, data.meta.mode)).join(""));
}

function renderSearchData(data) {
  renderSummary(data);
  renderImprovements(data);

  if (!data.scores.length) {
    setResultsState(emptyMessage(data.meta));
    return;
  }

  setResultsState(data.scores.map((score) => renderScore(score, data.meta.mode)).join(""));
}

async function runSearch(event) {
  event.preventDefault();
  summary.classList.add("hidden");
  lastSearchData = null;
  setLoading(true);
  setResultsState(`<div class="loading-state">${escapeHtml(t("loading.search"))}</div>`);
  setImprovementState("");

  try {
    const params = buildSearchParams();
    const response = await fetch(`/api/search?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || t("error.searchFailed"));
    }

    lastSearchData = data;
    renderSearchData(data);
  } catch (error) {
    setResultsState(`<div class="error-state">${escapeHtml(error.message)}</div>`);
  } finally {
    setLoading(false);
  }
}

modButtons.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-mods]");
  if (!button) return;

  const mods = button.dataset.mods.split(",");
  const allActive = mods.every((mod) => selectedMods.has(mod));

  if (mods.includes("NM")) selectedMods.clear();

  if (allActive) {
    for (const mod of mods) selectedMods.delete(mod);
  } else {
    selectedMods.delete("NM");
    for (const mod of mods) selectedMods.add(mod);
  }

  updateModButtons();
});

clearMods.addEventListener("click", () => {
  selectedMods.clear();
  updateModButtons();
});

viewTabs.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-view]");
  if (!button) return;

  for (const tab of viewTabs.querySelectorAll("button")) {
    tab.classList.toggle("active", tab === button);
  }

  const view = button.dataset.view;
  results.classList.toggle("hidden", view !== "scores");
  improvements.classList.toggle("hidden", view !== "improvements");
});

languageSelect?.addEventListener("change", () => {
  storeLanguage(languageSelect.value);
  applyLanguage(languageSelect.value);
  checkStatus();
});

form.addEventListener("submit", runSearch);

initHelp();
applyLanguage(currentLanguage, { rerender: false });
checkStatus();
