const form = document.querySelector("#searchForm");
const apiStatus = document.querySelector("#apiStatus");
const liveStatus = document.querySelector("#liveStatus");
const updateStatus = document.querySelector("#updateStatus");
const startupSync = document.querySelector("#startupSync");
const results = document.querySelector("#results");
const passes = document.querySelector("#passes");
const improvements = document.querySelector("#improvements");
const calendar = document.querySelector("#calendar");
const detailsPanel = document.querySelector("#detailsPanel");
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
let activeView = "scores";
let currentCalendarDay = "";
let currentCalendarMonth = "";
let calendarPpMin = "";
let calendarPpMax = "";
let passStarMin = "6.54";
let passStarMax = "7";
let liveTimer = null;
let liveScanBusy = false;
let ppProgressTimer = null;
let activePpProgressJob = "";
let calendarLoadingMonth = "";
let latestUpdateInfo = null;
let startupSyncTimer = null;
let latestStartupSync = null;

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

const clockRateDefaultByMod = new Map([
  ["DT", 1.5],
  ["NC", 1.5],
  ["HT", 0.75],
]);
const clockRateModAcronyms = new Set([...clockRateDefaultByMod.keys(), "RA"]);
const unrankedGameplayMods = new Set(["RX", "AP", "AT", "CN"]);
const customRateKeys = [
  "speed_change",
  "speedChange",
  "SpeedChange",
  "clock_rate",
  "clockRate",
  "rate",
  "speed",
];

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
    "tab.scores": "Scores",
    "tab.passes": "Passes",
    "tab.improvements": "Improvement",
    "tab.calendar": "Kalender",
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
    "toggle.liveScanner": "Live-Scanner",
    "toggle.rankedOnly": "ranked/approved",
    "toggle.includeLoved": "loved mitnehmen",
    "button.clear": "clear",
    "button.search": "Passes suchen",
    "button.loading": "Laedt Passes...",
    "button.details": "Details",
    "button.history": "Verlauf",
    "button.close": "Schliessen",
    "button.prevMonth": "Vorheriger Monat",
    "button.nextMonth": "Naechster Monat",
    "button.today": "Heute",
    "button.apply": "Anwenden",
    "button.reset": "Zuruecksetzen",
    "notice.label": "Hinweis:",
    "notice.text": "osu! gibt keine komplette alte Score-Historie aus. Diese lokale Beta speichert gefundene Recent-Passes und baut daraus ab jetzt eine History pro Spieler und Mod.",
    "status.checking": "API wird geprueft",
    "status.ready": "API bereit",
    "status.missing": ".env fehlt",
    "status.offline": "Server nicht erreichbar",
    "status.liveIdle": "Live bereit",
    "status.liveWaiting": "Live wartet",
    "status.liveScanning": "Live scannt",
    "status.liveUpdated": "{count} neue Scores",
    "status.liveNoChanges": "Live aktuell",
    "status.liveStopped": "Live aus",
    "status.liveError": "Live Fehler",
    "update.checking": "Update pruefen",
    "update.current": "Aktuell",
    "update.available": "Update verfuegbar",
    "update.error": "Update Fehler",
    "update.installing": "Updater startet",
    "update.started": "Updater geoeffnet",
    "update.confirm": "Neue Version verfuegbar: {current} -> {latest}.{changes}\n\nUpdate jetzt starten? .env, Datenbank und lokale Score-Daten bleiben erhalten. Die App startet danach automatisch neu.",
    "update.changes": "\n\nWas ist neu:\n{changes}",
    "update.none": "Du nutzt bereits die aktuelle Version.",
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
    "help.toggle.liveScanner": "Prueft nach einer Suche automatisch deine lokalen osu!-Dateien und aktualisiert die Ansicht, wenn neue Scores gespeichert wurden.",
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
    "label.ppStatus": "PP-Status",
    "sync.title": "Automatischer Score-Sync",
    "sync.scheduled": "Der Hintergrund-Sync wird vorbereitet...",
    "sync.online": "Online-Scores werden geprueft: {done} von {total} API-Seiten",
    "sync.rateLimited": "osu! begrenzt die API gerade. Automatische Fortsetzung in etwa {seconds} Sek.",
    "sync.local": "Lokale osu!-Scores werden eingelesen...",
    "sync.pp": "Fehlende PP werden lokal berechnet: {done} von {total}",
    "sync.done": "Der automatische Score-Sync ist abgeschlossen.",
    "sync.idle": "Der automatische Sync startet, sobald ein Spieler lokal gespeichert wurde.",
    "sync.disabled": "Der Online-Sync wartet auf gueltige osu! API-Zugangsdaten.",
    "sync.error": "Der automatische Score-Sync konnte nicht abgeschlossen werden.",
    "sync.newScores": "{count} neue Scores",
    "sync.onlineScores": "{count} online gefunden",
    "sync.localScores": "{count} lokal gefunden",
    "sync.ppFilled": "{count} PP berechnet",
    "sync.eta": "Restzeit ca. {time}",
    "sync.queue": "{count} API-Anfragen warten",
    "label.ppQueued": "PP-Warteschlange",
    "label.ppAttempted": "bearbeitet",
    "label.ppVisibleReady": "sichtbare Scores geprueft",
    "label.ppBackfillUntil": "stueckweise aufgefuellt bis",
    "label.ppEngine": "PP-Engine",
    "label.ppEngineOutdated": "veraltet, aktuell",
    "label.bestPerMap": "beste pro Map",
    "label.multiplePerMap": "mehrere pro Map",
    "label.unknownArtist": "Unbekannter Artist",
    "label.unknownMap": "Unbekannte Map",
    "label.ppMissing": "PP fehlt",
    "label.ppNotStored": "PP nicht lokal gespeichert",
    "label.openMap": "Map oeffnen",
    "label.openScore": "Score oeffnen",
    "label.ppSourceCalculated": "PP berechnet",
    "label.ppSourceMatched": "PP uebernommen",
    "label.ppSourceHuis": "PP huis",
    "label.ppSourceApi": "PP aus API",
    "label.ppSourceCache": "PP Cache",
    "label.ppSourceOnline": "PP online",
    "label.ppSourceUnranked": "kein ranked PP",
    "label.noOnlineId": "keine Online-ID",
    "label.apiWithoutPp": "API ohne PP",
    "label.unrankedMod": "unranked Mod",
    "label.unrankedRelax": "RX ist unranked",
    "label.unrankedCustomRate": "Custom-Rate ist unranked",
    "label.combo": "Combo",
    "label.miss": "Miss",
    "label.score": "Score",
    "label.accuracy": "Accuracy",
    "label.new": "neu",
    "label.noPreviousTry": "kein alter gespeicherter Try",
    "label.from": "Von",
    "label.to": "Zu",
    "label.calendarDays": "Spieltage",
    "label.calendarScores": "Scores an diesem Tag",
    "label.calendarBestPp": "Beste PP",
    "label.calendarAverageAcc": "Durchschnitts-Acc",
    "label.calendarMisses": "Misses",
    "label.calendarMonthScores": "Scores in diesem Monat",
    "label.calendarPpFilter": "Kalender PP-Range",
    "label.calendarMinPp": "Min PP",
    "label.calendarMaxPp": "Max PP",
    "label.passesTitle": "Passes nach Sternen",
    "label.passStarFilter": "Sterne-Range",
    "label.minStars": "Min Sterne",
    "label.maxStars": "Max Sterne",
    "label.totalPasses": "Passes insgesamt",
    "label.shownPasses": "angezeigte Maps",
    "label.bestPassPp": "Beste PP",
    "label.highestStars": "Hoechste Sterne",
    "label.averageStars": "Durchschnitts-Sterne",
    "label.playedDay": "gespielt",
    "label.monthTopPlay": "Top-Play des Monats",
    "label.noScoresDay": "keine Scores",
    "label.mapDetails": "Map-Details",
    "label.historyChart": "Improvement-Verlauf",
    "label.timeAxis": "Zeit",
    "label.metricPp": "PP",
    "label.metricAcc": "Acc",
    "label.metricMisses": "Misses",
    "label.tries": "Tries",
    "label.bestPp": "Beste PP",
    "label.bestScore": "Bester Score",
    "label.latestTry": "Neuster Try",
    "empty.noPasses": "Keine gespeicherten Passes fuer {mods} auf {ranked}. Suche spaeter erneut, damit die lokale Datenbank weiter waechst, oder lockere den Filter.",
    "empty.noImprovements.lastTry": "Keine gespeicherten Vergleiche seit dem letzten Try fuer diese Filter.",
    "empty.noImprovements.lastHour": "Keine gespeicherten Vergleiche in der letzten Stunde fuer diese Filter.",
    "empty.noImprovements.today": "Keine gespeicherten Vergleiche heute fuer diese Filter.",
    "empty.noCalendar": "Noch keine gespeicherten Spieltage fuer diese Filter.",
    "empty.noDayScores": "An diesem Tag sind fuer diese Filter keine Scores gespeichert.",
    "empty.noMapDetails": "Fuer diese Difficulty wurden in der aktuellen Suche keine weiteren Tries gefunden.",
    "empty.noStarPasses": "Keine Passes in dieser Sterne-Range gefunden.",
    "empty.passSearchFirst": "Stelle die Sterne-Range ein und starte dann eine Suche.",
    "loading.search": "Passes werden geladen und in der lokalen Datenbank gespeichert.",
    "loading.ppProgress": "PP wird nachberechnet: {done} von {total}",
    "loading.ppStarting": "PP-Nachberechnung wird vorbereitet...",
    "loading.calendarPp": "Kalender-Monat wird nachberechnet...",
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
    "tab.scores": "Scores",
    "tab.passes": "Passes",
    "tab.improvements": "Improvement",
    "tab.calendar": "Calendar",
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
    "toggle.liveScanner": "Live scanner",
    "toggle.rankedOnly": "ranked/approved",
    "toggle.includeLoved": "include loved",
    "button.clear": "clear",
    "button.search": "Search passes",
    "button.loading": "Loading passes...",
    "button.details": "Details",
    "button.history": "History",
    "button.close": "Close",
    "button.prevMonth": "Previous month",
    "button.nextMonth": "Next month",
    "button.today": "Today",
    "button.apply": "Apply",
    "button.reset": "Reset",
    "notice.label": "Note:",
    "notice.text": "osu! does not expose a complete old score history. This local beta stores found recent passes and builds a local history per player and mod from now on.",
    "status.checking": "Checking API",
    "status.ready": "API ready",
    "status.missing": ".env missing",
    "status.offline": "Server unreachable",
    "status.liveIdle": "Live ready",
    "status.liveWaiting": "Live waiting",
    "status.liveScanning": "Live scanning",
    "status.liveUpdated": "{count} new scores",
    "status.liveNoChanges": "Live current",
    "status.liveStopped": "Live off",
    "status.liveError": "Live error",
    "update.checking": "Check update",
    "update.current": "Up to date",
    "update.available": "Update available",
    "update.error": "Update error",
    "update.installing": "Starting updater",
    "update.started": "Updater opened",
    "update.confirm": "New version available: {current} -> {latest}.{changes}\n\nStart the update now? .env, database, and local score data will be kept. The app will restart automatically afterwards.",
    "update.changes": "\n\nWhat's new:\n{changes}",
    "update.none": "You are already on the latest version.",
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
    "help.toggle.liveScanner": "After a search, automatically checks your local osu! files and refreshes the view when new scores are stored.",
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
    "label.ppStatus": "PP status",
    "sync.title": "Automatic score sync",
    "sync.scheduled": "Preparing the background sync...",
    "sync.online": "Checking online scores: {done} of {total} API pages",
    "sync.rateLimited": "osu! is currently limiting the API. Continuing automatically in about {seconds} sec.",
    "sync.local": "Reading local osu! scores...",
    "sync.pp": "Calculating missing PP locally: {done} of {total}",
    "sync.done": "The automatic score sync is complete.",
    "sync.idle": "Automatic sync will start after a player has been stored locally.",
    "sync.disabled": "Online sync is waiting for valid osu! API credentials.",
    "sync.error": "The automatic score sync could not be completed.",
    "sync.newScores": "{count} new scores",
    "sync.onlineScores": "{count} found online",
    "sync.localScores": "{count} found locally",
    "sync.ppFilled": "{count} PP calculated",
    "sync.eta": "About {time} remaining",
    "sync.queue": "{count} API requests queued",
    "label.ppQueued": "PP queue",
    "label.ppAttempted": "processed",
    "label.ppVisibleReady": "visible scores checked",
    "label.ppBackfillUntil": "chunked backfill reached",
    "label.ppEngine": "PP engine",
    "label.ppEngineOutdated": "outdated, latest",
    "label.bestPerMap": "best per map",
    "label.multiplePerMap": "multiple per map",
    "label.unknownArtist": "Unknown artist",
    "label.unknownMap": "Unknown map",
    "label.ppMissing": "PP missing",
    "label.ppNotStored": "PP not stored locally",
    "label.openMap": "Open map",
    "label.openScore": "Open score",
    "label.ppSourceCalculated": "PP calculated",
    "label.ppSourceMatched": "PP matched",
    "label.ppSourceHuis": "PP huis",
    "label.ppSourceApi": "PP from API",
    "label.ppSourceCache": "PP cache",
    "label.ppSourceOnline": "PP online",
    "label.ppSourceUnranked": "no ranked PP",
    "label.noOnlineId": "no online ID",
    "label.apiWithoutPp": "API without PP",
    "label.unrankedMod": "unranked mod",
    "label.unrankedRelax": "RX is unranked",
    "label.unrankedCustomRate": "custom rate is unranked",
    "label.combo": "Combo",
    "label.miss": "Miss",
    "label.score": "Score",
    "label.accuracy": "Accuracy",
    "label.new": "new",
    "label.noPreviousTry": "no previous stored try",
    "label.from": "From",
    "label.to": "To",
    "label.calendarDays": "Play days",
    "label.calendarScores": "Scores on this day",
    "label.calendarBestPp": "Best PP",
    "label.calendarAverageAcc": "Average acc",
    "label.calendarMisses": "Misses",
    "label.calendarMonthScores": "Scores this month",
    "label.calendarPpFilter": "Calendar PP range",
    "label.calendarMinPp": "Min PP",
    "label.calendarMaxPp": "Max PP",
    "label.passesTitle": "Passes by stars",
    "label.passStarFilter": "Star range",
    "label.minStars": "Min stars",
    "label.maxStars": "Max stars",
    "label.totalPasses": "total passes",
    "label.shownPasses": "shown maps",
    "label.bestPassPp": "Best PP",
    "label.highestStars": "Highest stars",
    "label.averageStars": "Average stars",
    "label.playedDay": "played",
    "label.monthTopPlay": "Top play of the month",
    "label.noScoresDay": "no scores",
    "label.mapDetails": "Map details",
    "label.historyChart": "Improvement history",
    "label.timeAxis": "Time",
    "label.metricPp": "PP",
    "label.metricAcc": "Acc",
    "label.metricMisses": "Misses",
    "label.tries": "tries",
    "label.bestPp": "Best PP",
    "label.bestScore": "Best score",
    "label.latestTry": "Latest try",
    "empty.noPasses": "No stored passes for {mods} on {ranked}. Search again later so the local database can grow, or loosen the filters.",
    "empty.noImprovements.lastTry": "No stored comparisons since the last try for these filters.",
    "empty.noImprovements.lastHour": "No stored comparisons in the last hour for these filters.",
    "empty.noImprovements.today": "No stored comparisons today for these filters.",
    "empty.noCalendar": "No stored play days for these filters yet.",
    "empty.noDayScores": "No scores are stored for these filters on this day.",
    "empty.noMapDetails": "No other tries for this difficulty were found in the current search.",
    "empty.noStarPasses": "No passes found in this star range.",
    "empty.passSearchFirst": "Set the star range, then start a search.",
    "loading.search": "Loading passes and storing them in the local database.",
    "loading.ppProgress": "Recalculating PP: {done} of {total}",
    "loading.ppStarting": "Preparing PP recalculation...",
    "loading.calendarPp": "Recalculating this calendar month...",
    "error.searchFailed": "Search failed.",
  },
};

function readStoredLanguage() {
  try {
    const stored = localStorage.getItem(languageStorageKey);
    return stored === "en" || stored === "de" ? stored : "en";
  } catch {
    return "en";
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

function formatStars(value) {
  return Number(value || 0) > 0 ? `${Number(value).toFixed(2)}*` : "-";
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

function formatDateTick(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat(locale(), {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    timeZone: "Europe/Berlin",
  }).format(date);
}

function formatDayKey(value) {
  if (!value) return "-";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale(), {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(date);
}

function formatDuration(value) {
  const totalSeconds = Math.max(0, Math.ceil(Number(value || 0)));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (!minutes) return `${seconds} s`;
  if (!seconds) return `${minutes} min`;
  return `${minutes} min ${seconds} s`;
}

function formatMonthKey(value) {
  if (!value) return "-";
  const date = new Date(`${value}-15T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(locale(), {
    year: "numeric",
    month: "long",
  }).format(date);
}

function dateToDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dayToMonthKey(dayKey) {
  return String(dayKey || "").slice(0, 7);
}

function addMonths(monthKey, offset) {
  const [year, month] = String(monthKey).split("-").map(Number);
  const date = new Date(year || new Date().getFullYear(), (month || 1) - 1 + offset, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function todayDayKey() {
  return dateToDayKey(new Date());
}

function monthSortValue(monthKey) {
  const [year, month] = String(monthKey || "").split("-").map(Number);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) return null;
  return year * 12 + month - 1;
}

function compareMonthKeys(left, right) {
  const leftValue = monthSortValue(left);
  const rightValue = monthSortValue(right);
  if (leftValue === null && rightValue === null) return 0;
  if (leftValue === null) return -1;
  if (rightValue === null) return 1;
  return leftValue - rightValue;
}

function clampMonthKey(monthKey, minMonth, maxMonth) {
  if (monthSortValue(monthKey) === null) return minMonth || maxMonth || dayToMonthKey(todayDayKey());
  if (minMonth && compareMonthKeys(monthKey, minMonth) < 0) return minMonth;
  if (maxMonth && compareMonthKeys(monthKey, maxMonth) > 0) return maxMonth;
  return monthKey;
}

function calendarMonthBounds(data) {
  const todayMonth = dayToMonthKey(todayDayKey());
  const monthKeys = (data?.calendar?.days || [])
    .map((day) => dayToMonthKey(day.date))
    .filter((monthKey) => monthSortValue(monthKey) !== null);
  const sortedMonths = [...new Set(monthKeys)].sort(compareMonthKeys);
  const minMonth = sortedMonths[0] || todayMonth;
  const maxDataMonth = sortedMonths[sortedMonths.length - 1] || todayMonth;
  const maxMonth = compareMonthKeys(maxDataMonth, todayMonth) > 0 ? maxDataMonth : todayMonth;

  return compareMonthKeys(minMonth, maxMonth) > 0
    ? { minMonth: maxMonth, maxMonth, todayMonth }
    : { minMonth, maxMonth, todayMonth };
}

function firstScoreDayInMonth(scoresByDay, monthKey) {
  return Object.keys(scoresByDay)
    .filter((dayKey) => dayKey.startsWith(monthKey))
    .sort()[0] || "";
}

function weekdayLabels() {
  const base = new Date(2026, 0, 5);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(base);
    date.setDate(base.getDate() + index);
    return new Intl.DateTimeFormat(locale(), { weekday: "short" }).format(date);
  });
}

function secondsToTime(totalSeconds) {
  if (!Number.isFinite(Number(totalSeconds))) return "-";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.trunc(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function scoreDomKey(score) {
  return String(score.storage_key || score.id || score.legacy_score_id || `${score.beatmap_id}-${score.ended_at || score.created_at}-${score.score}`);
}

function scorePpValue(score) {
  if (unrankedScoreReason(score)) return 0;
  if (score.pp_source === "osu-api" || score.pp_source === "huismetbenen-live") {
    const onlineValue = Number(score.pp || 0);
    return Number.isFinite(onlineValue) ? onlineValue : 0;
  }
  const value = Number(score.calculated_pp || score.pp || 0);
  return Number.isFinite(value) ? value : 0;
}

function scoreAttemptMinute(score) {
  const time = Date.parse(score?.ended_at || score?.created_at || "") || 0;
  return time ? Math.floor(time / 60000) : "";
}

function scoreAttemptPpKey(score) {
  return [
    mapDomKey(score),
    scoreAttemptMinute(score),
    accuracyPercentValue(score).toFixed(4),
    Number(score?.max_combo || 0),
    Number(missCount(score) || 0),
  ].join("|");
}

function enrichScoresWithMatchedPp(scores) {
  return scores;
}

function enrichScoreFromMatches(score, matchedScores) {
  return score;
}

function accuracyPercentValue(score) {
  const value = Number(score.accuracy || 0);
  if (!Number.isFinite(value)) return 0;
  return value > 1 ? value : value * 100;
}

function mapDomKey(score) {
  const beatmap = score.beatmap || {};
  const set = score.beatmapset || {};
  return String(
    beatmap.checksum ||
      score.beatmap_id ||
      beatmap.id ||
      `${set.artist || ""}:${set.title || ""}:${beatmap.version || ""}`
  );
}

function allScoresFromData(data) {
  const scoresByDay = data?.calendar?.scoresByDay || {};
  return Object.values(scoresByDay).flat();
}

function allCalendarScores() {
  return allScoresFromData(lastSearchData);
}

function findScoreByDomKey(key) {
  return [...(lastSearchData?.scores || []), ...allCalendarScores()]
    .find((score) => scoreDomKey(score) === key);
}

function mapTriesForScore(score) {
  const mapKey = mapDomKey(score);
  return allCalendarScores()
    .filter((candidate) => mapDomKey(candidate) === mapKey)
    .sort((a, b) => {
      const timeA = Date.parse(a.ended_at || a.created_at || "") || 0;
      const timeB = Date.parse(b.ended_at || b.created_at || "") || 0;
      return timeA - timeB;
    });
}

function calendarPpBounds() {
  const min = calendarPpMin === "" ? null : Number(calendarPpMin);
  const max = calendarPpMax === "" ? null : Number(calendarPpMax);

  return {
    min: Number.isFinite(min) ? min : null,
    max: Number.isFinite(max) ? max : null,
  };
}

function scoreInCalendarPpRange(score) {
  const value = scorePpValue(score);
  const { min, max } = calendarPpBounds();
  if (min !== null && value < min) return false;
  if (max !== null && value > max) return false;
  return true;
}

function beatmapStarValue(score) {
  const value = effectiveBeatmapStats(score).stars;
  return Number.isFinite(value) ? value : 0;
}

function passStarBounds() {
  const min = passStarMin === "" ? null : Number(passStarMin);
  const max = passStarMax === "" ? null : Number(passStarMax);
  const parsedMin = Number.isFinite(min) ? min : null;
  const parsedMax = Number.isFinite(max) ? max : null;

  if (parsedMin !== null && parsedMax !== null && parsedMin > parsedMax) {
    return { min: parsedMax, max: parsedMin };
  }

  return { min: parsedMin, max: parsedMax };
}

function scoreInPassStarRange(score) {
  const stars = beatmapStarValue(score);
  const { min, max } = passStarBounds();
  if (stars <= 0) return false;
  if (min !== null && stars < min) return false;
  if (max !== null && stars > max) return false;
  return true;
}

function scoreTimeValue(score) {
  return Date.parse(score?.ended_at || score?.created_at || "") || 0;
}

function sortScoresForDisplay(scores, sort = "date") {
  return [...scores].sort((a, b) => {
    if (sort === "acc") return Number(b.accuracy || 0) - Number(a.accuracy || 0);
    if (sort === "score") return Number(b.score || 0) - Number(a.score || 0);
    if (sort === "pp") return scorePpValue(b) - scorePpValue(a) || scoreTimeValue(b) - scoreTimeValue(a);
    return scoreTimeValue(b) - scoreTimeValue(a);
  });
}

function uniqueScores(scores) {
  const seen = new Set();
  return scores.filter((score) => {
    const key = scoreDomKey(score);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function bestModeMetrics(bestMode = "score") {
  if (bestMode === "pp") {
    return [scorePpValue, accuracyPercentValue, (score) => Number(score.score || 0), (score) => -missCount(score)];
  }

  if (bestMode === "acc") {
    return [accuracyPercentValue, (score) => -missCount(score), (score) => Number(score.score || 0), scorePpValue];
  }

  if (bestMode === "date") {
    return [scoreTimeValue, (score) => Number(score.score || 0), accuracyPercentValue, scorePpValue];
  }

  return [(score) => Number(score.score || 0), accuracyPercentValue, (score) => -missCount(score), scorePpValue];
}

function isBetterScoreForMode(next, current, bestMode = "score") {
  if (!current) return true;

  for (const metric of bestModeMetrics(bestMode)) {
    const nextValue = Number(metric(next) || 0);
    const currentValue = Number(metric(current) || 0);
    if (nextValue !== currentValue) return nextValue > currentValue;
  }

  return scoreTimeValue(next) > scoreTimeValue(current);
}

function bestScorePerMapForDisplay(scores, bestMode = "score") {
  const best = new Map();

  for (const score of scores) {
    const key = mapDomKey(score);
    if (isBetterScoreForMode(score, best.get(key), bestMode)) best.set(key, score);
  }

  return [...best.values()];
}

function filteredCalendarScoresByDay(data) {
  const scoresByDay = data.calendar?.scoresByDay || {};
  const filtered = {};

  for (const [dayKey, scores] of Object.entries(scoresByDay)) {
    const dayScores = enrichScoresWithMatchedPp(scores).filter(scoreInCalendarPpRange);
    if (dayScores.length) filtered[dayKey] = dayScores;
  }

  return filtered;
}

function calendarDaysFromScoresByDay(scoresByDay, sort = "date") {
  return Object.entries(scoresByDay)
    .map(([date, scores]) => {
      const totalAccuracy = scores.reduce((total, score) => total + Number(score.accuracy || 0), 0);
      const latestTime = scores.reduce((latest, score) => Math.max(latest, Date.parse(score.ended_at || score.created_at || "") || 0), 0);
      const sortedScores = [...scores].sort((a, b) => {
        if (sort === "pp") return scorePpValue(b) - scorePpValue(a);
        if (sort === "acc") return Number(b.accuracy || 0) - Number(a.accuracy || 0);
        if (sort === "score") return Number(b.score || 0) - Number(a.score || 0);
        return (Date.parse(b.ended_at || b.created_at || "") || 0) - (Date.parse(a.ended_at || a.created_at || "") || 0);
      });

      return {
        date,
        count: scores.length,
        best_pp: scores.reduce((best, score) => Math.max(best, scorePpValue(score)), 0),
        best_score: scores.reduce((best, score) => Math.max(best, Number(score.score || 0)), 0),
        average_accuracy: scores.length ? totalAccuracy / scores.length : 0,
        total_misses: scores.reduce((total, score) => total + missCount(score), 0),
        latest_time: latestTime,
        scores: sortedScores,
      };
    })
    .sort((a, b) => b.latest_time - a.latest_time);
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

function modSettingNumber(mod, keys) {
  const settings = mod?.settings || {};
  for (const key of keys) {
    const value = Number(settings[key] ?? mod?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function speedMultiplierForMod(mod) {
  const acronym = String(mod?.acronym || mod || "").toUpperCase();
  if (!clockRateModAcronyms.has(acronym)) return null;

  const customSpeed = modSettingNumber(mod, customRateKeys);

  if (customSpeed !== null) return customSpeed;
  return clockRateDefaultByMod.get(acronym) || null;
}

function isCustomClockRateMod(mod) {
  const acronym = String(mod?.acronym || mod || "").toUpperCase();
  if (!clockRateModAcronyms.has(acronym)) return false;

  const customSpeed = modSettingNumber(mod, customRateKeys);
  if (customSpeed === null) return false;
  if (acronym === "RA") return true;
  return Math.abs(customSpeed - clockRateDefaultByMod.get(acronym)) > 0.001;
}

function unrankedScoreReason(score) {
  if (score?.score_unranked_reason) return score.score_unranked_reason;

  for (const mod of score?.normalized_mods || score?.mods || []) {
    const acronym = String(mod?.acronym || mod || "").toUpperCase();
    if (mod?.ranked === false) return "unranked_mod";
    if (unrankedGameplayMods.has(acronym)) return acronym === "RX" ? "relax" : "unranked_mod";
    if (acronym === "RA" || isCustomClockRateMod(mod)) return "custom_rate";
  }

  return "";
}

function unrankedReasonLabel(reason) {
  if (reason === "relax") return t("label.unrankedRelax");
  if (reason === "custom_rate") return t("label.unrankedCustomRate");
  return t("label.unrankedMod");
}

function scoreClockRate(score) {
  for (const mod of score?.normalized_mods || score?.mods || []) {
    const speed = speedMultiplierForMod(mod);
    if (speed) return speed;
  }

  const explicit = Number(score?.beatmap?.effective_clock_rate || 0);
  return Number.isFinite(explicit) && explicit > 0 ? explicit : 1;
}

function effectiveBeatmapStats(score) {
  const beatmap = score?.beatmap || {};
  const rate = scoreClockRate(score);
  const baseStars = Number(
    beatmap.effective_difficulty_rating ||
      beatmap.calculated_difficulty_rating ||
      beatmap.difficulty_rating ||
      beatmap.star_rating ||
      beatmap.stars ||
      0
  );
  const effectiveBpm = Number(beatmap.effective_bpm || 0);
  const baseBpm = Number(beatmap.bpm || 0);
  const effectiveLength = Number(beatmap.effective_total_length || 0);
  const baseLength = Number(beatmap.total_length || beatmap.hit_length || 0);

  return {
    stars: Number.isFinite(baseStars) ? baseStars : 0,
    bpm: Number.isFinite(effectiveBpm) && effectiveBpm > 0
      ? effectiveBpm
      : Number.isFinite(baseBpm) && baseBpm > 0
        ? baseBpm * rate
        : 0,
    length: Number.isFinite(effectiveLength) && effectiveLength > 0
      ? effectiveLength
      : Number.isFinite(baseLength) && baseLength > 0
        ? Math.round(baseLength / rate)
        : 0,
  };
}

function scoreStatusLabel(score) {
  const reason = unrankedScoreReason(score);
  if (reason) return t("label.unrankedMod");
  return score?.beatmap?.status || "unknown";
}

function formatMultiplier(value) {
  if (!Number.isFinite(Number(value))) return "";
  return `${Number(value).toFixed(3).replace(/\.?0+$/, "")}x`;
}

function modDisplayLabel(mod) {
  const acronym = String(mod?.acronym || mod || "").toUpperCase();
  const speed = speedMultiplierForMod(mod);
  return speed ? `${acronym} ${formatMultiplier(speed)}` : acronym;
}

function modDisplayTitle(mod) {
  const acronym = String(mod?.acronym || mod || "").toUpperCase();
  const speed = speedMultiplierForMod(mod);
  const name = modNames[acronym] || acronym;
  return speed ? `${name} (${formatMultiplier(speed)})` : name;
}

function renderMods(score) {
  const mods = score.normalized_mods || [];
  if (mods.length === 0) {
    return '<span class="mod-badge" title="No Mod">NM</span>';
  }

  return mods
    .map((mod) => {
      const label = escapeHtml(modDisplayLabel(mod));
      const title = escapeHtml(modDisplayTitle(mod));
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
  const reason = unrankedScoreReason(score);
  if (reason) return unrankedReasonLabel(reason);
  if (score.pp_source === "rosu-current") return t("label.ppSourceCalculated");
  if (score.pp_source === "matched-local") return t("label.ppSourceMatched");
  if (score.pp_source === "huismetbenen-live") return t("label.ppSourceHuis");
  if (score.pp_source === "osu-api") return t("label.ppSourceApi");
  if (score.pp_source === "cache") return t("label.ppSourceCache");
  if (score.calculated_pp) return t("label.ppSourceCalculated");
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
  if (latestStartupSync) renderStartupSync(latestStartupSync);
  if (rerender && lastSearchData) renderSearchData(lastSearchData);
  if (!lastSearchData) renderPasses();
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

function startupSyncLine(data) {
  if (data.stage === "online") {
    return t("sync.online", {
      done: formatNumber(data.apiPagesDone || 0),
      total: formatNumber(data.apiPagesTotal || 0),
    });
  }
  if (data.stage === "rate_limited") {
    return t("sync.rateLimited", { seconds: formatNumber(data.etaSeconds || 0) });
  }
  if (data.stage === "local") return t("sync.local");
  if (data.stage === "pp") {
    return t("sync.pp", {
      done: formatNumber(data.ppDone || 0),
      total: formatNumber(data.ppTotal || 0),
    });
  }
  if (data.status === "done") return t("sync.done");
  if (data.status === "idle") return t("sync.idle");
  if (data.status === "disabled") return t("sync.disabled");
  if (data.status === "error") return t("sync.error");
  return t("sync.scheduled");
}

function renderStartupSync(data = {}) {
  if (!startupSync) return;
  latestStartupSync = data;
  const percent = Math.min(100, Math.max(0, Number(data.percent || 0)));
  const player = data.username
    ? `<span>${escapeHtml(data.username)} · ${escapeHtml(data.mode || "osu")}</span>`
    : "";
  const eta = Number.isFinite(Number(data.etaSeconds)) && Number(data.etaSeconds) > 0
    ? `<span>${escapeHtml(t("sync.eta", { time: formatDuration(data.etaSeconds) }))}</span>`
    : "";
  const warning = data.warning
    ? `<p class="startup-sync-warning">${escapeHtml(data.warning)}</p>`
    : data.error
      ? `<p class="startup-sync-warning">${escapeHtml(data.error)}</p>`
      : "";

  startupSync.classList.remove("hidden");
  startupSync.innerHTML = `
    <div class="startup-sync-head">
      <div>
        <strong>${escapeHtml(t("sync.title"))}</strong>
        ${player}
      </div>
      <span>${escapeHtml(startupSyncLine(data))}</span>
    </div>
    <div class="pp-progress-bar" aria-hidden="true"><i style="width: ${percent}%"></i></div>
    <div class="pp-progress-meta">
      <span>${escapeHtml(t("sync.newScores", { count: formatNumber(data.newScores || 0) }))}</span>
      <span>${escapeHtml(t("sync.onlineScores", { count: formatNumber(data.onlineScoresSeen || 0) }))}</span>
      <span>${escapeHtml(t("sync.localScores", { count: formatNumber(data.localScoresSeen || 0) }))}</span>
      <span>${escapeHtml(t("sync.ppFilled", { count: formatNumber(data.ppFilled || 0) }))}</span>
      ${eta}
      ${Number(data.queueLength || 0) > 0
        ? `<span>${escapeHtml(t("sync.queue", { count: formatNumber(data.queueLength) }))}</span>`
        : ""}
    </div>
    ${warning}
  `;
}

async function pollStartupSync() {
  try {
    const response = await fetch("/api/startup-sync");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Sync status failed");
    renderStartupSync(data);
    if (["done", "idle", "disabled", "error"].includes(data.status) && startupSyncTimer) {
      clearInterval(startupSyncTimer);
      startupSyncTimer = null;
    }
  } catch {
    if (startupSyncTimer) clearInterval(startupSyncTimer);
    startupSyncTimer = null;
  }
}

function startStartupSyncPolling() {
  void pollStartupSync();
  if (startupSyncTimer) clearInterval(startupSyncTimer);
  startupSyncTimer = setInterval(pollStartupSync, 1_000);
}

function setUpdateStatus(key, className = "", title = "") {
  if (!updateStatus) return;
  updateStatus.className = `status-pill update-pill ${className}`.trim();
  updateStatus.textContent = t(key);
  updateStatus.title = title;
}

function formatUpdateChanges(changes = []) {
  return changes
    .map((change) => String(change?.message || "").trim())
    .filter(Boolean)
    .slice(0, 5)
    .map((message) => `- ${message}`)
    .join("\n");
}

async function checkForUpdates() {
  if (!updateStatus) return;
  setUpdateStatus("update.checking", "checking");

  try {
    const response = await fetch("/api/update-check");
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || t("update.error"));

    latestUpdateInfo = data;
    if (data.updateAvailable) {
      const changes = formatUpdateChanges(data.changes);
      const title = [
        `${data.currentVersion || "-"} -> ${data.latestVersion || "-"}`,
        changes ? t("update.changes", { changes }) : "",
      ]
        .filter(Boolean)
        .join("\n");
      setUpdateStatus("update.available", "available", title);
    } else {
      setUpdateStatus("update.current", "ready", data.repo || "");
    }
  } catch (error) {
    latestUpdateInfo = null;
    setUpdateStatus("update.error", "missing", error.message || t("update.error"));
  }
}

async function startUpdate() {
  if (!updateStatus) return;
  if (!latestUpdateInfo) {
    await checkForUpdates();
  }

  if (!latestUpdateInfo?.updateAvailable) {
    updateStatus.title = t("update.none");
    return;
  }

  const confirmed = window.confirm(
    t("update.confirm", {
      current: latestUpdateInfo.currentVersion || "-",
      latest: latestUpdateInfo.latestVersion || "-",
      changes: formatUpdateChanges(latestUpdateInfo.changes)
        ? t("update.changes", { changes: formatUpdateChanges(latestUpdateInfo.changes) })
        : "",
    }),
  );
  if (!confirmed) return;

  setUpdateStatus("update.installing", "checking");

  try {
    const response = await fetch("/api/update-start", { method: "POST" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || t("update.error"));
    setUpdateStatus("update.started", "available", data.logPath || "");
  } catch (error) {
    setUpdateStatus("update.error", "missing", error.message || t("update.error"));
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

function buildLiveScanParams() {
  const params = new URLSearchParams();
  params.set("username", document.querySelector("#username").value.trim());
  params.set("mode", document.querySelector("#mode").value);
  return params;
}

function makeJobId(prefix = "pp") {
  const random = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${String(random).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64)}`;
}

function renderPpProgress(progress = {}, context = "search") {
  const total = Number(progress.total || 0);
  const done = Number(progress.attempted || 0);
  const filled = Number(progress.filled || 0);
  const percent = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const title = context === "calendar" ? t("loading.calendarPp") : t("label.ppStatus");
  const line = total > 0
    ? t("loading.ppProgress", { done: formatNumber(done), total: formatNumber(total) })
    : t("loading.ppStarting");
  const backfill = progress.backfill_until
    ? `<span>${escapeHtml(t("label.ppBackfillUntil"))}: ${escapeHtml(formatDayKey(progress.backfill_until))}</span>`
    : "";

  summary.classList.remove("hidden");
  summary.innerHTML = `
    <div class="pp-progress-card">
      <div>
        <strong>${escapeHtml(title)}</strong>
        <span>${escapeHtml(line)} - ${formatNumber(filled)} ${escapeHtml(t("label.ppCalculated"))}</span>
      </div>
      <div class="pp-progress-bar" aria-hidden="true"><i style="width: ${percent}%"></i></div>
      <div class="pp-progress-meta">
        <span>${formatNumber(done)} ${escapeHtml(t("label.ppAttempted"))}</span>
        ${backfill}
      </div>
    </div>
  `;
}

function stopPpProgressPolling() {
  if (ppProgressTimer) clearInterval(ppProgressTimer);
  ppProgressTimer = null;
  activePpProgressJob = "";
}

function startPpProgressPolling(jobId, context = "search") {
  stopPpProgressPolling();
  activePpProgressJob = jobId;
  renderPpProgress({ total: 0, attempted: 0, filled: 0 }, context);
  ppProgressTimer = setInterval(async () => {
    try {
      const response = await fetch(`/api/pp-progress?id=${encodeURIComponent(jobId)}`);
      const progress = await response.json();
      if (activePpProgressJob !== jobId) return;
      renderPpProgress(progress, context);
      if (progress.status === "done") stopPpProgressPolling();
    } catch {
      stopPpProgressPolling();
    }
  }, 450);
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
  const profileUrl = data.user.url && !String(data.user.id).startsWith("local:")
    ? data.user.url
    : "";
  const avatar = data.user.avatar_url
    ? `<img src="${escapeHtml(data.user.avatar_url)}" alt="" />`
    : '<div class="avatar-fallback"></div>';
  const usernameHtml = profileUrl
    ? `<a href="${escapeHtml(profileUrl)}" target="_blank" rel="noreferrer">${escapeHtml(data.user.username)}</a>`
    : escapeHtml(data.user.username);
  const ppBackfill = data.meta.ppBackfillUntil
    ? ` - ${t("label.ppBackfillUntil")} ${formatDayKey(data.meta.ppBackfillUntil)}`
    : "";
  const ppEngine = data.meta.ppEngine?.installedVersion
    ? ` - ${t("label.ppEngine")} ${data.meta.ppEngine.name || "rosu-pp-js"} ${data.meta.ppEngine.installedVersion}${
        data.meta.ppEngine.outdated && data.meta.ppEngine.latestVersion
          ? ` (${t("label.ppEngineOutdated")} ${data.meta.ppEngine.latestVersion})`
          : ""
      }`
    : "";

  summary.classList.remove("hidden");
  summary.innerHTML = `
    <div class="user-card">
      ${avatar}
      <div>
        <h2>${usernameHtml}</h2>
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
      ${formatNumber(data.meta.ppCalculationAttempted || 0)} ${t("label.ppAttempted")} -
      ${formatNumber(data.meta.ppDisplayedQueued || 0)} ${t("label.ppVisibleReady")}${ppBackfill}${ppEngine} -
      ${data.meta.bestPerMap ? `${t("label.bestPerMap")} (${data.meta.bestMode || "score"})` : t("label.multiplePerMap")} -
      ${data.meta.selectedMods.length ? data.meta.selectedMods.join("+") : t("label.allMods")}
    </div>
  `;
}

function renderScore(score, mode) {
  const beatmap = score.beatmap || {};
  const set = score.beatmapset || {};
  const mapStats = effectiveBeatmapStats(score);
  const artist = set.artist || beatmap.artist || t("label.unknownArtist");
  const title = set.title || beatmap.title || t("label.unknownMap");
  const version = beatmap.version || "Difficulty";
  const star = mapStats.stars ? `${Number(mapStats.stars).toFixed(2)}*` : "-";
  const bpm = mapStats.bpm ? `${Math.round(mapStats.bpm)} BPM` : "-";
  const length = secondsToTime(mapStats.length);
  const status = scoreStatusLabel(score);
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
  const ppTitle = unrankedScoreReason(score)
    ? ppLabel
    : scorePpValue(score) > 0
      ? ppLabel
      : t("label.ppNotStored");
  const ppRank = score.pp_rank ? `<span class="pp-rank-badge">#${formatNumber(score.pp_rank)}</span>` : "";
  const detailKey = scoreDomKey(score);

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
          <button class="detail-button" type="button" data-score-key="${escapeHtml(detailKey)}">${escapeHtml(t("button.details"))}</button>
        </div>
      </div>
      <div class="score-side">
        <div class="pp" title="${escapeHtml(ppTitle)}">${formatPp(scorePpValue(score))}</div>
        <div class="acc">${formatAccuracy(score.accuracy)}</div>
        <div class="small">${t("label.accuracy")}</div>
      </div>
    </article>
  `;
}

function renderPassStat(label, value) {
  return `
    <div class="pass-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderPasses(data = null) {
  const hasData = Boolean(data);
  const allScores = hasData ? uniqueScores(allScoresFromData(data)) : [];
  const matchingScores = allScores.filter(scoreInPassStarRange);
  const bestMode = data?.meta?.bestMode || document.querySelector("#bestMode")?.value || "score";
  const bestMapScores = bestScorePerMapForDisplay(matchingScores, bestMode);
  const sortedScores = sortScoresForDisplay(bestMapScores, data?.meta?.sort || document.querySelector("#sort")?.value || "date");
  const limit = Math.max(1, Number(data?.meta?.limit || document.querySelector("#limit")?.value || 100));
  const ppRankByScore = new Map(
    [...bestMapScores]
      .filter((score) => scorePpValue(score) > 0)
      .sort((a, b) => scorePpValue(b) - scorePpValue(a) || scoreTimeValue(b) - scoreTimeValue(a))
      .map((score, index) => [scoreDomKey(score), index + 1])
  );
  const displayScores = sortedScores
    .slice(0, limit)
    .map((score) => ({
      ...score,
      pp_rank: ppRankByScore.get(scoreDomKey(score)) || null,
    }));
  const starValues = matchingScores.map(beatmapStarValue).filter((value) => value > 0);
  const bestPp = matchingScores.reduce((best, score) => Math.max(best, scorePpValue(score)), 0);
  const highestStars = starValues.length ? Math.max(...starValues) : 0;
  const averageStars = starValues.length
    ? starValues.reduce((total, value) => total + value, 0) / starValues.length
    : 0;
  const { min, max } = passStarBounds();
  const rangeLabel = `${min === null ? "0" : min.toFixed(2)} - ${max === null ? "max" : max.toFixed(2)}*`;

  passes.innerHTML = `
    <div class="passes-panel">
      <div class="passes-filter">
        <strong>${escapeHtml(t("label.passStarFilter"))}</strong>
        <label>
          <span>${escapeHtml(t("label.minStars"))}</span>
          <input type="number" min="0" step="0.01" inputmode="decimal" data-pass-star-min value="${escapeHtml(passStarMin)}" placeholder="6.54" />
        </label>
        <label>
          <span>${escapeHtml(t("label.maxStars"))}</span>
          <input type="number" min="0" step="0.01" inputmode="decimal" data-pass-star-max value="${escapeHtml(passStarMax)}" placeholder="7.00" />
        </label>
        <button class="ghost-button" type="button" data-pass-filter="apply">${escapeHtml(t("button.apply"))}</button>
        <button class="ghost-button" type="button" data-pass-filter="reset">${escapeHtml(t("button.reset"))}</button>
      </div>
      <div class="passes-head">
        <div>
          <span>${escapeHtml(t("label.passesTitle"))}</span>
          <strong>${escapeHtml(rangeLabel)}</strong>
        </div>
      </div>
      <div class="passes-summary">
        ${renderPassStat(t("label.totalPasses"), formatNumber(matchingScores.length))}
        ${renderPassStat(t("label.shownPasses"), `${formatNumber(displayScores.length)} / ${formatNumber(bestMapScores.length)}`)}
        ${renderPassStat(t("label.bestPassPp"), formatPp(bestPp))}
        ${renderPassStat(t("label.highestStars"), formatStars(highestStars))}
        ${renderPassStat(t("label.averageStars"), formatStars(averageStars))}
      </div>
    </div>
    ${
      !hasData
        ? `<div class="empty-state">${escapeHtml(t("empty.passSearchFirst"))}</div>`
        : displayScores.length
        ? displayScores.map((score) => renderScore(score, data.meta.mode)).join("")
        : `<div class="empty-state">${escapeHtml(t("empty.noStarPasses"))}</div>`
    }
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
      <strong>${formatPp(scorePpValue(score))} - ${formatAccuracy(score.accuracy)}</strong>
      <small>${formatNumber(score.score)} ${t("label.score")} - ${formatNumber(score.max_combo)}x - ${missCount(score)} ${t("label.miss")}</small>
      <small>${formatDate(score.ended_at || score.created_at)}</small>
    </div>
  `;
}

function renderTryHistoryChart(tries, options = {}) {
  const compact = Boolean(options.compact);
  const ordered = [...tries]
    .sort((a, b) => {
      const timeA = Date.parse(a.ended_at || a.created_at || "") || 0;
      const timeB = Date.parse(b.ended_at || b.created_at || "") || 0;
      return timeA - timeB;
    })
    .map((score, index) => {
      const rawTime = Date.parse(score.ended_at || score.created_at || "") || 0;
      return {
        score,
        index,
        time: rawTime || index,
        pp: scorePpValue(score) || null,
        acc: accuracyPercentValue(score),
        misses: Number(missCount(score) || 0),
      };
    });

  if (!ordered.length) return "";

  const pointGap = compact ? 108 : 118;
  const width = Math.max(900, 68 + 40 + Math.max(ordered.length - 1, 1) * pointGap);
  const height = compact ? 300 : 350;
  const left = 68;
  const right = 40;
  const top = 18;
  const bottom = compact ? 112 : 126;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const xFor = (point) => {
    if (ordered.length === 1) return left + plotWidth / 2;
    return left + (point.index / (ordered.length - 1)) * plotWidth;
  };
  const metricValue = (metric, point) => point[metric.key];
  const metrics = [
    {
      key: "pp",
      label: t("label.metricPp"),
      color: "#ff66aa",
      format: (value) => (value ? `${value.toFixed(2)}pp` : t("label.ppMissing")),
      hasValue: (value) => value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value) > 0,
    },
    {
      key: "acc",
      label: t("label.metricAcc"),
      color: "#91e36a",
      format: (value) => `${value.toFixed(2)}%`,
      hasValue: (value) => value !== null && value !== undefined && Number.isFinite(Number(value)),
    },
    {
      key: "misses",
      label: t("label.metricMisses"),
      color: "#ffd166",
      lowerBetter: true,
      format: (value) => `${formatNumber(value)} ${t("label.miss")}`,
      hasValue: (value) => value !== null && value !== undefined && Number.isFinite(Number(value)),
    },
  ].map((metric) => {
    const values = ordered.map((point) => metricValue(metric, point)).filter((value) => metric.hasValue(value));
    return {
      ...metric,
      available: values.length > 0,
      min: values.length ? Math.min(...values) : 0,
      max: values.length ? Math.max(...values) : 0,
    };
  });
  const yFor = (metric, point) => {
    const value = metricValue(metric, point);
    if (!metric.hasValue(value)) return null;
    if (metric.max === metric.min) return top + plotHeight / 2;
    let ratio = (value - metric.min) / (metric.max - metric.min);
    if (metric.lowerBetter) ratio = 1 - ratio;
    return top + (1 - ratio) * plotHeight;
  };
  const formatCoord = (value) => Number(value).toFixed(2);
  const bestPpPoint = ordered.reduce((best, point) => (point.pp > best.pp ? point : best), ordered[0]);
  const bestPpX = xFor(bestPpPoint);
  const bestPpLabelOnLeft = bestPpX > width - right - 126;
  const bestPpLabelX = bestPpLabelOnLeft ? bestPpX - 8 : bestPpX + 8;
  const bestPpLabelAnchor = bestPpLabelOnLeft ? "end" : "start";
  const bestPpLine = bestPpPoint.pp > 0
    ? `
      <g class="chart-best-reference">
        <line class="chart-best-line" x1="${formatCoord(bestPpX)}" y1="${top}" x2="${formatCoord(bestPpX)}" y2="${height - bottom}"></line>
        <text class="chart-best-label" x="${formatCoord(bestPpLabelX)}" y="${top + 16}" text-anchor="${bestPpLabelAnchor}">#1 ${escapeHtml(metrics[0].format(bestPpPoint.pp))}</text>
      </g>
    `
    : "";
  const gridRows = [0, 0.25, 0.5, 0.75, 1]
    .map((step) => {
      const y = top + plotHeight * step;
      return `<line class="chart-grid-line" x1="${left}" y1="${formatCoord(y)}" x2="${width - right}" y2="${formatCoord(y)}"></line>`;
    })
    .join("");
  const series = metrics
    .map((metric) => {
      if (!metric.available) return "";
      const visiblePoints = ordered.filter((point) => metric.hasValue(metricValue(metric, point)));
      const points = visiblePoints
        .map((point) => `${formatCoord(xFor(point))},${formatCoord(yFor(metric, point))}`)
        .join(" ");
      const line = visiblePoints.length > 1
        ? `<polyline points="${points}" fill="none" stroke="${metric.color}" stroke-width="${compact ? 2.8 : 3.4}" stroke-linecap="round" stroke-linejoin="round"></polyline>`
        : "";
      const circles = visiblePoints
        .map((point) => {
          const tooltip = [
            formatDate(point.score.ended_at || point.score.created_at),
            `${metric.label}: ${metric.format(metricValue(metric, point))}`,
            `${t("label.metricPp")}: ${metrics[0].format(point.pp)}`,
            `${t("label.metricAcc")}: ${metrics[1].format(point.acc)}`,
            `${t("label.metricMisses")}: ${metrics[2].format(point.misses)}`,
          ].join(" | ");
          return `
            <circle cx="${formatCoord(xFor(point))}" cy="${formatCoord(yFor(metric, point))}" r="${compact ? 3 : 3.8}" fill="${metric.color}">
              <title>${escapeHtml(tooltip)}</title>
            </circle>
          `;
        })
        .join("");
      return `
        <g>
          ${line}
          ${circles}
        </g>
      `;
    })
    .join("");
  const ticks = ordered
    .map((point) => {
      const x = xFor(point);
      const labelY = height - (compact ? 28 : 34);
      const anchor = point.index === 0 ? "start" : point.index === ordered.length - 1 ? "end" : "end";
      return `
        <g>
          <line class="chart-tick" x1="${formatCoord(x)}" y1="${height - bottom}" x2="${formatCoord(x)}" y2="${height - bottom + 5}"></line>
          <text class="chart-axis-text" x="${formatCoord(x)}" y="${labelY}" text-anchor="${anchor}" transform="rotate(-38 ${formatCoord(x)} ${labelY})">${escapeHtml(formatDateTick(point.score.ended_at || point.score.created_at))}</text>
        </g>
      `;
    })
    .join("");
  const hitWidth = Math.max(34, Math.min(pointGap, plotWidth / Math.max(ordered.length, 1)));
  const hoverZones = ordered
    .map((point) => {
      const x = xFor(point);
      const tooltipWidth = compact ? 188 : 214;
      const tooltipHeight = 96;
      const tooltipX = Math.min(Math.max(x - tooltipWidth / 2, left + 6), width - right - tooltipWidth - 6);
      const tooltipY = top + 8;
      return `
        <g class="chart-hover-zone">
          <rect class="chart-hit" x="${formatCoord(x - hitWidth / 2)}" y="${top - 8}" width="${formatCoord(hitWidth)}" height="${plotHeight + bottom + 8}"></rect>
          <line class="chart-hover-line" x1="${formatCoord(x)}" y1="${top}" x2="${formatCoord(x)}" y2="${height - bottom}"></line>
          <g class="chart-tooltip" transform="translate(${formatCoord(tooltipX)} ${formatCoord(tooltipY)})">
            <rect width="${tooltipWidth}" height="${tooltipHeight}" rx="7"></rect>
            <text class="chart-tooltip-title" x="10" y="18">${escapeHtml(formatDate(point.score.ended_at || point.score.created_at))}</text>
            <text x="10" y="38" fill="${metrics[0].color}">${escapeHtml(`${metrics[0].label}: ${metrics[0].format(point.pp)}`)}</text>
            <text x="10" y="55" fill="${metrics[1].color}">${escapeHtml(`${metrics[1].label}: ${metrics[1].format(point.acc)}`)}</text>
            <text x="10" y="72" fill="${metrics[2].color}">${escapeHtml(`${metrics[2].label}: ${metrics[2].format(point.misses)}`)}</text>
            <text class="chart-tooltip-sub" x="10" y="89">${escapeHtml(`${formatNumber(point.score.score)} ${t("label.score")} - ${formatNumber(point.score.max_combo)}x ${t("label.combo")}`)}</text>
          </g>
        </g>
      `;
    })
    .join("");
  const latest = ordered[ordered.length - 1];
  const legend = metrics
    .map((metric) => `
      <span style="--chart-color: ${metric.color}">
        <i></i>${escapeHtml(metric.label)} <strong>${escapeHtml(metric.format(metricValue(metric, latest)))}</strong>
      </span>
    `)
    .join("");

  return `
    <div class="try-chart${compact ? " compact" : ""}">
      <div class="try-chart-head">
        <strong>${escapeHtml(t("label.historyChart"))}</strong>
        <div class="try-chart-legend">${legend}</div>
      </div>
      <div class="try-chart-plot">
        <svg viewBox="0 0 ${width} ${height}" style="width: ${width}px; min-width: 100%;" role="img" aria-label="${escapeHtml(t("label.historyChart"))}">
          <rect class="chart-bg" x="${left}" y="${top}" width="${plotWidth}" height="${plotHeight}" rx="8"></rect>
          ${gridRows}
          ${bestPpLine}
          <line class="chart-axis" x1="${left}" y1="${height - bottom}" x2="${width - right}" y2="${height - bottom}"></line>
          <text class="chart-axis-title" x="${left}" y="${height - bottom + 22}">${escapeHtml(t("label.timeAxis"))}</text>
          ${ticks}
          ${series}
          ${hoverZones}
        </svg>
      </div>
    </div>
  `;
}

function renderImprovement(item, mode) {
  const matchedTries = enrichScoresWithMatchedPp(mapTriesForScore(item.score));
  const score = enrichScoreFromMatches(item.score, matchedTries);
  const previous = enrichScoreFromMatches(item.previous, matchedTries);
  const beatmap = score.beatmap || {};
  const set = score.beatmapset || {};
  const artist = set.artist || beatmap.artist || t("label.unknownArtist");
  const title = set.title || beatmap.title || t("label.unknownMap");
  const version = beatmap.version || "Difficulty";
  const accDelta = signedAccuracy(item.acc_delta);
  const matchedPpDelta = previous ? scorePpValue(score) - scorePpValue(previous) : item.pp_delta;
  const ppDelta = signedPp(matchedPpDelta);
  const missDelta =
    item.miss_delta === null
      ? t("label.new")
      : item.miss_delta >= 0
        ? `-${formatNumber(item.miss_delta)} ${t("label.miss")}`
        : `+${formatNumber(Math.abs(item.miss_delta))} ${t("label.miss")}`;
  const scoreDelta = signedNumber(item.score_delta, ` ${t("label.score")}`);
  const comboDelta = signedNumber(item.combo_delta, "x");
  const linkText = scoreLinkLabel(score);
  const detailKey = scoreDomKey(score);
  const tries = matchedTries;

  return `
    <article class="improvement-card">
      <div>
        <div class="map-title">
          <span class="rank-badge">${escapeHtml(score.rank || "")}</span>
          <a href="${escapeHtml(scoreUrl(score, mode))}" target="_blank" rel="noreferrer">
            ${escapeHtml(artist)} - ${escapeHtml(title)}
          </a>
          <span class="source-chip">${escapeHtml(linkText)}</span>
          <button class="detail-button" type="button" data-score-key="${escapeHtml(detailKey)}">${escapeHtml(t("button.history"))}</button>
        </div>
        <div class="diff">[${escapeHtml(version)}]</div>
        <div class="mods">${renderMods(score)}</div>
        <div class="improvement-flow">
          ${scoreSnapshot(t("label.from"), previous)}
          ${scoreSnapshot(t("label.to"), score)}
        </div>
        ${renderTryHistoryChart(tries, { compact: true })}
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

function renderCalendarDayScores(data, dayKey, scoresByDay = filteredCalendarScoresByDay(data)) {
  const scores = enrichScoresWithMatchedPp(scoresByDay[dayKey] || []);
  if (!scores.length) {
    return `
      <div class="calendar-day-head">
        <div>
          <span>${escapeHtml(t("label.calendarScores"))}</span>
          <strong>${escapeHtml(formatDayKey(dayKey))}</strong>
        </div>
        <span>0 ${escapeHtml(t("label.matches"))}</span>
      </div>
      <div class="empty-state">${escapeHtml(t("empty.noDayScores"))}</div>
    `;
  }

  return `
    <div class="calendar-day-head">
      <div>
        <span>${escapeHtml(t("label.calendarScores"))}</span>
        <strong>${escapeHtml(formatDayKey(dayKey))}</strong>
      </div>
      <span>${formatNumber(scores.length)} ${escapeHtml(t("label.matches"))}</span>
    </div>
    <div class="calendar-score-list">
      ${scores.map((score) => renderScore(score, data.meta.mode)).join("")}
    </div>
  `;
}

function renderCalendar(data) {
  const baseDays = data.calendar?.days || [];
  if (!baseDays.length) {
    calendar.innerHTML = `<div class="empty-state">${escapeHtml(t("empty.noCalendar"))}</div>`;
    return;
  }

  const scoresByDay = filteredCalendarScoresByDay(data);
  const days = calendarDaysFromScoresByDay(scoresByDay, data.meta?.sort || "date");
  const anchorDays = days.length ? days : baseDays;
  const { minMonth, maxMonth, todayMonth } = calendarMonthBounds(data);
  const fallbackDay = anchorDays[0]?.date || todayDayKey();

  if (!currentCalendarMonth) {
    currentCalendarMonth = dayToMonthKey(currentCalendarDay || fallbackDay || todayDayKey());
  }

  currentCalendarMonth = clampMonthKey(currentCalendarMonth || todayMonth, minMonth, maxMonth);

  if (!currentCalendarDay || dayToMonthKey(currentCalendarDay) !== currentCalendarMonth) {
    currentCalendarDay = firstScoreDayInMonth(scoresByDay, currentCalendarMonth) || `${currentCalendarMonth}-01`;
  }

  const [year, month] = currentCalendarMonth.split("-").map(Number);
  const firstOfMonth = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const leadingEmptyCells = (firstOfMonth.getDay() + 6) % 7;
  const playedInMonth = days.filter((day) => day.date.startsWith(currentCalendarMonth));
  const monthScoreCount = playedInMonth.reduce((total, day) => total + day.count, 0);
  const bestMonthPp = playedInMonth.reduce((best, day) => Math.max(best, Number(day.best_pp || 0)), 0);
  const topPlayDays = new Set(
    playedInMonth
      .filter((day) => bestMonthPp > 0 && Number(day.best_pp || 0) === bestMonthPp)
      .map((day) => day.date)
  );
  const monthDays = Array.from({ length: daysInMonth }, (_, index) => {
    const dayNumber = index + 1;
    const date = new Date(year, month - 1, dayNumber);
    const key = dateToDayKey(date);
    const day = days.find((candidate) => candidate.date === key);
    const hasScores = Boolean(day);
    const active = key === currentCalendarDay ? " selected" : "";
    const topPlay = topPlayDays.has(key);
    const stateClass = topPlay ? " top-play" : hasScores ? " has-scores" : " no-scores";
    const label = topPlay ? t("label.monthTopPlay") : hasScores ? t("label.playedDay") : t("label.noScoresDay");

    return `
      <button class="calendar-cell${stateClass}${active}" type="button" data-calendar-day="${escapeHtml(key)}" aria-label="${escapeHtml(`${formatDayKey(key)} - ${label}`)}">
        <span class="calendar-date-number">${dayNumber}</span>
        ${
          hasScores
            ? `<strong>${formatNumber(day.count)}</strong><small>${escapeHtml(topPlay ? t("label.monthTopPlay") : t("label.matches"))}</small>`
            : `<small>${escapeHtml(t("label.noScoresDay"))}</small>`
        }
      </button>
    `;
  });

  const weekdayHeader = weekdayLabels()
    .map((label) => `<span class="calendar-weekday">${escapeHtml(label)}</span>`)
    .join("");
  const leadingCells = Array.from({ length: leadingEmptyCells }, () => '<span class="calendar-pad"></span>').join("");
  const prevDisabled = compareMonthKeys(currentCalendarMonth, minMonth) <= 0 ? " disabled" : "";
  const nextDisabled = compareMonthKeys(currentCalendarMonth, maxMonth) >= 0 ? " disabled" : "";
  const monthLoading = calendarLoadingMonth === currentCalendarMonth;

  calendar.innerHTML = `
    <div class="calendar-month-panel">
      <div class="calendar-month-head">
        <button class="ghost-button" type="button" data-calendar-month="-1" aria-label="${escapeHtml(t("button.prevMonth"))}"${prevDisabled}>&lt;</button>
        <div>
          <strong>${escapeHtml(formatMonthKey(currentCalendarMonth))}</strong>
          <span>${formatNumber(monthScoreCount)} ${escapeHtml(t("label.calendarMonthScores"))} - ${formatPp(bestMonthPp)}</span>
        </div>
        <button class="ghost-button today-button" type="button" data-calendar-today="1">${escapeHtml(t("button.today"))}</button>
        <button class="ghost-button" type="button" data-calendar-month="1" aria-label="${escapeHtml(t("button.nextMonth"))}"${nextDisabled}>&gt;</button>
      </div>
      ${monthLoading ? `<div class="calendar-loading">${escapeHtml(t("loading.calendarPp"))}</div>` : ""}
      <div class="calendar-filter">
        <strong>${escapeHtml(t("label.calendarPpFilter"))}</strong>
        <label>
          <span>${escapeHtml(t("label.calendarMinPp"))}</span>
          <input type="number" min="0" step="0.01" inputmode="decimal" data-calendar-pp-min value="${escapeHtml(calendarPpMin)}" placeholder="0" />
        </label>
        <label>
          <span>${escapeHtml(t("label.calendarMaxPp"))}</span>
          <input type="number" min="0" step="0.01" inputmode="decimal" data-calendar-pp-max value="${escapeHtml(calendarPpMax)}" placeholder="999" />
        </label>
        <button class="ghost-button" type="button" data-calendar-filter="apply">${escapeHtml(t("button.apply"))}</button>
        <button class="ghost-button" type="button" data-calendar-filter="reset">${escapeHtml(t("button.reset"))}</button>
      </div>
      <div class="calendar-grid">
        ${weekdayHeader}
        ${leadingCells}
        ${monthDays.join("")}
      </div>
      <div class="calendar-legend">
        <span><i class="legend-top"></i>${escapeHtml(t("label.monthTopPlay"))}</span>
        <span><i class="legend-played"></i>${escapeHtml(t("label.playedDay"))}</span>
        <span><i class="legend-empty"></i>${escapeHtml(t("label.noScoresDay"))}</span>
      </div>
    </div>
    <div class="calendar-detail">
      ${renderCalendarDayScores(data, currentCalendarDay, scoresByDay)}
    </div>
  `;
}

async function backfillCalendarMonth(monthKey) {
  if (!lastSearchData || !monthKey || !document.querySelector("#recalculatePp")?.checked) return;
  if (calendarLoadingMonth) return;

  const jobId = makeJobId("cal");
  const params = buildSearchParams();
  params.set("month", monthKey);
  params.set("ppJobId", jobId);
  calendarLoadingMonth = monthKey;
  renderCalendar(lastSearchData);
  startPpProgressPolling(jobId, "calendar");

  try {
    const response = await fetch(`/api/backfill-month?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || t("error.searchFailed"));

    lastSearchData.calendar = data.calendar;
    lastSearchData.meta = {
      ...lastSearchData.meta,
      ...data.meta,
      ppFetched: (lastSearchData.meta.ppFetched || 0) + (data.meta.ppFetched || 0),
      ppFilled: (lastSearchData.meta.ppFilled || 0) + (data.meta.ppFilled || 0),
      ppCalculated: (lastSearchData.meta.ppCalculated || 0) + (data.meta.ppCalculated || 0),
      ppCalculationAttempted: (lastSearchData.meta.ppCalculationAttempted || 0) + (data.meta.ppCalculationAttempted || 0),
    };
  } catch (error) {
    calendar.insertAdjacentHTML("afterbegin", `<div class="error-state">${escapeHtml(error.message)}</div>`);
  } finally {
    stopPpProgressPolling();
    calendarLoadingMonth = "";
    if (lastSearchData) {
      renderSummary(lastSearchData);
      renderCalendar(lastSearchData);
    }
  }
}

function selectCalendarDay(dayKey) {
  currentCalendarDay = dayKey;
  currentCalendarMonth = dayToMonthKey(dayKey);
  if (lastSearchData) renderCalendar(lastSearchData);
}

function moveCalendarMonth(offset) {
  if (!lastSearchData) return;

  const { minMonth, maxMonth, todayMonth } = calendarMonthBounds(lastSearchData);
  currentCalendarMonth = clampMonthKey(
    addMonths(currentCalendarMonth || dayToMonthKey(currentCalendarDay) || todayMonth, offset),
    minMonth,
    maxMonth
  );
  const scoresByDay = lastSearchData ? filteredCalendarScoresByDay(lastSearchData) : {};
  const firstPlayedDay = firstScoreDayInMonth(scoresByDay, currentCalendarMonth);

  currentCalendarDay = firstPlayedDay || `${currentCalendarMonth}-01`;
  renderCalendar(lastSearchData);
  void backfillCalendarMonth(currentCalendarMonth);
}

function goToCalendarToday() {
  if (!lastSearchData) return;

  const { minMonth, maxMonth, todayMonth } = calendarMonthBounds(lastSearchData);
  currentCalendarMonth = clampMonthKey(todayMonth, minMonth, maxMonth);
  const today = todayDayKey();
  currentCalendarDay = dayToMonthKey(today) === currentCalendarMonth ? today : `${currentCalendarMonth}-01`;
  renderCalendar(lastSearchData);
  void backfillCalendarMonth(currentCalendarMonth);
}

function renderMapDetails(scoreKey) {
  if (!lastSearchData) return;

  const selectedScore = findScoreByDomKey(scoreKey);
  if (!selectedScore) return;

  const chronologicalTries = enrichScoresWithMatchedPp(mapTriesForScore(selectedScore));
  const tries = [...chronologicalTries]
    .sort((a, b) => {
      const timeA = Date.parse(a.ended_at || a.created_at || "") || 0;
      const timeB = Date.parse(b.ended_at || b.created_at || "") || 0;
      const ppDiff = scorePpValue(b) - scorePpValue(a);
      if (ppDiff !== 0) return ppDiff;
      const accDiff = Number(b.accuracy || 0) - Number(a.accuracy || 0);
      if (accDiff !== 0) return accDiff;
      const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return timeB - timeA;
    });

  const beatmap = selectedScore.beatmap || {};
  const set = selectedScore.beatmapset || {};
  const artist = set.artist || beatmap.artist || t("label.unknownArtist");
  const title = set.title || beatmap.title || t("label.unknownMap");
  const version = beatmap.version || "Difficulty";
  const bestPp = tries.reduce((best, score) => Math.max(best, scorePpValue(score)), 0);
  const bestScore = tries.reduce((best, score) => Math.max(best, Number(score.score || 0)), 0);
  const latestTry = tries.reduce((latest, score) => {
    const nextTime = Date.parse(score.ended_at || score.created_at || "") || 0;
    const latestTime = latest ? Date.parse(latest.ended_at || latest.created_at || "") || 0 : 0;
    return nextTime > latestTime ? score : latest;
  }, null);

  const rows = tries.length
    ? tries
        .map((score, index) => `
          <tr>
            <td>#${formatNumber(index + 1)}</td>
            <td>${formatDate(score.ended_at || score.created_at)}</td>
            <td><span class="source-chip client-${escapeHtml(clientLabel(score))}">${escapeHtml(clientLabel(score))}</span></td>
            <td>${renderMods(score)}</td>
            <td>${escapeHtml(score.rank || "-")}</td>
            <td>${formatPp(scorePpValue(score))}</td>
            <td>${formatAccuracy(score.accuracy)}</td>
            <td>${formatNumber(score.max_combo)}x</td>
            <td>${formatNumber(missCount(score))}</td>
            <td>${formatNumber(score.score)}</td>
          </tr>
        `)
        .join("")
    : `<tr><td colspan="10">${escapeHtml(t("empty.noMapDetails"))}</td></tr>`;

  detailsPanel.classList.remove("hidden");
  detailsPanel.innerHTML = `
    <div class="details-backdrop" data-close-details="1"></div>
    <article class="details-card">
      <header class="details-head">
        <div>
          <span>${escapeHtml(t("label.mapDetails"))}</span>
          <h2>${escapeHtml(artist)} - ${escapeHtml(title)}</h2>
          <p>[${escapeHtml(version)}]</p>
        </div>
        <button class="ghost-button" type="button" data-close-details="1">${escapeHtml(t("button.close"))}</button>
      </header>
      <div class="details-stats">
        <span><strong>${formatNumber(tries.length)}</strong>${escapeHtml(t("label.tries"))}</span>
        <span><strong>${formatPp(bestPp)}</strong>${escapeHtml(t("label.bestPp"))}</span>
        <span><strong>${formatNumber(bestScore)}</strong>${escapeHtml(t("label.bestScore"))}</span>
        <span><strong>${latestTry ? formatDate(latestTry.ended_at || latestTry.created_at) : "-"}</strong>${escapeHtml(t("label.latestTry"))}</span>
      </div>
      ${renderTryHistoryChart(chronologicalTries)}
      <div class="details-table-wrap">
        <table class="details-table">
          <thead>
            <tr>
              <th>#</th>
              <th>${escapeHtml(t("option.sort.date"))}</th>
              <th>Client</th>
              <th>Mods</th>
              <th>Rank</th>
              <th>PP</th>
              <th>${escapeHtml(t("label.accuracy"))}</th>
              <th>${escapeHtml(t("label.combo"))}</th>
              <th>${escapeHtml(t("label.miss"))}</th>
              <th>${escapeHtml(t("label.score"))}</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </article>
  `;
}

function renderSearchData(data) {
  renderSummary(data);
  renderPasses(data);
  renderImprovements(data);
  renderCalendar(data);

  if (!data.scores.length) {
    setResultsState(emptyMessage(data.meta));
    return;
  }

  setResultsState(data.scores.map((score) => renderScore(score, data.meta.mode)).join(""));
}

async function runSearch(event) {
  event.preventDefault();
  stopLiveScanner("status.liveWaiting");
  summary.classList.add("hidden");
  lastSearchData = null;
  setLoading(true);
  setResultsState(`<div class="loading-state">${escapeHtml(t("loading.search"))}</div>`);
  renderPasses();
  setImprovementState("");
  calendar.innerHTML = "";

  try {
    const params = buildSearchParams();
    const ppJobId = makeJobId("search");
    params.set("ppJobId", ppJobId);
    startPpProgressPolling(ppJobId, "search");
    const response = await fetch(`/api/search?${params.toString()}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || t("error.searchFailed"));
    }

    lastSearchData = data;
    renderSearchData(data);
    startLiveScanner();
  } catch (error) {
    setResultsState(`<div class="error-state">${escapeHtml(error.message)}</div>`);
  } finally {
    stopPpProgressPolling();
    setLoading(false);
  }
}

function setLiveStatus(key, values = {}, className = "") {
  if (!liveStatus) return;
  liveStatus.className = `status-pill live-pill ${className}`.trim();
  liveStatus.textContent = t(key, values);
}

function stopLiveScanner(statusKey = "status.liveStopped") {
  if (liveTimer) clearInterval(liveTimer);
  liveTimer = null;
  liveScanBusy = false;
  setLiveStatus(statusKey);
}

async function refreshFromStoredSearch() {
  const params = buildSearchParams();
  params.set("useApiV2", "0");
  params.set("includeHuis", "0");

  const response = await fetch(`/api/search?${params.toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || t("error.searchFailed"));

  lastSearchData = data;
  renderSearchData(data);
}

async function runLiveScan() {
  if (liveScanBusy || !document.querySelector("#liveScanner")?.checked) return;
  const username = document.querySelector("#username").value.trim();
  if (!username) return;

  liveScanBusy = true;
  setLiveStatus("status.liveScanning");

  try {
    const params = buildLiveScanParams();
    const response = await fetch(`/api/live-scan?${params.toString()}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || t("status.liveError"));

    if (data.savedNow > 0) {
      setLiveStatus("status.liveUpdated", { count: formatNumber(data.savedNow) }, "ready");
      await refreshFromStoredSearch();
    } else {
      setLiveStatus("status.liveNoChanges");
    }
  } catch {
    setLiveStatus("status.liveError", {}, "missing");
  } finally {
    liveScanBusy = false;
  }
}

function startLiveScanner() {
  const enabled = document.querySelector("#liveScanner")?.checked;
  const username = document.querySelector("#username").value.trim();
  if (!enabled || !username || !lastSearchData) {
    stopLiveScanner(enabled ? "status.liveIdle" : "status.liveStopped");
    return;
  }

  if (liveTimer) clearInterval(liveTimer);
  setLiveStatus("status.liveWaiting");
  liveTimer = setInterval(runLiveScan, 30_000);
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

  activeView = button.dataset.view;
  results.classList.toggle("hidden", activeView !== "scores");
  passes.classList.toggle("hidden", activeView !== "passes");
  improvements.classList.toggle("hidden", activeView !== "improvements");
  calendar.classList.toggle("hidden", activeView !== "calendar");

  if (activeView === "calendar") {
    void backfillCalendarMonth(currentCalendarMonth || dayToMonthKey(currentCalendarDay) || todayDayKey().slice(0, 7));
  }
});

function handleDetailsClick(event) {
  const button = event.target.closest("button[data-score-key]");
  if (!button) return;
  renderMapDetails(button.dataset.scoreKey);
}

results.addEventListener("click", handleDetailsClick);
passes.addEventListener("click", (event) => {
  const filterButton = event.target.closest("button[data-pass-filter]");
  if (filterButton) {
    if (filterButton.dataset.passFilter === "reset") {
      passStarMin = "";
      passStarMax = "";
    } else {
      passStarMin = passes.querySelector("[data-pass-star-min]")?.value.trim() || "";
      passStarMax = passes.querySelector("[data-pass-star-max]")?.value.trim() || "";
    }
    renderPasses(lastSearchData);
    return;
  }

  handleDetailsClick(event);
});
improvements.addEventListener("click", handleDetailsClick);
calendar.addEventListener("click", (event) => {
  const filterButton = event.target.closest("button[data-calendar-filter]");
  if (filterButton && lastSearchData) {
    if (filterButton.dataset.calendarFilter === "reset") {
      calendarPpMin = "";
      calendarPpMax = "";
    } else {
      calendarPpMin = calendar.querySelector("[data-calendar-pp-min]")?.value.trim() || "";
      calendarPpMax = calendar.querySelector("[data-calendar-pp-max]")?.value.trim() || "";
    }
    renderCalendar(lastSearchData);
    return;
  }

  const monthButton = event.target.closest("button[data-calendar-month]");
  if (monthButton) {
    moveCalendarMonth(Number(monthButton.dataset.calendarMonth || 0));
    return;
  }

  const todayButton = event.target.closest("button[data-calendar-today]");
  if (todayButton) {
    goToCalendarToday();
    return;
  }

  const dayButton = event.target.closest("button[data-calendar-day]");
  if (dayButton && lastSearchData) {
    selectCalendarDay(dayButton.dataset.calendarDay);
    return;
  }

  handleDetailsClick(event);
});

detailsPanel.addEventListener("click", (event) => {
  if (!event.target.closest("[data-close-details]")) return;
  detailsPanel.classList.add("hidden");
  detailsPanel.innerHTML = "";
});

languageSelect?.addEventListener("change", () => {
  storeLanguage(languageSelect.value);
  applyLanguage(languageSelect.value);
  checkStatus();
  checkForUpdates();
});

updateStatus?.addEventListener("click", startUpdate);

document.querySelector("#liveScanner")?.addEventListener("change", () => {
  if (document.querySelector("#liveScanner").checked) startLiveScanner();
  else stopLiveScanner();
});

form.addEventListener("submit", runSearch);

initHelp();
applyLanguage(currentLanguage, { rerender: false });
checkStatus();
checkForUpdates();
startStartupSyncPolling();
