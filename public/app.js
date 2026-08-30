const form = document.querySelector("#searchForm");
const apiStatus = document.querySelector("#apiStatus");
const liveStatus = document.querySelector("#liveStatus");
const updateStatus = document.querySelector("#updateStatus");
const startupSync = document.querySelector("#startupSync");
const results = document.querySelector("#results");
const passes = document.querySelector("#passes");
const improvements = document.querySelector("#improvements");
const calendar = document.querySelector("#calendar");
const compareView = document.querySelector("#compareView");
const timeTravelView = document.querySelector("#timeTravelView");
const timeTravelOutput = document.querySelector("#timeTravelOutput");
const skillTreeView = document.querySelector("#skillTreeView");
const skillTreeOutput = document.querySelector("#skillTreeOutput");
const ppMapsView = document.querySelector("#ppMapsView");
const ppMapsOutput = document.querySelector("#ppMapsOutput");
const detailsPanel = document.querySelector("#detailsPanel");
const summary = document.querySelector("#summary");
const submitButton = document.querySelector("#submitButton");
const modButtons = document.querySelector("#modButtons");
const clearMods = document.querySelector("#clearMods");
const viewTabs = document.querySelector(".view-tabs");
const languageSelect = document.querySelector("#languageSelect");
const menuToggle = document.querySelector("#menuToggle");
const menuClose = document.querySelector("#menuClose");
const sideMenu = document.querySelector("#sideMenu");
const menuBackdrop = document.querySelector("#menuBackdrop");
const comparePlayerA = document.querySelector("#comparePlayerA");
const comparePlayerB = document.querySelector("#comparePlayerB");
const compareMode = document.querySelector("#compareMode");
const compareRun = document.querySelector("#compareRun");
const compareReset = document.querySelector("#compareReset");
const mapComparePlayerA = document.querySelector("#mapComparePlayerA");
const mapCompareMode = document.querySelector("#mapCompareMode");
const mapCompareRun = document.querySelector("#mapCompareRun");
const timePlayer = document.querySelector("#timePlayer");
const timeMode = document.querySelector("#timeMode");
const timeRun = document.querySelector("#timeRun");
const timeDate = document.querySelector("#timeDate");
const timeSlider = document.querySelector("#timeSlider");
const timeSelectedDate = document.querySelector("#timeSelectedDate");
const timeSourceLegend = document.querySelector("#timeSourceLegend");
const skillPlayer = document.querySelector("#skillPlayer");
const skillMode = document.querySelector("#skillMode");
const skillRun = document.querySelector("#skillRun");
const skillStarMinInput = document.querySelector("#skillStarMin");
const skillStarMaxInput = document.querySelector("#skillStarMax");
const topScores = document.querySelector("#topScores");
const ppMapsPlayer = document.querySelector("#ppMapsPlayer");
const ppMapsMode = document.querySelector("#ppMapsMode");
const ppMapsRun = document.querySelector("#ppMapsRun");
const ppMapsReset = document.querySelector("#ppMapsReset");
const ppMapsMore = document.querySelector("#ppMapsMore");
const ppMapsModButtons = document.querySelector("#ppMapsMods");

const selectedMods = new Set();
const languageStorageKey = "osu-mod-score-finder-language";
const ppMapsSettingsStorageKey = "osu-mod-score-finder-ppmaps-settings-v1";
let currentLanguage = readStoredLanguage();
let lastSearchData = null;
let isLoading = false;
let activeView = "scores";
let currentCalendarDay = "";
let currentCalendarMonth = "";
let calendarPpMin = "";
let calendarPpMax = "";
let topDateFrom = "";
let topDateTo = "";
let topTimeFrom = "00:00";
let topTimeTo = "23:59";
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
let compareDetailScores = [];
let timeTravelScores = [];
let timeTravelUser = null;
let timeTravelDays = [];
let timeTravelExternalSnapshots = [];
let latestSkillTreeData = null;
let latestSkillTreeMode = "osu";
const ppMapsModStates = new Map();
let ppMapsResultMode = "unplayed";
let latestPpMapsPayload = null;
let latestPpMapsKnownData = null;
let latestPpMapsKnownError = null;
let skillTrainingState = {
  skillKey: "weakest",
  goalType: "pp",
  targetPp: "300",
  targetRank: "",
};

document.body.dataset.activeView = activeView;
document.body.dataset.activeSection = "home";

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
    "tab.top": "Top",
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
    "toggle.includeUnrankedPasses": "unranked in Passes",
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
    "update.confirm": "Neue Version verfuegbar: {current} -> {latest}.{changes}{repo}\n\nUpdate jetzt starten? .env, Datenbank und lokale Score-Daten bleiben erhalten. Die App startet danach automatisch neu.",
    "update.changes": "\n\nWas ist neu:\n{changes}",
    "update.repo": "\n\nRepository:\n{repo}",
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
    "help.toggle.includeUnrankedPasses": "Nimmt unranked und Custom-Rate-Scores nur im Passes-Tab mit auf. Scores, Improvement und Kalender bleiben vom ranked/approved Filter getrennt.",
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
    "nav.menu": "Menue",
    "nav.home": "Hauptseite",
    "nav.compare": "Vergleich",
    "nav.timeTravel": "Time Travel",
    "nav.skillTree": "Skill Tree",
    "nav.ppMaps": "PP Maps",
    "ppMaps.eyebrow": "PP Maps",
    "ppMaps.title": "Ungespielte PP-Maps finden",
    "ppMaps.description": "Laedt Empfehlungen von osu-pps und entfernt Maps, die in deinen bekannten lokalen oder API-Scores schon vorkommen.",
    "ppMaps.setup": "Setup",
    "ppMaps.filters": "Filter wie osu-pps",
    "ppMaps.song": "Songname",
    "ppMaps.songPlaceholder": "song name...",
    "ppMaps.ppMin": "PP min",
    "ppMaps.ppMax": "PP max",
    "ppMaps.bpmMin": "BPM min",
    "ppMaps.bpmMax": "BPM max",
    "ppMaps.starsMin": "Sterne min",
    "ppMaps.starsMax": "Sterne max",
    "ppMaps.passMin": "Passes min",
    "ppMaps.passMax": "Passes max",
    "ppMaps.lengthMin": "Laenge min",
    "ppMaps.lengthMax": "Laenge max",
    "ppMaps.more": "more",
    "ppMaps.run": "PP-Maps suchen",
    "ppMaps.note": "Datenquelle: osu-pps von grumd. Der Abgleich nutzt Beatmap-IDs aus deinen bekannten lokalen und online geladenen Scores.",
    "ppMaps.placeholderTitle": "PP-Map Ergebnisbereich",
    "ppMaps.placeholderText": "Waehle Filter und lade Empfehlungen. Bereits bekannte Maps werden danach aus der Liste entfernt.",
    "ppMaps.loading": "PP-Maps werden geladen...",
    "ppMaps.loadingDetail": "osu-pps Daten und deine bekannten Scores werden abgeglichen.",
    "ppMaps.results": "Ungespielte Kandidaten",
    "ppMaps.improvementResults": "Improvement-Kandidaten",
    "ppMaps.accountResults": "Account-PP Simulation",
    "ppMaps.sourceUpdated": "osu-pps aktualisiert",
    "ppMaps.knownRemoved": "bereits bekannte Maps entfernt",
    "ppMaps.playedCandidates": "bereits gespielte Kandidaten",
    "ppMaps.available": "osu-pps Treffer",
    "ppMaps.passCount": "Passes",
    "ppMaps.farmValue": "Farm",
    "ppMaps.openPps": "auf osu-pps oeffnen",
    "ppMaps.openMap": "Map oeffnen",
    "ppMaps.noResults": "Keine ungespielten PP-Maps fuer diese Filter gefunden.",
    "ppMaps.noImprovementResults": "Keine bereits gespielten Improvement-Kandidaten fuer diese Filter gefunden.",
    "ppMaps.noAccountSource": "Lade zuerst einen Spieler, damit die Topliste simuliert werden kann.",
    "ppMaps.failed": "PP-Maps konnten nicht geladen werden.",
    "ppMaps.knownUnavailable": "Score-Abgleich nicht verfuegbar",
    "ppMaps.currentBest": "bekannter Besttry",
    "ppMaps.gain": "moeglich",
    "ppMaps.sliderbreak": "SB/1-Miss Chance",
    "ppMaps.accountCurrent": "aktuelle Account-PP",
    "ppMaps.accountSimulated": "simulierte Account-PP",
    "ppMaps.accountGain": "ungefaehres Plus",
    "ppMaps.accountReplaced": "ersetzte Plays",
    "ppMaps.accountTarget": "Zielwert",
    "ppMaps.accountHelp": "Nutzt deine aktuelle Profil-PP als Basis und addiert den rekonstruierten Toplisten-Delta. Bonus-PP und sehr tiefe Plays bleiben dadurch in der Basis erhalten.",
    "compare.eyebrow": "Vergleich",
    "compare.title": "Spieler vergleichen",
    "compare.description": "Eine ruhige Arbeitsflaeche fuer direkte Spieler-Vergleiche: Top-200, Profilwerte, Mod-Fokus und Map-Kontext.",
    "compare.players": "Spieler",
    "compare.vsSetup": "VS Setup",
    "compare.player": "Spieler",
    "compare.playerA": "Spieler A",
    "compare.playerB": "Spieler B",
    "compare.placeholderA": "z. B. marcy02",
    "compare.placeholderB": "z. B. Nova Orta",
    "compare.gameMode": "Game mode",
    "compare.runVs": "Vergleich starten",
    "compare.analysis": "Analyse",
    "compare.analysisTitle": "Was du hier siehst",
    "compare.analysisText": "VS laedt pro Spieler bis zu 200 gespeicherte/bekannte Passes, zeigt klickbare Score-Karten und bindet externe osu-sig Profilkarten als schnelle Skill-Vorschau ein.",
    "compare.mapMode": "Map Compare",
    "compare.mapSetup": "Maps vergleichen",
    "compare.runMaps": "Maps laden",
    "compare.mapText": "Zeigt die geladenen Maps eines Spielers und oeffnet pro Difficulty die passende Leaderboard-Ansicht.",
    "compare.rankArea": "Map-Auswahl",
    "compare.rankTitle": "Status-Filter",
    "compare.mapScope": "Map-Auswahl",
    "compare.mapScopeTitle": "Status-Filter",
    "compare.scopeRanked": "ranked",
    "compare.scopeLoved": "loved",
    "compare.scopeBoth": "ranked + loved",
    "compare.rankText": "Zeigt nur Maps aus dem gewaehlten Statusbereich. Die Leaderboard-Ansicht oeffnet die passende osu!-Rangliste pro Difficulty.",
    "compare.cardProfile": "Profilwerte",
    "compare.cardProfileTitle": "PP, Rank, Playcount, Accuracy",
    "compare.cardProfileText": "Direkter Kopf-an-Kopf Vergleich der sichtbaren Profilwerte.",
    "compare.cardTop": "Top-200 Analyse",
    "compare.cardTopTitle": "AR / OD / CS / BPM / Sterne",
    "compare.cardTopText": "Welche Map-Typen, Mods und Difficulty-Werte ein Spieler bevorzugt.",
    "compare.cardPower": "Power Chart",
    "compare.cardPowerTitle": "Radar wie Stats-Vergleich",
    "compare.cardPowerText": "Lesbare Werte fuer Speed, Aim, Acc, Consistency und Mod-Fokus.",
    "compare.cardMatchups": "Map Matchups",
    "compare.cardMatchupsTitle": "Gemeinsame Maps",
    "compare.cardMatchupsText": "Zeigt, wer auf derselben Difficulty vorne liegt und wo die groessten Unterschiede sind.",
    "compare.vsPlaceholderTitle": "VS Ergebnisbereich",
    "compare.vsPlaceholderText": "Hier landen die geladenen Top-Passes beider Spieler, Profilwerte und die wichtigsten Unterschiede.",
    "compare.mapPlaceholderTitle": "Map-Compare Ergebnisbereich",
    "compare.mapPlaceholderText": "Hier landen die geladenen Maps eines Spielers mit Ranglistenwerten, Details und Leaderboard-Link.",
    "compare.failed": "Vergleich fehlgeschlagen",
    "compare.loadDetail": "Bitte kurz warten, die lokale Datenbank und erreichbare API-Daten werden abgefragt.",
    "compare.noMods": "Keine Mods gefunden.",
    "compare.noScores": "Keine Scores geladen.",
    "compare.noMaps": "Keine Maps in dieser Auswahl gefunden.",
    "compare.vsLoading": "VS Vergleich wird geladen...",
    "compare.mapLoading": "Map Compare wird geladen...",
    "compare.mapLoadingDetail": "Ein Spieler wird mit bis zu 200 Scores geladen und danach nach dem gewaehlten Map-Status gefiltert.",
    "compare.needTwoPlayers": "Bitte beide Spielernamen eintragen.",
    "compare.needOnePlayer": "Bitte einen Spielernamen eintragen.",
    "compare.loadedMaps": "Geladene Maps",
    "compare.shown": "angezeigt",
    "compare.mapStatus": "Map-Status",
    "compare.rankWindow": "Map-Status",
    "compare.rankPrepared": "gefiltert",
    "compare.openLeaderboard": "Leaderboard oeffnen",
    "compare.position": "Position",
    "compare.totalScore": "Score",
    "compare.hitResults": "Hits",
    "compare.time": "Zeit",
    "compare.modA": "Mod-Verteilung Spieler A",
    "compare.modB": "Mod-Verteilung Spieler B",
    "compare.osuSigStdOnly": "osu-sig Skills sind nur fuer osu!standard verfuegbar.",
    "compare.metricProfilePp": "Profil PP",
    "compare.metricGlobalRank": "Global Rank",
    "compare.metricTopplay": "Topplay",
    "compare.metricAvgPp": "Durchschnitts-PP",
    "compare.metricAvgStars": "Durchschnitts-Sterne",
    "compare.metricAvgAcc": "Durchschnitts-Accuracy",
    "compare.metricAvgBpm": "Durchschnitts-BPM",
    "compare.metricAvgAr": "Durchschnitts-AR",
    "compare.metricAvgOd": "Durchschnitts-OD",
    "compare.metricAvgCs": "Durchschnitts-CS",
    "compare.sigFullSkills": "Full with Skills",
    "compare.sigSkills": "Skills",
    "time.eyebrow": "Time Travel",
    "time.title": "Score-Historie zurueckdrehen",
    "time.description": "Schaetzt anhand deiner gespeicherten Plays, wie dein PP-Stand bis zu einem Datum ausgesehen haette.",
    "time.setup": "Setup",
    "time.playerDate": "Spieler und Datum",
    "time.load": "Historie laden",
    "time.disclaimer": "Hinweis: Diese Ansicht nutzt deine heute lokal/API-bekannten Scores. Der Rank ist eine vorsichtige Rekonstruktion gegen den aktuellen Datenstand, nicht die echte damalige globale Rangliste. Bei sehr vielen lokalen Scores kann das Laden 8-10 Minuten dauern.",
    "time.timeline": "Zeitregler",
    "time.date": "Datum",
    "time.sliderText": "Nach dem Laden kannst du den Stand Tag fuer Tag zurueckdrehen.",
    "time.placeholderTitle": "Time-Travel Ergebnisbereich",
    "time.placeholderText": "Lade einen Spieler, dann erscheinen hier geschaetzte PP, bekannte Plays und die staerksten Scores bis zum gewaehlten Datum.",
    "time.loading": "Time Travel wird geladen...",
    "time.noScores": "Keine gespeicherten Scores fuer diese Rueckrechnung gefunden.",
    "time.knownUntil": "Bekannte Scores bis",
    "time.estimatedPp": "Geschaetzte gewichtete PP",
    "time.knownPlays": "Bekannte Plays",
    "time.uniqueMaps": "Beste Maps",
    "time.currentRank": "Aktueller Rank",
    "time.estimatedRank": "Geschaetzter Rank",
    "time.estimatedCountryRank": "Geschaetzter nationaler Rank",
    "time.profileEstimate": "Rekonstruierte Profilwerte",
    "time.scoreEstimate": "Lokale Score-Werte",
    "time.medals": "Medaillen",
    "time.profilePp": "PP",
    "time.playtime": "Gesamtspielzeit",
    "time.rankChart": "Rank-Verlauf",
    "time.rankedScore": "Punktzahl auf Ranglisten",
    "time.hitAccuracy": "Genauigkeit",
    "time.playCount": "Anzahl Spiele",
    "time.totalScore": "Gesamtpunktzahl",
    "time.totalHits": "Anzahl Treffer",
    "time.hitsPerPlay": "Treffer pro Spiel",
    "time.maxCombo": "Hoechste Combo",
    "time.replaysWatched": "Angesehene Replays",
    "time.currentOnly": "heutiger Profilwert",
    "time.actualCurrent": "aktueller osu!api-Wert",
    "time.estimated": "geschaetzt",
    "time.sourceOsuApi": "Quelle: osu!api",
    "time.sourceOsuTrack": "Quelle: osu!track Snapshot",
    "time.sourceLocal": "Quelle: lokale Rekonstruktion",
    "time.sourceMixed": "Quelle: gemischt",
    "time.sourcesTitle": "Datenquellen",
    "time.sourceApiShort": "osu!api",
    "time.sourceTrackShort": "osu!track",
    "time.sourceLocalShort": "lokal",
    "time.sourceMixedShort": "gemischt",
    "time.sourceUnavailable": "nicht aktiv",
    "time.selectedSource": "Ausgewaehlter Tag",
    "time.bestPlay": "Bestes Play bis Datum",
    "time.topAtDate": "Staerkste bekannte Plays bis zu diesem Datum",
    "time.estimateNote": "Die PP werden mit dem normalen osu!-Gewichtungsmodell aus den bekannten Plays neu gestapelt. Andere Spieler werden nicht historisch zurueckgerechnet.",
    "skill.eyebrow": "Skill Tree",
    "skill.title": "osu! Skill Tree",
    "skill.description": "Baut aus deinen gespeicherten Plays eine Skill-Landkarte: Aim, Raw Speed, Speed Control, Reading, Low-AR/EZ, Precision, Rhythm, Stamina und Consistency.",
    "skill.setup": "Setup",
    "skill.player": "Spieler analysieren",
    "skill.load": "Skill Tree laden",
    "skill.starMin": "Min Sterne",
    "skill.starMax": "Max Sterne",
    "skill.disclaimer": "Erste Beta: Der Tree nutzt gespeicherte Score-, Mod-, BPM-, AR-, OD-, CS-, Star-, Accuracy-, Miss- und Combo-Werte. Exakte Cursor-/Replay-Bewegung wird erst moeglich, wenn Replay-Decoding spaeter eingebaut wird.",
    "skill.placeholderTitle": "Skill-Tree Ergebnisbereich",
    "skill.placeholderText": "Lade einen Spieler, dann werden deine staerksten Skill-Bereiche, passende Maps und Trainingsziele sichtbar.",
    "skill.loading": "Skill Tree wird geladen...",
    "skill.noScores": "Keine gespeicherten Plays fuer den Skill Tree gefunden.",
    "skill.overview": "Skill-Uebersicht",
    "skill.strongest": "Staerkster Skill",
    "skill.weakest": "Training lohnt sich",
    "skill.maps": "Passende Maps",
    "skill.recommendations": "Trainingsziele",
    "skill.evidence": "Wertebasis",
    "skill.playCount": "analysierte Plays",
    "skill.avgStars": "Durchschnitt Sterne",
    "skill.avgBpm": "Durchschnitt BPM",
    "skill.avgAccuracy": "Durchschnitt Accuracy",
    "skill.totalMisses": "Misses gesamt",
    "skill.starRange": "Sternbereich",
    "skill.starOverview": "Skill nach Sternen",
    "skill.noRangeScores": "Keine gespeicherten Plays in dieser Stern-Range gefunden.",
    "skill.scoreLabel": "Skill {value}/100",
    "skill.bestExample": "Bestes Beispiel",
    "skill.needsWork": "Hier verlierst du oft Punkte",
    "skill.trainingPlanner": "Trainingsplaner",
    "skill.trainingSkill": "Was willst du ueben?",
    "skill.goalType": "Zieltyp",
    "skill.goalPp": "Ziel-PP",
    "skill.goalRank": "Ziel-Rang",
    "skill.goalPpOption": "PP-Ziel",
    "skill.goalRankOption": "Rank-Ziel",
    "skill.updatePlan": "Plan anzeigen",
    "skill.saveGoal": "Ziel speichern",
    "skill.savedGoals": "Gespeicherte Ziele",
    "skill.targetMaps": "Zielmaps",
    "skill.prepMaps": "Vorbereitungs-Maps",
    "skill.ready": "bereit",
    "skill.needsPrep": "erst vorbereiten",
    "skill.stepPrep": "1. Vorbereitung",
    "skill.stepTarget": "2. Ziel-Play",
    "skill.stepPolish": "3. Stabilisieren",
    "skill.targetPlayTitle": "Was fuer ein Play dein Ziel braucht",
    "skill.targetPlayText": "Suche nach einem Run in der Naehe von {pp}. Gute Kandidaten liegen beim gewaehlten Skill hoch, haben wenig Misses und sind nicht zu weit ueber deinem bisherigen Bereich.",
    "skill.rankTargetText": "Rank-Ziel #{rank}: nutze die Zielmaps als PP-Richtung. Exakte Rank-Grenzen schwanken und werden spaeter ueber externe Snapshots genauer.",
    "skill.prepText": "Erst aehnliche Maps etwa 0.3 bis 0.8 Sterne darunter stabilisieren.",
    "skill.targetText": "Dann die Zielmaps spielen, die deiner Ziel-PP und dem gewaehlten Skill am naechsten kommen.",
    "skill.polishText": "Wenn Vorbereitung schon 95%+ und maximal 1-2 Misses hat, nicht weiter runtergehen, sondern Zielmap grinden.",
    "skill.trainingSummary": "Plan-Zusammenfassung",
    "skill.targetCount": "Zielmaps",
    "skill.prepCount": "Vorbereitung",
    "skill.readyCount": "bereit",
    "skill.noTrainingMaps": "Keine passenden Trainingsmaps in deinen gespeicherten Plays gefunden.",
    "skill.noSavedGoals": "Noch keine Trainingsziele gespeichert.",
    "skill.externalNote": "Diese Beta nutzt lokale/gespeicherte Plays. Ungespielte externe PP-Maps werden erst sichtbar, wenn eine stabile osu-pps/API-Anbindung vorhanden ist.",
    "skill.goalSaved": "Trainingsziel gespeichert.",
    "skill.ppProxyNote": "Rank-Ziele werden aktuell als PP-nahe Trainingsrichtung behandelt, weil historische Rank-Schwellen nicht vollstaendig verfuegbar sind.",
    "skill.aim": "Aim",
    "skill.speed": "Raw Speed",
    "skill.speedControl": "Speed Control",
    "skill.lowAr": "Low-AR / EZ",
    "skill.reading": "Reading",
    "skill.precision": "Precision",
    "skill.rhythm": "Rhythm",
    "skill.stamina": "Stamina",
    "skill.consistency": "Consistency",
    "skill.aimHint": "hohe Sterne, CS und Jump-/Aim-lastige Runs",
    "skill.speedHint": "effektive BPM, DT/NC/Rate-Adjust und schnelle Maps",
    "skill.speedControlHint": "wie sauber schnelle Maps gehalten werden: Accuracy, Misses und Combo",
    "skill.lowArHint": "EZ, AR unter 8.0 und langsamere visuelle Reads",
    "skill.readingHint": "HD/FL, hoher AR und visuell anspruchsvolle Plays",
    "skill.precisionHint": "OD, Accuracy und kleine Circle Size",
    "skill.rhythmHint": "wechselnde BPM, laengere Patterns und Timing-Stabilitaet",
    "skill.staminaHint": "lange Maps, hohe Combo und viele Objekte",
    "skill.consistencyHint": "wenige Misses, hohe Accuracy und stabile Passes",
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
    "label.topRangeTitle": "Top-200 Plays im Zeitraum",
    "label.topRangeHelp": "Zeigt nur Scores, die aktuell in der rekonstruierten PP-Top-200 deines Profils liegen.",
    "label.dateFrom": "Von",
    "label.dateTo": "Bis",
    "label.timeFrom": "Uhrzeit von",
    "label.timeTo": "Uhrzeit bis",
    "label.topCurrentProfile": "aktuelle Profil-Top-200",
    "label.topInRange": "Top-Plays im Zeitraum",
    "label.topBestGain": "Bestes Play",
    "label.topWeightedPp": "gewichtete PP im Zeitraum",
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
    "label.ppSourceHypothetical": "hypothetische PP",
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
    "empty.noTopScores": "Keine Top-200 Plays in diesem Zeitraum gefunden.",
    "empty.noTopSource": "Lade zuerst einen Spieler, damit die aktuellen Profil-Top-200 abgeglichen werden koennen.",
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
    "tab.top": "Top",
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
    "toggle.includeUnrankedPasses": "unranked in Passes",
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
    "update.confirm": "New version available: {current} -> {latest}.{changes}{repo}\n\nStart the update now? .env, database, and local score data will be kept. The app will restart automatically afterwards.",
    "update.changes": "\n\nWhat's new:\n{changes}",
    "update.repo": "\n\nRepository:\n{repo}",
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
    "help.toggle.includeUnrankedPasses": "Includes unranked and custom-rate scores only in the Passes tab. Scores, Improvement, and Calendar stay separate from this filter.",
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
    "nav.menu": "Menu",
    "nav.home": "Home",
    "nav.compare": "Compare",
    "nav.timeTravel": "Time Travel",
    "nav.skillTree": "Skill Tree",
    "nav.ppMaps": "PP Maps",
    "ppMaps.eyebrow": "PP Maps",
    "ppMaps.title": "Find unplayed PP maps",
    "ppMaps.description": "Loads recommendations from osu-pps and removes maps already present in your known local or API scores.",
    "ppMaps.setup": "Setup",
    "ppMaps.filters": "osu-pps style filters",
    "ppMaps.song": "Song name",
    "ppMaps.songPlaceholder": "song name...",
    "ppMaps.ppMin": "PP min",
    "ppMaps.ppMax": "PP max",
    "ppMaps.bpmMin": "BPM min",
    "ppMaps.bpmMax": "BPM max",
    "ppMaps.starsMin": "Stars min",
    "ppMaps.starsMax": "Stars max",
    "ppMaps.passMin": "Passes min",
    "ppMaps.passMax": "Passes max",
    "ppMaps.lengthMin": "Length min",
    "ppMaps.lengthMax": "Length max",
    "ppMaps.more": "more",
    "ppMaps.run": "Search PP maps",
    "ppMaps.note": "Source: osu-pps by grumd. Matching uses beatmap IDs from your known local and online loaded scores.",
    "ppMaps.placeholderTitle": "PP map result area",
    "ppMaps.placeholderText": "Choose filters and load recommendations. Already known maps are removed from the list.",
    "ppMaps.loading": "Loading PP maps...",
    "ppMaps.loadingDetail": "Matching osu-pps data against your known scores.",
    "ppMaps.results": "Unplayed candidates",
    "ppMaps.improvementResults": "Improvement candidates",
    "ppMaps.accountResults": "Account PP simulation",
    "ppMaps.sourceUpdated": "osu-pps updated",
    "ppMaps.knownRemoved": "known maps removed",
    "ppMaps.playedCandidates": "already played candidates",
    "ppMaps.available": "osu-pps matches",
    "ppMaps.passCount": "Passes",
    "ppMaps.farmValue": "Farm",
    "ppMaps.openPps": "open on osu-pps",
    "ppMaps.openMap": "Open map",
    "ppMaps.noResults": "No unplayed PP maps found for these filters.",
    "ppMaps.noImprovementResults": "No already played improvement candidates found for these filters.",
    "ppMaps.noAccountSource": "Load a player first so the top list can be simulated.",
    "ppMaps.failed": "Could not load PP maps.",
    "ppMaps.knownUnavailable": "Score matching unavailable",
    "ppMaps.currentBest": "known best try",
    "ppMaps.gain": "possible",
    "ppMaps.sliderbreak": "SB/1-miss chance",
    "ppMaps.accountCurrent": "current account PP",
    "ppMaps.accountSimulated": "simulated account PP",
    "ppMaps.accountGain": "estimated gain",
    "ppMaps.accountReplaced": "replaced plays",
    "ppMaps.accountTarget": "target value",
    "ppMaps.accountHelp": "Uses your current profile PP as the base and adds the reconstructed top-list delta, so bonus PP and very deep plays stay in the base.",
    "compare.eyebrow": "Compare",
    "compare.title": "Compare players",
    "compare.description": "A calm workspace for direct player comparisons: top 200, profile values, mod focus, and map context.",
    "compare.players": "Players",
    "compare.vsSetup": "VS setup",
    "compare.player": "Player",
    "compare.playerA": "Player A",
    "compare.playerB": "Player B",
    "compare.placeholderA": "e.g. marcy02",
    "compare.placeholderB": "e.g. Nova Orta",
    "compare.gameMode": "Game mode",
    "compare.runVs": "Run comparison",
    "compare.analysis": "Analysis",
    "compare.analysisTitle": "What this shows",
    "compare.analysisText": "VS loads up to 200 stored or known passes per player, shows clickable score cards, and embeds external osu-sig profile cards as a quick skill preview.",
    "compare.mapMode": "Map Compare",
    "compare.mapSetup": "Compare maps",
    "compare.runMaps": "Load maps",
    "compare.mapText": "Shows one player's loaded maps and opens the matching leaderboard for each difficulty.",
    "compare.rankArea": "Map selection",
    "compare.rankTitle": "Status filter",
    "compare.mapScope": "Map selection",
    "compare.mapScopeTitle": "Status filter",
    "compare.scopeRanked": "ranked",
    "compare.scopeLoved": "loved",
    "compare.scopeBoth": "ranked + loved",
    "compare.rankText": "Shows only maps from the selected status group. The leaderboard action opens the matching osu! ranking for that difficulty.",
    "compare.cardProfile": "Profile values",
    "compare.cardProfileTitle": "PP, rank, playcount, accuracy",
    "compare.cardProfileText": "Direct head-to-head comparison of visible profile values.",
    "compare.cardTop": "Top-200 analysis",
    "compare.cardTopTitle": "AR / OD / CS / BPM / stars",
    "compare.cardTopText": "Which map types, mods, and difficulty values a player tends to prefer.",
    "compare.cardPower": "Power chart",
    "compare.cardPowerTitle": "Radar-style stat comparison",
    "compare.cardPowerText": "Readable values for speed, aim, accuracy, consistency, and mod focus.",
    "compare.cardMatchups": "Map matchups",
    "compare.cardMatchupsTitle": "Shared maps",
    "compare.cardMatchupsText": "Shows who is ahead on the same difficulty and where the biggest gaps are.",
    "compare.vsPlaceholderTitle": "VS result area",
    "compare.vsPlaceholderText": "Loaded top passes, profile values, and the most important differences will appear here.",
    "compare.mapPlaceholderTitle": "Map Compare result area",
    "compare.mapPlaceholderText": "One player's loaded maps appear here with leaderboard-style values, details, and leaderboard links.",
    "compare.failed": "Comparison failed",
    "compare.loadDetail": "Please wait while the local database and reachable API data are checked.",
    "compare.noMods": "No mods found.",
    "compare.noScores": "No scores loaded.",
    "compare.noMaps": "No maps found for this selection.",
    "compare.vsLoading": "Loading VS comparison...",
    "compare.mapLoading": "Loading Map Compare...",
    "compare.mapLoadingDetail": "One player is loaded with up to 200 scores and then filtered by the selected map status.",
    "compare.needTwoPlayers": "Please enter both player names.",
    "compare.needOnePlayer": "Please enter a player name.",
    "compare.loadedMaps": "Loaded maps",
    "compare.shown": "shown",
    "compare.mapStatus": "Map status",
    "compare.rankWindow": "Map status",
    "compare.rankPrepared": "filtered",
    "compare.openLeaderboard": "Open leaderboard",
    "compare.position": "Position",
    "compare.totalScore": "Score",
    "compare.hitResults": "Hits",
    "compare.time": "Time",
    "compare.modA": "Mod distribution player A",
    "compare.modB": "Mod distribution player B",
    "compare.osuSigStdOnly": "osu-sig skills are only available for osu!standard.",
    "compare.metricProfilePp": "Profile PP",
    "compare.metricGlobalRank": "Global rank",
    "compare.metricTopplay": "Top play",
    "compare.metricAvgPp": "Average PP",
    "compare.metricAvgStars": "Average stars",
    "compare.metricAvgAcc": "Average accuracy",
    "compare.metricAvgBpm": "Average BPM",
    "compare.metricAvgAr": "Average AR",
    "compare.metricAvgOd": "Average OD",
    "compare.metricAvgCs": "Average CS",
    "compare.sigFullSkills": "Full with Skills",
    "compare.sigSkills": "Skills",
    "time.eyebrow": "Time Travel",
    "time.title": "Rewind score history",
    "time.description": "Estimates what your PP state could have looked like up to a selected date based on stored plays.",
    "time.setup": "Setup",
    "time.playerDate": "Player and date",
    "time.load": "Load history",
    "time.disclaimer": "Note: this view uses scores known locally or through the API today. Rank is a cautious reconstruction against the current data state, not the real historical global ranking. With many local scores, loading can take 8-10 minutes.",
    "time.timeline": "Timeline",
    "time.date": "Date",
    "time.sliderText": "After loading, you can rewind the known state day by day.",
    "time.placeholderTitle": "Time Travel result area",
    "time.placeholderText": "Load a player to see estimated PP, known plays, and the strongest scores up to the selected date.",
    "time.loading": "Loading Time Travel...",
    "time.noScores": "No stored scores found for this reconstruction.",
    "time.knownUntil": "Known scores up to",
    "time.estimatedPp": "Estimated weighted PP",
    "time.knownPlays": "Known plays",
    "time.uniqueMaps": "Best maps",
    "time.currentRank": "Current rank",
    "time.estimatedRank": "Estimated rank",
    "time.estimatedCountryRank": "Estimated country rank",
    "time.profileEstimate": "Reconstructed profile values",
    "time.scoreEstimate": "Local score values",
    "time.medals": "Medals",
    "time.profilePp": "PP",
    "time.playtime": "Total playtime",
    "time.rankChart": "Rank history",
    "time.rankedScore": "Ranked score",
    "time.hitAccuracy": "Accuracy",
    "time.playCount": "Play count",
    "time.totalScore": "Total score",
    "time.totalHits": "Total hits",
    "time.hitsPerPlay": "Hits per play",
    "time.maxCombo": "Highest combo",
    "time.replaysWatched": "Replays watched",
    "time.currentOnly": "current profile value",
    "time.actualCurrent": "current osu!api value",
    "time.estimated": "estimated",
    "time.sourceOsuApi": "Source: osu!api",
    "time.sourceOsuTrack": "Source: osu!track snapshot",
    "time.sourceLocal": "Source: local reconstruction",
    "time.sourceMixed": "Source: mixed",
    "time.sourcesTitle": "Data sources",
    "time.sourceApiShort": "osu!api",
    "time.sourceTrackShort": "osu!track",
    "time.sourceLocalShort": "local",
    "time.sourceMixedShort": "mixed",
    "time.sourceUnavailable": "inactive",
    "time.selectedSource": "Selected day",
    "time.bestPlay": "Best play by date",
    "time.topAtDate": "Strongest known plays up to this date",
    "time.estimateNote": "PP is restacked from known plays with the normal osu! weighting model. Other players are not historically reconstructed.",
    "skill.eyebrow": "Skill Tree",
    "skill.title": "osu! Skill Tree",
    "skill.description": "Builds a skill map from stored plays: aim, raw speed, speed control, reading, low AR/EZ, precision, rhythm, stamina, and consistency.",
    "skill.setup": "Setup",
    "skill.player": "Analyze player",
    "skill.load": "Load Skill Tree",
    "skill.starMin": "Min stars",
    "skill.starMax": "Max stars",
    "skill.disclaimer": "First beta: the tree uses stored score, mod, BPM, AR, OD, CS, star, accuracy, miss, and combo values. Exact cursor/replay movement becomes possible later after replay decoding is added.",
    "skill.placeholderTitle": "Skill Tree result area",
    "skill.placeholderText": "Load a player to see your strongest skill areas, matching maps, and training targets.",
    "skill.loading": "Loading Skill Tree...",
    "skill.noScores": "No stored plays found for the Skill Tree.",
    "skill.overview": "Skill overview",
    "skill.strongest": "Strongest skill",
    "skill.weakest": "Training target",
    "skill.maps": "Matching maps",
    "skill.recommendations": "Training targets",
    "skill.evidence": "Evidence",
    "skill.playCount": "analyzed plays",
    "skill.avgStars": "Average stars",
    "skill.avgBpm": "Average BPM",
    "skill.avgAccuracy": "Average accuracy",
    "skill.totalMisses": "Total misses",
    "skill.starRange": "Star range",
    "skill.starOverview": "Skill by star rating",
    "skill.noRangeScores": "No stored plays found in this star range.",
    "skill.scoreLabel": "Skill {value}/100",
    "skill.bestExample": "Best example",
    "skill.needsWork": "Where you often lose value",
    "skill.trainingPlanner": "Training planner",
    "skill.trainingSkill": "What do you want to practice?",
    "skill.goalType": "Goal type",
    "skill.goalPp": "Target PP",
    "skill.goalRank": "Target rank",
    "skill.goalPpOption": "PP goal",
    "skill.goalRankOption": "Rank goal",
    "skill.updatePlan": "Show plan",
    "skill.saveGoal": "Save goal",
    "skill.savedGoals": "Saved goals",
    "skill.targetMaps": "Target maps",
    "skill.prepMaps": "Prep maps",
    "skill.ready": "ready",
    "skill.needsPrep": "prep first",
    "skill.stepPrep": "1. Preparation",
    "skill.stepTarget": "2. Target play",
    "skill.stepPolish": "3. Stabilize",
    "skill.targetPlayTitle": "What kind of play your goal needs",
    "skill.targetPlayText": "Look for a run close to {pp}. Good candidates score high in the selected skill, have low misses, and are not too far above your current range.",
    "skill.rankTargetText": "Rank goal #{rank}: target maps are used as a PP direction. Exact rank thresholds move and can be improved later with external snapshots.",
    "skill.prepText": "First stabilize similar maps about 0.3 to 0.8 stars below the target.",
    "skill.targetText": "Then play the target maps closest to your target PP and selected skill.",
    "skill.polishText": "If prep is already 95%+ and at most 1-2 misses, stop going lower and grind the target map.",
    "skill.trainingSummary": "Plan summary",
    "skill.targetCount": "Target maps",
    "skill.prepCount": "Prep maps",
    "skill.readyCount": "ready",
    "skill.noTrainingMaps": "No matching training maps found in your stored plays.",
    "skill.noSavedGoals": "No saved training goals yet.",
    "skill.externalNote": "This beta uses local/stored plays. Unplayed external PP maps become visible once a stable osu-pps/API integration is available.",
    "skill.goalSaved": "Training goal saved.",
    "skill.ppProxyNote": "Rank goals are currently treated as a PP-oriented training direction because complete historical rank thresholds are not available.",
    "skill.aim": "Aim",
    "skill.speed": "Raw Speed",
    "skill.speedControl": "Speed Control",
    "skill.lowAr": "Low AR / EZ",
    "skill.reading": "Reading",
    "skill.precision": "Precision",
    "skill.rhythm": "Rhythm",
    "skill.stamina": "Stamina",
    "skill.consistency": "Consistency",
    "skill.aimHint": "high stars, CS, and jump/aim-heavy runs",
    "skill.speedHint": "effective BPM, DT/NC/Rate Adjust, and fast maps",
    "skill.speedControlHint": "how cleanly fast maps are held: accuracy, misses, and combo",
    "skill.lowArHint": "EZ, AR below 8.0, and slower visual reads",
    "skill.readingHint": "HD/FL, high AR, and visually demanding plays",
    "skill.precisionHint": "OD, accuracy, and small circle size",
    "skill.rhythmHint": "changing BPM, longer patterns, and timing stability",
    "skill.staminaHint": "long maps, high combo, and many objects",
    "skill.consistencyHint": "low misses, high accuracy, and stable passes",
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
    "label.topRangeTitle": "Top-200 plays in range",
    "label.topRangeHelp": "Shows only scores that are currently in the reconstructed PP top 200 of this profile.",
    "label.dateFrom": "From",
    "label.dateTo": "To",
    "label.timeFrom": "Time from",
    "label.timeTo": "Time to",
    "label.topCurrentProfile": "current profile top 200",
    "label.topInRange": "top plays in range",
    "label.topBestGain": "Best play",
    "label.topWeightedPp": "weighted PP in range",
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
    "label.ppSourceHypothetical": "hypothetical PP",
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
    "empty.noTopScores": "No top-200 plays found in this date range.",
    "empty.noTopSource": "Load a player first so the current profile top 200 can be matched.",
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

function formatPpExact(value) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? `${parsed.toFixed(2)}pp` : "0.00pp";
}

function formatStars(value) {
  return Number(value || 0) > 0 ? `${Number(value).toFixed(2)}*` : "-";
}

function formatFixed(value, digits = 2) {
  return Number(value || 0).toFixed(digits);
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

function berlinDayKeyFromValue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const getPart = (type) => parts.find((part) => part.type === type)?.value || "";
  const year = getPart("year");
  const month = getPart("month");
  const day = getPart("day");
  return year && month && day ? `${year}-${month}-${day}` : "";
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

function passPpValue(score) {
  const reason = unrankedScoreReason(score);
  if (reason) {
    const value = Number(score.unranked_calculated_pp || 0);
    return Number.isFinite(value) ? value : 0;
  }

  return scorePpValue(score);
}

function passPpTitle(score) {
  const reason = unrankedScoreReason(score);
  if (!reason) return ppSourceLabel(score);
  return passPpValue(score) > 0
    ? `${unrankedReasonLabel(reason)} - ${t("label.ppSourceHypothetical")}`
    : unrankedReasonLabel(reason);
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

function passScoresFromData(data) {
  if (Array.isArray(data?.passScores)) return data.passScores;
  return allScoresFromData(data);
}

function allCalendarScores() {
  return allScoresFromData(lastSearchData);
}

function findScoreByDomKey(key) {
  return [...(lastSearchData?.scores || []), ...passScoresFromData(lastSearchData), ...allCalendarScores(), ...compareDetailScores]
    .find((score) => scoreDomKey(score) === key);
}

function mapTriesForScore(score) {
  const mapKey = mapDomKey(score);
  return [...allCalendarScores(), ...compareDetailScores]
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

function bestModeMetrics(bestMode = "score", ppValue = scorePpValue) {
  if (bestMode === "pp") {
    return [ppValue, accuracyPercentValue, (score) => Number(score.score || 0), (score) => -missCount(score)];
  }

  if (bestMode === "acc") {
    return [accuracyPercentValue, (score) => -missCount(score), (score) => Number(score.score || 0), ppValue];
  }

  if (bestMode === "date") {
    return [scoreTimeValue, (score) => Number(score.score || 0), accuracyPercentValue, ppValue];
  }

  return [(score) => Number(score.score || 0), accuracyPercentValue, (score) => -missCount(score), ppValue];
}

function isBetterScoreForMode(next, current, bestMode = "score", ppValue = scorePpValue) {
  if (!current) return true;

  for (const metric of bestModeMetrics(bestMode, ppValue)) {
    const nextValue = Number(metric(next) || 0);
    const currentValue = Number(metric(current) || 0);
    if (nextValue !== currentValue) return nextValue > currentValue;
  }

  return scoreTimeValue(next) > scoreTimeValue(current);
}

function bestScorePerMapForDisplay(scores, bestMode = "score", ppValue = scorePpValue) {
  const best = new Map();

  for (const score of scores) {
    const key = mapDomKey(score);
    if (isBetterScoreForMode(score, best.get(key), bestMode, ppValue)) best.set(key, score);
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

function scoreDayKey(score) {
  return berlinDayKeyFromValue(score?.ended_at || score?.created_at || "");
}

function topDateBounds() {
  const today = todayDayKey();
  const fromDate = topDateFrom || today;
  const toDate = topDateTo || fromDate;
  const fromTime = normalizeTimeInput(topTimeFrom, "00:00");
  const toTime = normalizeTimeInput(topTimeTo, "23:59");
  const fromMs = dateTimeInputMs(fromDate, fromTime, "00:00");
  const toMs = dateTimeInputMs(toDate, toTime, "23:59");

  if (fromMs <= toMs) return { from: fromDate, to: toDate, fromTime, toTime, fromMs, toMs };
  return { from: toDate, to: fromDate, fromTime: toTime, toTime: fromTime, fromMs: toMs, toMs: fromMs };
}

function currentProfileTopScores(data) {
  const candidates = uniqueScores([
    ...(data?.scores || []),
    ...passScoresFromData(data),
    ...allScoresFromData(data),
  ]).filter((score) => {
    if (scorePpValue(score) <= 0) return false;
    return isRankedScoreForDisplay(score, false) || !score?.beatmap?.status;
  });

  return bestScorePerMapForDisplay(candidates, "pp", scorePpValue)
    .sort((a, b) => scorePpValue(b) - scorePpValue(a) || scoreTimeValue(b) - scoreTimeValue(a))
    .slice(0, 200)
    .map((score, index) => ({ ...score, pp_rank: index + 1 }));
}

function normalizeTimeInput(value, fallback) {
  return /^\d{2}:\d{2}$/.test(value || "") ? value : fallback;
}

function dateTimeInputMs(day, time, fallbackTime) {
  const safeTime = normalizeTimeInput(time, fallbackTime);
  const parsed = Date.parse(`${day}T${safeTime}:00`);
  return Number.isFinite(parsed) ? parsed : Date.parse(`${todayDayKey()}T${fallbackTime}:00`);
}

function scoreInTopDateRange(score, bounds) {
  const timestamp = scoreTimeValue(score);
  return Boolean(timestamp) && timestamp >= bounds.fromMs && timestamp <= bounds.toMs;
}

function renderTopStat(label, value) {
  return `
    <div class="top-stat">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderTopScores(data = null) {
  const hasData = Boolean(data);
  const bounds = topDateBounds();
  const { from, to, fromTime, toTime } = bounds;

  if (!topDateFrom) topDateFrom = from;
  if (!topDateTo) topDateTo = to;
  topTimeFrom = fromTime;
  topTimeTo = toTime;

  if (!hasData) {
    topScores.innerHTML = `<div class="empty-state">${escapeHtml(t("empty.noTopSource"))}</div>`;
    return;
  }

  const profileTop = currentProfileTopScores(data);
  const rangeScores = profileTop.filter((score) => scoreInTopDateRange(score, bounds));
  const bestPp = rangeScores.reduce((best, score) => Math.max(best, scorePpValue(score)), 0);
  const weightedPp = rangeScores.reduce((total, score) => total + scorePpValue(score) * Math.pow(0.95, Math.max(0, Number(score.pp_rank || 1) - 1)), 0);

  topScores.innerHTML = `
    <section class="top-range-panel">
      <div class="top-range-head">
        <div>
          <strong>${escapeHtml(t("label.topRangeTitle"))}</strong>
          <span>${escapeHtml(t("label.topRangeHelp"))}</span>
        </div>
        <div class="top-range-fields">
          <label>
            <span>${escapeHtml(t("label.dateFrom"))}</span>
            <input type="date" data-top-date-from value="${escapeHtml(from)}" />
          </label>
          <label>
            <span>${escapeHtml(t("label.timeFrom"))}</span>
            <input type="time" data-top-time-from value="${escapeHtml(fromTime)}" />
          </label>
          <label>
            <span>${escapeHtml(t("label.dateTo"))}</span>
            <input type="date" data-top-date-to value="${escapeHtml(to)}" />
          </label>
          <label>
            <span>${escapeHtml(t("label.timeTo"))}</span>
            <input type="time" data-top-time-to value="${escapeHtml(toTime)}" />
          </label>
          <button type="button" data-top-range="today">${escapeHtml(t("button.today"))}</button>
          <button type="button" data-top-range="apply">${escapeHtml(t("button.apply"))}</button>
        </div>
      </div>
      <div class="top-stat-grid">
        ${renderTopStat(t("label.topCurrentProfile"), formatNumber(profileTop.length))}
        ${renderTopStat(t("label.topInRange"), formatNumber(rangeScores.length))}
        ${renderTopStat(t("label.topBestGain"), formatPp(bestPp))}
        ${renderTopStat(t("label.topWeightedPp"), formatPp(weightedPp))}
      </div>
    </section>
    <div class="top-score-list">
      ${rangeScores.length
        ? rangeScores.map((score) => renderScore(score, data.meta?.mode || "osu")).join("")
        : `<div class="empty-state">${escapeHtml(t("empty.noTopScores"))}</div>`}
    </div>
  `;
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

function scoreHitStat(score, key) {
  const stats = score.statistics || {};
  return Number(stats[key] ?? stats[`count_${key}`] ?? 0) || 0;
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
  const preferOnlineDifficulty = score?.pp_source === "osu-api" || score?.pp_source === "huismetbenen-live";
  const baseStars = Number(
    preferOnlineDifficulty
      ? beatmap.difficulty_rating || beatmap.star_rating || beatmap.stars || beatmap.effective_difficulty_rating || beatmap.calculated_difficulty_rating || 0
      : beatmap.effective_difficulty_rating || beatmap.calculated_difficulty_rating || beatmap.difficulty_rating || beatmap.star_rating || beatmap.stars || 0
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

function isRankedScoreForDisplay(score, includeLoved = false) {
  if (unrankedScoreReason(score)) return false;
  const status = String(score?.beatmap?.status || "").toLowerCase();
  if (["ranked", "approved"].includes(status)) return true;
  if (includeLoved && status === "loved") return true;
  const ranked = Number(score?.beatmap?.ranked);
  if (!Number.isNaN(ranked)) return includeLoved ? [1, 2, 4].includes(ranked) : [1, 2].includes(ranked);
  return false;
}

function isLovedScoreForDisplay(score) {
  if (unrankedScoreReason(score)) return false;
  const status = String(score?.beatmap?.status || "").toLowerCase();
  if (status === "loved") return true;
  return Number(score?.beatmap?.ranked) === 4;
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

  startupSync.classList.toggle("hidden", document.body.dataset.activeSection !== "home");
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
      repo: latestUpdateInfo.repo ? t("update.repo", { repo: latestUpdateInfo.repo }) : "",
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
  params.set("includeUnrankedPasses", document.querySelector("#includeUnrankedPasses")?.checked ? "1" : "0");
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

function renderScore(score, mode, options = {}) {
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
  const passMode = Boolean(options.passMode);
  const ppValue = passMode ? passPpValue(score) : scorePpValue(score);
  const isUnrankedPassPp = passMode && Boolean(unrankedScoreReason(score)) && ppValue > 0;
  const ppTitle = passMode
    ? passPpTitle(score)
    : unrankedScoreReason(score)
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
        <div class="pp ${isUnrankedPassPp ? "pp-unranked" : ""}" title="${escapeHtml(ppTitle)}">${formatPp(ppValue)}</div>
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
  const allScores = hasData ? uniqueScores(passScoresFromData(data)) : [];
  const matchingScores = allScores.filter(scoreInPassStarRange);
  const bestMode = data?.meta?.bestMode || document.querySelector("#bestMode")?.value || "score";
  const bestMapScores = bestScorePerMapForDisplay(matchingScores, bestMode, passPpValue);
  const sort = data?.meta?.sort || document.querySelector("#sort")?.value || "date";
  const sortedScores = [...bestMapScores].sort((a, b) => {
    if (sort === "acc") return Number(b.accuracy || 0) - Number(a.accuracy || 0);
    if (sort === "score") return Number(b.score || 0) - Number(a.score || 0);
    if (sort === "pp") return passPpValue(b) - passPpValue(a) || scoreTimeValue(b) - scoreTimeValue(a);
    return scoreTimeValue(b) - scoreTimeValue(a);
  });
  const limit = Math.max(1, Number(data?.meta?.limit || document.querySelector("#limit")?.value || 100));
  const ppRankByScore = new Map(
    [...bestMapScores]
      .filter((score) => passPpValue(score) > 0)
      .sort((a, b) => passPpValue(b) - passPpValue(a) || scoreTimeValue(b) - scoreTimeValue(a))
      .map((score, index) => [scoreDomKey(score), index + 1])
  );
  const displayScores = sortedScores
    .slice(0, limit)
    .map((score) => ({
      ...score,
      pp_rank: ppRankByScore.get(scoreDomKey(score)) || null,
    }));
  const starValues = matchingScores.map(beatmapStarValue).filter((value) => value > 0);
  const bestPp = matchingScores.reduce((best, score) => Math.max(best, passPpValue(score)), 0);
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
        ? displayScores.map((score) => renderScore(score, data.meta.mode, { passMode: true })).join("")
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
  renderTopScores(data);
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
  renderTopScores();
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

function compareGameMode() {
  return compareMode?.value || "osu";
}

function mapCompareGameMode() {
  return mapCompareMode?.value || compareGameMode();
}

function compareParams(username, mode = compareGameMode(), options = {}) {
  const params = new URLSearchParams();
  params.set("username", username);
  params.set("type", "recent");
  params.set("mode", mode);
  params.set("sort", "pp");
  params.set("match", "contains");
  params.set("pages", "2");
  params.set("dateFilter", "all");
  params.set("rankMode", "none");
  params.set("rankFrom", "1");
  params.set("rankTo", "200");
  params.set("limit", "200");
  params.set("bestMode", "pp");
  params.set("improvementScope", "lastTry");
  params.set("mods", "");
  params.set("includeLazer", "1");
  params.set("useApiV2", "1");
  params.set("includeHuis", "1");
  params.set("recalculatePp", "1");
  params.set("bestPerMap", "1");
  params.set("passesOnly", "1");
  params.set("rankedOnly", "1");
  params.set("includeLoved", "1");
  params.set("includeUnrankedPasses", "0");
  for (const [key, value] of Object.entries(options)) {
    params.set(key, value);
  }
  return params;
}

async function fetchCompareData(username, mode = compareGameMode(), options = {}) {
  const response = await fetch(`/api/search?${compareParams(username, mode, options).toString()}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || t("compare.failed"));
  return data;
}

function compareOutput(mode = "vs") {
  return compareView?.querySelector(`[data-compare-placeholder="${mode}"]`);
}

function setCompareLoading(mode, message, detail = t("compare.loadDetail")) {
  const output = compareOutput(mode);
  if (!output) return;
  output.classList.remove("hidden");
  output.innerHTML = `
    <div>
      <strong>${escapeHtml(message)}</strong>
      <p>${escapeHtml(detail)}</p>
    </div>
  `;
}

function setCompareError(mode, error) {
  const output = compareOutput(mode);
  if (!output) return;
  output.classList.remove("hidden");
  output.innerHTML = `
    <div>
      <strong>${escapeHtml(t("compare.failed"))}</strong>
      <p>${escapeHtml(error.message || String(error))}</p>
    </div>
  `;
}

function beatmapNumber(score, keys) {
  const beatmap = score?.beatmap || {};
  for (const key of keys) {
    const value = Number(beatmap[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return 0;
}

function average(values) {
  const filtered = values.map(Number).filter((value) => Number.isFinite(value) && value > 0);
  return filtered.length ? filtered.reduce((total, value) => total + value, 0) / filtered.length : 0;
}

function topMods(scores, limit = 8) {
  const counts = new Map();
  for (const score of scores) {
    const mods = score.normalized_mods?.length ? score.normalized_mods : [{ acronym: "NM" }];
    for (const mod of mods) {
      const acronym = String(mod.acronym || mod || "NM").toUpperCase();
      counts.set(acronym, (counts.get(acronym) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
}

function compareSummary(data) {
  const scores = data.scores || [];
  const user = data.user || {};
  const stats = user.statistics || {};
  return {
    user,
    scores,
    count: scores.length,
    bestPp: scores.reduce((best, score) => Math.max(best, scorePpValue(score)), 0),
    avgPp: average(scores.map(scorePpValue)),
    avgStars: average(scores.map(beatmapStarValue)),
    avgAcc: average(scores.map(accuracyPercentValue)),
    avgAr: average(scores.map((score) => beatmapNumber(score, ["ar", "approach_rate"]))) || 0,
    avgOd: average(scores.map((score) => beatmapNumber(score, ["accuracy", "od", "overall_difficulty"]))) || 0,
    avgCs: average(scores.map((score) => beatmapNumber(score, ["cs", "circle_size"]))) || 0,
    topMods: topMods(scores),
    profilePp: Number(stats.pp || stats.pp_raw || 0),
    globalRank: Number(stats.global_rank || 0),
    playCount: Number(stats.play_count || 0),
    hitAccuracy: Number(stats.hit_accuracy || 0),
    avgBpm: average(scores.map((score) => effectiveBeatmapStats(score).bpm)),
  };
}

function renderCompareMetric(label, left, right, format = (value) => formatNumber(value)) {
  return `
    <div class="compare-metric-row">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(format(left))}</strong>
      <strong>${escapeHtml(format(right))}</strong>
    </div>
  `;
}

function osuSigMode(mode) {
  if (mode === "osu") return "std";
  if (mode === "fruits") return "catch";
  return mode;
}

function osuSigUrl(username, mode, type = "full") {
  const params = new URLSearchParams({
    user: username,
    mode,
    lang: currentLanguage === "de" ? "en" : currentLanguage,
    type,
  });
  return `/api/osu-sig?${params.toString()}`;
}

function remoteOsuSigUrl(username, mode, type = "full") {
  const params = new URLSearchParams({
    user: username,
    mode: osuSigMode(mode),
    lang: currentLanguage === "de" ? "en" : currentLanguage,
    hue: "333",
    animation: "false",
  });
  if (type === "skills") {
    return `https://osu-sig.s23.moe/skills?${params.toString()}`;
  }
  params.set("skills", "true");
  return `https://osu-sig.s23.moe/card?${params.toString()}`;
}

function sigUserKey(summary) {
  return String(summary?.user?.id || summary?.user?.username || "").trim();
}

function sigImageTag(summary, mode, type) {
  const username = summary?.user?.username || "";
  const userKey = sigUserKey(summary);
  const label = type === "skills" ? t("compare.sigSkills") : t("compare.sigFullSkills");
  const src = osuSigUrl(userKey, mode, type);
  const fallback = remoteOsuSigUrl(username || userKey, mode, type);
  return `
    <img
      class="compare-sig-image"
      src="${escapeHtml(src)}"
      data-src="${escapeHtml(src)}"
      data-fallback-src="${escapeHtml(fallback)}"
      data-retry="0"
      alt="${escapeHtml(username)} osu-sig ${escapeHtml(label)}"
      loading="eager"
      decoding="async"
    />
  `;
}

function renderSigCards(left, right, mode) {
  if (mode !== "osu") {
    return `
      <div class="compare-sig-note">
        <strong>${escapeHtml(t("compare.osuSigStdOnly"))}</strong>
      </div>
    `;
  }

  const users = [left, right];
  return `
    <div class="compare-signatures">
      ${users.map((summary) => {
        const username = summary?.user?.username || "-";
        return `
        <section>
          <div class="compare-sig-head">
            <strong>${escapeHtml(username || "-")}</strong>
            <a href="https://osu-sig.s23.moe" target="_blank" rel="noreferrer">osu-sig</a>
          </div>
          <small>${escapeHtml(t("compare.sigFullSkills"))}</small>
          ${sigImageTag(summary, mode, "full")}
          <small>${escapeHtml(t("compare.sigSkills"))}</small>
          ${sigImageTag(summary, mode, "skills")}
        </section>
      `;
      }).join("")}
    </div>
  `;
}

function ppMapsFieldValue(id) {
  return document.querySelector(`#${id}`)?.value.trim() || "";
}

const ppMapsPersistedFieldIds = [
  "ppMapsSong",
  "ppMapsPpMin",
  "ppMapsPpMax",
  "ppMapsLengthMin",
  "ppMapsLengthMax",
  "ppMapsBpmMin",
  "ppMapsBpmMax",
  "ppMapsStarsMin",
  "ppMapsStarsMax",
  "ppMapsPassMin",
  "ppMapsPassMax",
  "ppMapsAccMin",
  "ppMapsAccMax",
  "ppMapsMissMin",
  "ppMapsMissMax",
  "ppMapsPlayer",
  "ppMapsLimit",
  "ppMapsTopCount",
];

function savePpMapsSettings() {
  if (!ppMapsView) return;
  const fields = {};
  for (const id of ppMapsPersistedFieldIds) fields[id] = ppMapsFieldValue(id);
  const advanced = document.querySelector("#ppMapsAdvanced");
  const settings = {
    resultMode: ppMapsResultMode,
    mode: ppMapsMode?.value || "osu",
    fields,
    mods: Object.fromEntries(ppMapsModStates.entries()),
    advancedOpen: Boolean(advanced && !advanced.classList.contains("hidden")),
  };

  try {
    localStorage.setItem(ppMapsSettingsStorageKey, JSON.stringify(settings));
  } catch {
    // Browser storage can be unavailable in private/restricted contexts.
  }
}

function restorePpMapsSettings() {
  if (!ppMapsView) return;
  try {
    const settings = JSON.parse(localStorage.getItem(ppMapsSettingsStorageKey) || "null");
    if (!settings || typeof settings !== "object") return;

    if (["unplayed", "improvement", "account"].includes(settings.resultMode)) {
      ppMapsResultMode = settings.resultMode;
    }
    if (ppMapsMode && ["osu", "mania", "taiko", "fruits"].includes(settings.mode)) {
      ppMapsMode.value = settings.mode;
    }

    for (const [id, value] of Object.entries(settings.fields || {})) {
      const input = document.querySelector(`#${id}`);
      if (input) input.value = value;
    }

    ppMapsModStates.clear();
    for (const [mod, state] of Object.entries(settings.mods || {})) {
      if (["required", "excluded"].includes(state)) ppMapsModStates.set(mod, state);
    }

    document.querySelector("#ppMapsAdvanced")?.classList.toggle("hidden", !settings.advancedOpen);
    ppMapsMore?.setAttribute("aria-expanded", settings.advancedOpen ? "true" : "false");
  } catch {
    localStorage.removeItem(ppMapsSettingsStorageKey);
  }
}

function parsePpMapsDuration(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (raw.includes(":")) {
    const parts = raw.split(":").map((part) => Number(part.trim()));
    if (parts.length === 2 && parts.every((part) => Number.isFinite(part) && part >= 0)) {
      return String(Math.round(parts[0] * 60 + parts[1]));
    }
  }
  const seconds = Number(raw);
  return Number.isFinite(seconds) && seconds >= 0 ? String(seconds) : "";
}

function ppMapsModePath(mode) {
  if (mode === "fruits") return "fruits";
  if (mode === "mania") return "mania";
  if (mode === "taiko") return "taiko";
  return "osu";
}

function ppMapsPlayedBeatmapIds(data) {
  const scores = uniqueScores([
    ...(data?.scores || []),
    ...passScoresFromData(data),
    ...allScoresFromData(data),
  ]);
  return new Set(scores
    .map((score) => Number(score.beatmap_id || score.beatmap?.id || 0))
    .filter((id) => Number.isFinite(id) && id > 0));
}

function ppMapsKnownScoresByBeatmapId(data) {
  const byId = new Map();
  const scores = uniqueScores([
    ...(data?.scores || []),
    ...passScoresFromData(data),
    ...allScoresFromData(data),
  ]);
  for (const score of scores) {
    const id = Number(score.beatmap_id || score.beatmap?.id || 0);
    if (!Number.isFinite(id) || id <= 0) continue;
    const list = byId.get(id) || [];
    list.push(score);
    byId.set(id, list);
  }
  for (const [id, list] of byId.entries()) {
    byId.set(id, sortScoresForDisplay(list, "pp"));
  }
  return byId;
}

function ppMapsParams(limit = 300) {
  const params = new URLSearchParams();
  params.set("mode", ppMapsMode?.value || "osu");
  params.set("limit", String(limit));
  const requiredMods = [...ppMapsModStates.entries()]
    .filter(([, state]) => state === "required")
    .map(([mod]) => mod);
  const excludedMods = [...ppMapsModStates.entries()]
    .filter(([, state]) => state === "excluded")
    .map(([mod]) => mod);

  const fields = [
    ["song", ppMapsFieldValue("ppMapsSong")],
    ["ppMin", ppMapsFieldValue("ppMapsPpMin")],
    ["ppMax", ppMapsFieldValue("ppMapsPpMax")],
    ["bpmMin", ppMapsFieldValue("ppMapsBpmMin")],
    ["bpmMax", ppMapsFieldValue("ppMapsBpmMax")],
    ["starsMin", ppMapsFieldValue("ppMapsStarsMin")],
    ["starsMax", ppMapsFieldValue("ppMapsStarsMax")],
    ["passMin", ppMapsFieldValue("ppMapsPassMin")],
    ["passMax", ppMapsFieldValue("ppMapsPassMax")],
    ["lengthMin", parsePpMapsDuration(ppMapsFieldValue("ppMapsLengthMin"))],
    ["lengthMax", parsePpMapsDuration(ppMapsFieldValue("ppMapsLengthMax"))],
    ["requiredMods", requiredMods.join(",")],
    ["excludedMods", excludedMods.join(",")],
  ];

  for (const [key, value] of fields) {
    if (value) params.set(key, value);
  }

  return params;
}

function renderPpMapsMods() {
  if (!ppMapsModButtons) return;
  for (const button of ppMapsModButtons.querySelectorAll("button[data-ppmaps-mod]")) {
    const mod = button.dataset.ppmapsMod;
    const state = ppMapsModStates.get(mod) || "optional";
    const label = state === "required"
      ? `${mod}: ${currentLanguage === "de" ? "muss dabei sein" : "required"}`
      : state === "excluded"
        ? `${mod}: ${currentLanguage === "de" ? "darf nicht dabei sein" : "excluded"}`
        : `${mod}: ${currentLanguage === "de" ? "kann dabei sein" : "optional"}`;
    button.dataset.state = state;
    button.classList.toggle("active", state === "required");
    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
  }
}

function syncPpMapsModeRadios() {
  if (!ppMapsView || !ppMapsMode) return;
  for (const input of ppMapsView.querySelectorAll("input[name='ppMapsModeChoice']")) {
    input.checked = input.value === ppMapsMode.value;
  }
}

function syncPpMapsResultTabs() {
  if (!ppMapsView) return;
  ppMapsView.dataset.resultMode = ppMapsResultMode;
  for (const button of ppMapsView.querySelectorAll("button[data-ppmaps-view]")) {
    button.classList.toggle("active", button.dataset.ppmapsView === ppMapsResultMode);
  }
}

function setPpMapsLoading() {
  if (!ppMapsOutput) return;
  ppMapsOutput.classList.remove("hidden");
  ppMapsOutput.innerHTML = `
    <div>
      <strong>${escapeHtml(t("ppMaps.loading"))}</strong>
      <p>${escapeHtml(t("ppMaps.loadingDetail"))}</p>
    </div>
  `;
}

function setPpMapsError(error) {
  if (!ppMapsOutput) return;
  ppMapsOutput.classList.remove("hidden");
  ppMapsOutput.innerHTML = `
    <div class="error-box">
      <strong>${escapeHtml(t("ppMaps.failed"))}</strong>
      <span>${escapeHtml(error.message || String(error))}</span>
    </div>
  `;
}

function ppMapCoverUrl(map) {
  return map?.mapsetId ? `https://assets.ppy.sh/beatmaps/${map.mapsetId}/covers/list.jpg` : "";
}

function ppMapUrl(map) {
  return map?.beatmapId ? `https://osu.ppy.sh/beatmaps/${map.beatmapId}` : "https://osu.ppy.sh/beatmapsets";
}

function ppMapsSourceUrl() {
  return `https://osu-pps.com/#/${ppMapsModePath(ppMapsMode?.value || "osu")}/maps`;
}

function renderPpMapMods(map) {
  const mods = Array.isArray(map?.mods) && map.mods.length ? map.mods : ["NM"];
  return mods.map((mod) => `<span class="mod-badge" title="${escapeHtml(modNames[mod] || mod)}">${escapeHtml(mod)}</span>`).join("");
}

function ppMapEstimateRows(map) {
  const basePp = Number(map?.pp || 0);
  if (!Number.isFinite(basePp) || basePp <= 0) return [];
  return [95, 96, 97, 98, 99, 100].map((accuracy) => {
    const accFactor = Math.pow(accuracy / 99, 5.6);
    const fc = basePp * accFactor;
    const oneMiss = fc * 0.94;
    return { accuracy, fc, oneMiss };
  });
}

function renderPpMapEstimateTray(map) {
  const rows = ppMapEstimateRows(map);
  if (!rows.length) return "";
  return `
    <details class="ppmap-estimates">
      <summary aria-label="PP estimates">
        <span>PP</span>
      </summary>
      <div class="ppmap-estimate-panel">
        <strong>FC / 1 Miss</strong>
        <small>Estimate aus osu-pps 99%-Wert</small>
        <div class="ppmap-estimate-grid">
          ${rows.map((row) => `
            <span>${row.accuracy}%</span>
            <b>${formatPp(row.fc)}</b>
            <em>${formatPp(row.oneMiss)}</em>
          `).join("")}
        </div>
      </div>
    </details>
  `;
}

function ppMapsNumber(value) {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function ppMapsOptionalNumber(id) {
  const value = ppMapsFieldValue(id);
  if (!value) return null;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function ppMapsAccountTargetPp() {
  return ppMapsOptionalNumber("ppMapsPpMin") || 280;
}

function ppMapsAccountTopCount() {
  const value = ppMapsOptionalNumber("ppMapsTopCount") || 100;
  return Math.min(Math.max(Math.round(value), 1), 200);
}

function weightedPpFromValues(values) {
  return values.reduce((total, pp, index) => total + pp * Math.pow(0.95, index), 0);
}

function renderPpMapsAccountRow(score, index, simulatedPp, mode) {
  const beatmap = score.beatmap || {};
  const set = score.beatmapset || {};
  const artist = set.artist || beatmap.artist || t("label.unknownArtist");
  const title = set.title || beatmap.title || t("label.unknownMap");
  const version = beatmap.version || "Difficulty";
  const currentPp = scorePpValue(score);
  return `
    <article class="ppmaps-account-row">
      <div>
        <div class="ppmap-title-row">
          <span class="rank-badge">#${escapeHtml(formatNumber(index + 1))}</span>
          <a href="${escapeHtml(beatmapUrl(score))}" target="_blank" rel="noreferrer">${escapeHtml(artist)} - ${escapeHtml(title)}</a>
        </div>
        <p>${escapeHtml(version)}</p>
        <div class="ppmap-meta">
          <span>${escapeHtml(formatAccuracy(score.accuracy))}</span>
          <span>${escapeHtml(formatNumber(score.max_combo || 0))}x</span>
          <span>${escapeHtml(formatNumber(missCount(score)))} Miss</span>
          <a href="${escapeHtml(scoreUrl(score, mode))}" target="_blank" rel="noreferrer">${escapeHtml(scoreLinkLabel(score))}</a>
        </div>
      </div>
      <div class="ppmaps-account-delta">
        <strong>${escapeHtml(formatPpExact(currentPp))}</strong>
        <span>-></span>
        <strong>${escapeHtml(formatPpExact(simulatedPp))}</strong>
      </div>
    </article>
  `;
}

function renderPpMapsAccountSimulation(knownData) {
  if (!ppMapsOutput) return;
  const targetPp = ppMapsAccountTargetPp();
  const topCount = ppMapsAccountTopCount();
  const profileTop = currentProfileTopScores(knownData).slice(0, topCount);
  const currentValues = profileTop.map(scorePpValue);
  const rowSimulatedValues = currentValues.map((pp) => (pp > 0 && pp < targetPp ? targetPp : pp));
  const simulatedValues = [...rowSimulatedValues].sort((a, b) => b - a);
  const currentWeightedTop = weightedPpFromValues(currentValues);
  const simulatedWeightedTop = weightedPpFromValues(simulatedValues);
  const gain = Math.max(0, simulatedWeightedTop - currentWeightedTop);
  const profilePp = Number(knownData?.user?.statistics?.pp || knownData?.user?.statistics?.pp_raw || 0);
  const currentAccountPp = profilePp > 0 ? profilePp : currentWeightedTop;
  const simulatedAccountPp = currentAccountPp + gain;
  const replaced = currentValues.filter((pp) => pp > 0 && pp < targetPp).length;

  ppMapsOutput.classList.remove("hidden");
  ppMapsOutput.innerHTML = `
    <div class="ppmaps-results ppmaps-account-results">
      <div class="ppmaps-summary">
        <div>
          <span>${escapeHtml(t("ppMaps.accountResults"))}</span>
          <strong>${escapeHtml(formatNumber(profileTop.length))}</strong>
        </div>
        <div>
          <span>${escapeHtml(t("ppMaps.accountTarget"))}</span>
          <strong>${escapeHtml(formatPpExact(targetPp))}</strong>
        </div>
        <div>
          <span>${escapeHtml(t("ppMaps.accountReplaced"))}</span>
          <strong>${escapeHtml(formatNumber(replaced))}</strong>
        </div>
        <div>
          <span>${escapeHtml(t("ppMaps.accountGain"))}</span>
          <strong>+${escapeHtml(formatPpExact(gain))}</strong>
        </div>
      </div>
      <div class="ppmaps-account-grid">
        ${renderTopStat(t("ppMaps.accountCurrent"), formatPpExact(currentAccountPp))}
        ${renderTopStat(t("ppMaps.accountSimulated"), formatPpExact(simulatedAccountPp))}
        ${renderTopStat(t("ppMaps.accountGain"), `+${formatPpExact(gain)}`)}
        ${renderTopStat("Top-N", formatNumber(topCount))}
      </div>
      <p class="compare-muted">${escapeHtml(t("ppMaps.accountHelp"))}</p>
      ${profileTop.length
        ? `<div class="ppmaps-account-list">${profileTop.map((score, index) => renderPpMapsAccountRow(score, index, rowSimulatedValues[index], knownData?.meta?.mode || "osu")).join("")}</div>`
        : `<div class="compare-empty">${escapeHtml(t("ppMaps.noAccountSource"))}</div>`}
    </div>
  `;
}

function ppMapsImprovementMatchesLocalFilters(map) {
  const best = map?.knownBest;
  if (!best) return false;
  const acc = accuracyPercentValue(best);
  const misses = missCount(best);
  const accMin = ppMapsOptionalNumber("ppMapsAccMin");
  const accMax = ppMapsOptionalNumber("ppMapsAccMax");
  const missMin = ppMapsOptionalNumber("ppMapsMissMin");
  const missMax = ppMapsOptionalNumber("ppMapsMissMax");

  if (accMin !== null && acc < accMin) return false;
  if (accMax !== null && acc > accMax) return false;
  if (missMin !== null && misses < missMin) return false;
  if (missMax !== null && misses > missMax) return false;
  return true;
}

function ppMapsImprovementGain(map) {
  if (Number.isFinite(map?.requiredGain)) return map.requiredGain;
  const best = map?.knownBest;
  if (!best) return Number.POSITIVE_INFINITY;
  const currentPp = passPpValue(best) || scorePpValue(best);
  const targetPp = ppMapsNumber(map.pp);
  if (!Number.isFinite(targetPp) || targetPp <= 0) return Number.POSITIVE_INFINITY;
  const gain = targetPp - currentPp;
  return gain > 0 ? gain : Number.POSITIVE_INFINITY;
}

function ppMapsWithImprovement(map, knownBest) {
  if (!knownBest) return { ...map, knownBest: null, currentPp: 0, requiredGain: Number.POSITIVE_INFINITY };
  const currentPp = passPpValue(knownBest) || scorePpValue(knownBest);
  const targetPp = ppMapsNumber(map.pp);
  const rawGain = targetPp - currentPp;
  const requiredGain = Number.isFinite(rawGain) && rawGain > 0 ? rawGain : Number.POSITIVE_INFINITY;
  return { ...map, knownBest, currentPp, requiredGain };
}

function ppMapsImprovementHtml(map) {
  const best = map.knownBest;
  if (!best) return "";
  const currentPp = Number.isFinite(map.currentPp) ? map.currentPp : passPpValue(best) || scorePpValue(best);
  const gain = ppMapsImprovementGain(map);
  const acc = accuracyPercentValue(best);
  const misses = missCount(best);
  const isCloseBreak = acc >= 97 && misses <= 2 && Number.isFinite(gain);
  return `
    <div class="ppmap-improvement">
      <span>${escapeHtml(t("ppMaps.currentBest"))}</span>
      <strong>${escapeHtml(formatPp(currentPp))}</strong>
      <small>${escapeHtml(formatAccuracy(acc))} · ${escapeHtml(formatNumber(best.max_combo || 0))}x · ${escapeHtml(formatNumber(misses))} Miss</small>
      <b>${escapeHtml(t("ppMaps.gain"))}: ${escapeHtml(Number.isFinite(gain) ? `+${formatPp(gain)}` : "0.00pp")}</b>
      ${isCloseBreak ? `<em>${escapeHtml(t("ppMaps.sliderbreak"))}</em>` : ""}
    </div>
  `;
}

function renderPpMapCard(map, index) {
  const cover = ppMapCoverUrl(map);
  const coverHtml = cover
    ? `<img class="ppmap-cover" src="${escapeHtml(cover)}" alt="" loading="lazy" />`
    : '<div class="ppmap-cover cover-fallback"></div>';
  const title = `${map.artist || t("label.unknownArtist")} - ${map.title || t("label.unknownMap")}`;
  return `
    <article class="ppmap-card">
      ${coverHtml}
      <div class="ppmap-main">
        <div class="ppmap-title-row">
          <span class="rank-badge">#${formatNumber(index + 1)}</span>
          ${renderPpMapMods(map)}
          <a href="${escapeHtml(ppMapUrl(map))}" target="_blank" rel="noreferrer">${escapeHtml(title)}</a>
        </div>
        <p>${escapeHtml(map.version || "Difficulty")}</p>
        <div class="ppmap-meta">
          <span>${escapeHtml(formatStars(map.stars))}</span>
          <span>${escapeHtml(formatNumber(map.effectiveBpm || map.bpm || 0))} BPM</span>
          <span>${escapeHtml(formatDuration(map.length))}</span>
          <span>AR ${escapeHtml(formatFixed(map.ar, 2))}</span>
          <span>OD ${escapeHtml(formatFixed(map.od, 2))}</span>
          <span>CS ${escapeHtml(formatFixed(map.cs, 2))}</span>
        </div>
      </div>
      <div class="ppmap-side">
        <strong>${escapeHtml(formatPp(map.pp))}</strong>
        <small>${escapeHtml(t("ppMaps.passCount"))}: ${escapeHtml(formatNumber(map.passCount || 0))}</small>
        <small>${escapeHtml(t("ppMaps.farmValue"))}: ${escapeHtml(formatNumber(map.farmValue || 0))}</small>
        ${ppMapsImprovementHtml(map)}
        <a href="${escapeHtml(ppMapsSourceUrl())}" target="_blank" rel="noreferrer">${escapeHtml(t("ppMaps.openPps"))}</a>
      </div>
      ${renderPpMapEstimateTray(map)}
    </article>
  `;
}

function renderPpMapsResults(payload, knownData, knownError = null) {
  if (!ppMapsOutput) return;
  if (ppMapsResultMode === "account") {
    renderPpMapsAccountSimulation(knownData);
    return;
  }

  const playedIds = ppMapsPlayedBeatmapIds(knownData);
  const knownById = ppMapsKnownScoresByBeatmapId(knownData);
  const shownLimit = Math.min(Math.max(Number(ppMapsFieldValue("ppMapsLimit") || 100), 1), 300);
  const allMaps = payload.maps || [];
  const unplayed = allMaps.filter((map) => !playedIds.has(Number(map.beatmapId || 0)));
  const improvement = allMaps
    .filter((map) => playedIds.has(Number(map.beatmapId || 0)))
    .map((map) => ppMapsWithImprovement(map, knownById.get(Number(map.beatmapId || 0))?.[0] || null))
    .filter((map) => map.knownBest)
    .filter(ppMapsImprovementMatchesLocalFilters)
    .filter((map) => Number.isFinite(ppMapsImprovementGain(map)))
    .sort((a, b) =>
      ppMapsImprovementGain(a) - ppMapsImprovementGain(b) ||
      ppMapsNumber(a.pp) - ppMapsNumber(b.pp) ||
      scoreTimeValue(b.knownBest) - scoreTimeValue(a.knownBest)
    );
  const activeMaps = ppMapsResultMode === "improvement" ? improvement : unplayed;
  const maps = activeMaps.slice(0, shownLimit);
  const updated = payload.updatedAt ? formatDate(payload.updatedAt) : "-";
  const title = ppMapsResultMode === "improvement" ? t("ppMaps.improvementResults") : t("ppMaps.results");
  const emptyText = ppMapsResultMode === "improvement" ? t("ppMaps.noImprovementResults") : t("ppMaps.noResults");
  const knownLabel = ppMapsResultMode === "improvement" ? t("ppMaps.playedCandidates") : t("ppMaps.knownRemoved");

  ppMapsOutput.classList.remove("hidden");
  ppMapsOutput.innerHTML = `
    <div class="ppmaps-results">
      <div class="ppmaps-summary">
        <div>
          <span>${escapeHtml(title)}</span>
          <strong>${escapeHtml(formatNumber(maps.length))}</strong>
        </div>
        <div>
          <span>${escapeHtml(t("ppMaps.available"))}</span>
          <strong>${escapeHtml(formatNumber(payload.returned || payload.maps?.length || 0))}</strong>
        </div>
        <div>
          <span>${escapeHtml(knownLabel)}</span>
          <strong>${knownError ? escapeHtml(t("ppMaps.knownUnavailable")) : escapeHtml(formatNumber(improvement.length))}</strong>
        </div>
        <div>
          <span>${escapeHtml(t("ppMaps.sourceUpdated"))}</span>
          <strong>${escapeHtml(updated)}</strong>
        </div>
      </div>
      ${maps.length
        ? `<div class="ppmaps-list">${maps.map((map, index) => renderPpMapCard(map, index)).join("")}</div>`
        : `<div class="compare-empty">${escapeHtml(emptyText)}</div>`}
    </div>
  `;
}

async function runPpMapsSearch() {
  savePpMapsSettings();
  const username = ppMapsPlayer?.value.trim() || document.querySelector("#username")?.value.trim() || "";
  const mode = ppMapsMode?.value || "osu";
  setPpMapsLoading();
  ppMapsRun?.setAttribute("disabled", "disabled");

  try {
    if (ppMapsResultMode === "account") {
      let knownData = lastSearchData;
      let knownError = null;
      if (username) {
        try {
          knownData = await fetchCompareData(username, mode, {
            limit: "500",
            pages: "1",
            bestPerMap: "0",
            passesOnly: "1",
            rankedOnly: "0",
            includeLoved: "1",
            includeUnrankedPasses: "1",
            recalculatePp: "0",
          });
        } catch (error) {
          knownError = error;
        }
      }

      latestPpMapsPayload = null;
      latestPpMapsKnownData = knownData;
      latestPpMapsKnownError = knownError;
      if (knownError && !knownData) throw knownError;
      renderPpMapsAccountSimulation(knownData);
      return;
    }

    const params = ppMapsParams(300);
    const mapsResponse = await fetch(`/api/pp-maps?${params.toString()}`);
    const mapsPayload = await mapsResponse.json();
    if (!mapsResponse.ok) throw new Error(mapsPayload.error || t("ppMaps.failed"));

    let knownData = null;
    let knownError = null;
    if (username) {
      try {
        knownData = await fetchCompareData(username, mode, {
          limit: "500",
          pages: "1",
          bestPerMap: "0",
          passesOnly: "1",
          rankedOnly: "0",
          includeLoved: "1",
          includeUnrankedPasses: "1",
          recalculatePp: "0",
        });
      } catch (error) {
        knownError = error;
        knownData = lastSearchData;
      }
    } else if (lastSearchData) {
      knownData = lastSearchData;
    }

    latestPpMapsPayload = mapsPayload;
    latestPpMapsKnownData = knownData;
    latestPpMapsKnownError = knownError;
    renderPpMapsResults(mapsPayload, knownData, knownError);
  } catch (error) {
    setPpMapsError(error);
  } finally {
    ppMapsRun?.removeAttribute("disabled");
  }
}

function resetPpMaps() {
  localStorage.removeItem(ppMapsSettingsStorageKey);
  for (const id of [
    "ppMapsSong",
    "ppMapsPpMin",
    "ppMapsPpMax",
    "ppMapsBpmMin",
    "ppMapsBpmMax",
    "ppMapsStarsMin",
    "ppMapsStarsMax",
    "ppMapsPassMin",
    "ppMapsPassMax",
    "ppMapsAccMin",
    "ppMapsAccMax",
    "ppMapsMissMin",
    "ppMapsMissMax",
    "ppMapsLengthMin",
    "ppMapsLengthMax",
  ]) {
    const input = document.querySelector(`#${id}`);
    if (input) input.value = "";
  }
  const limit = document.querySelector("#ppMapsLimit");
  if (limit) limit.value = "100";
  const topCount = document.querySelector("#ppMapsTopCount");
  if (topCount) topCount.value = "100";
  ppMapsModStates.clear();
  ppMapsResultMode = "unplayed";
  latestPpMapsPayload = null;
  latestPpMapsKnownData = null;
  latestPpMapsKnownError = null;
  renderPpMapsMods();
  syncPpMapsResultTabs();
  syncPpMapsModeRadios();
  if (ppMapsOutput) {
    ppMapsOutput.innerHTML = `
      <div>
        <strong>${escapeHtml(t("ppMaps.placeholderTitle"))}</strong>
        <p>${escapeHtml(t("ppMaps.placeholderText"))}</p>
      </div>
    `;
  }
}

function renderModDistribution(summary) {
  const total = Math.max(1, summary.count);
  if (!summary.topMods.length) return `<div class="compare-empty">${escapeHtml(t("compare.noMods"))}</div>`;
  return `
    <div class="compare-mod-bars">
      ${summary.topMods.map(([mod, count]) => {
        const percent = Math.round((count / total) * 100);
        return `
          <div class="compare-mod-bar">
            <span>${escapeHtml(mod)}</span>
            <div><i style="width: ${percent}%"></i></div>
            <strong>${formatNumber(count)}x</strong>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function renderCompareScoreCard(score, mode, index) {
  const beatmap = score.beatmap || {};
  const set = score.beatmapset || {};
  const mapStats = effectiveBeatmapStats(score);
  const artist = set.artist || beatmap.artist || t("label.unknownArtist");
  const title = set.title || beatmap.title || t("label.unknownMap");
  const version = beatmap.version || "Difficulty";
  const cover = coverUrl(score);
  const coverHtml = cover
    ? `<img class="compare-score-cover" src="${escapeHtml(cover)}" alt="" loading="lazy" />`
    : '<div class="compare-score-cover cover-fallback"></div>';
  const ppValue = scorePpValue(score);
  const detailKey = scoreDomKey(score);

  return `
    <article class="compare-score-card" data-score-key="${escapeHtml(detailKey)}">
      ${coverHtml}
      <div class="compare-score-main">
        <div class="compare-score-title">
          <span class="pp-rank-badge">#${formatNumber(index + 1)}</span>
          <span class="rank-badge">${escapeHtml(score.rank || "")}</span>
          <a href="${escapeHtml(beatmapUrl(score))}" target="_blank" rel="noreferrer">${escapeHtml(artist)} - ${escapeHtml(title)}</a>
        </div>
        <small>${escapeHtml(version)}</small>
        <div class="mods">${renderMods(score)}</div>
        <div class="compare-score-meta">
          <span>${formatStars(mapStats.stars)}</span>
          <span>${Math.round(mapStats.bpm || 0) || "-"} BPM</span>
          <span>${formatDate(score.ended_at || score.created_at)}</span>
          <span>${formatNumber(score.max_combo)}x</span>
          <span>${missCount(score)} ${t("label.miss")}</span>
        </div>
        <div class="compare-score-actions">
          <a href="${escapeHtml(scoreUrl(score, mode))}" target="_blank" rel="noreferrer">${escapeHtml(scoreLinkLabel(score))}</a>
          <button class="detail-button" type="button" data-score-key="${escapeHtml(detailKey)}">${escapeHtml(t("button.details"))}</button>
        </div>
      </div>
      <div class="compare-score-side">
        <strong>${formatPp(ppValue)}</strong>
        <span>${formatAccuracy(score.accuracy)}</span>
      </div>
    </article>
  `;
}

function renderCompareScores(title, summary, mode) {
  const scores = summary.scores.slice(0, 200).map((score, index) => renderCompareScoreCard(score, mode, index)).join("");
  return `
    <section class="compare-score-list">
      <header>
        <span>${escapeHtml(title)}</span>
        <strong>${formatNumber(summary.scores.length)} scores</strong>
      </header>
      ${scores || `<div class="compare-empty">${escapeHtml(t("compare.noScores"))}</div>`}
    </section>
  `;
}

function resetCompareOutput(mode) {
  const output = compareOutput(mode);
  if (!output) return;
  output.innerHTML = mode === "maps"
    ? `
      <div>
        <strong>${escapeHtml(t("compare.mapPlaceholderTitle"))}</strong>
        <p>${escapeHtml(t("compare.mapPlaceholderText"))}</p>
      </div>
    `
    : `
      <div>
        <strong>${escapeHtml(t("compare.vsPlaceholderTitle"))}</strong>
        <p>${escapeHtml(t("compare.vsPlaceholderText"))}</p>
      </div>
    `;
}

function renderVsResults(leftData, rightData) {
  const left = compareSummary(leftData);
  const right = compareSummary(rightData);
  const output = compareOutput("vs");
  if (!output) return;
  const mode = leftData.meta?.mode || compareGameMode();
  compareDetailScores = [...left.scores, ...right.scores];

  output.innerHTML = `
    <div class="compare-results">
      <div class="compare-result-head">
        <div>
          <span>${escapeHtml(t("compare.playerA"))}</span>
          <strong>${escapeHtml(left.user.username || "-")}</strong>
        </div>
        <div>
          <span>${escapeHtml(t("compare.playerB"))}</span>
          <strong>${escapeHtml(right.user.username || "-")}</strong>
        </div>
      </div>
      <div class="compare-metrics">
        ${renderCompareMetric(t("compare.metricProfilePp"), left.profilePp, right.profilePp, (value) => value ? formatPp(value) : "-")}
        ${renderCompareMetric(t("compare.metricGlobalRank"), left.globalRank, right.globalRank, (value) => value ? `#${formatNumber(value)}` : "-")}
        ${renderCompareMetric(t("compare.metricTopplay"), left.bestPp, right.bestPp, formatPp)}
        ${renderCompareMetric(t("compare.metricAvgPp"), left.avgPp, right.avgPp, formatPp)}
        ${renderCompareMetric(t("compare.metricAvgStars"), left.avgStars, right.avgStars, formatStars)}
        ${renderCompareMetric(t("compare.metricAvgAcc"), left.avgAcc, right.avgAcc, (value) => `${value.toFixed(2)}%`)}
        ${renderCompareMetric(t("compare.metricAvgBpm"), left.avgBpm, right.avgBpm, (value) => value ? `${Math.round(value)} BPM` : "-")}
        ${renderCompareMetric(t("compare.metricAvgAr"), left.avgAr, right.avgAr, (value) => value ? value.toFixed(2) : "-")}
        ${renderCompareMetric(t("compare.metricAvgOd"), left.avgOd, right.avgOd, (value) => value ? value.toFixed(2) : "-")}
        ${renderCompareMetric(t("compare.metricAvgCs"), left.avgCs, right.avgCs, (value) => value ? value.toFixed(2) : "-")}
      </div>
      <div class="compare-mod-row">
        <div><span>${escapeHtml(t("compare.modA"))}</span>${renderModDistribution(left)}</div>
        <div><span>${escapeHtml(t("compare.modB"))}</span>${renderModDistribution(right)}</div>
      </div>
      ${renderSigCards(left, right, mode)}
      <div class="compare-score-columns">
        ${renderCompareScores(left.user.username || t("compare.playerA"), left, mode)}
        ${renderCompareScores(right.user.username || t("compare.playerB"), right, mode)}
      </div>
    </div>
  `;
}

function commonMapRows(leftScores, rightScores) {
  const rightByMap = new Map();
  for (const score of rightScores) {
    const key = mapDomKey(score);
    const current = rightByMap.get(key);
    if (!current || scorePpValue(score) > scorePpValue(current)) rightByMap.set(key, score);
  }

  return leftScores
    .map((leftScore) => ({ leftScore, rightScore: rightByMap.get(mapDomKey(leftScore)) }))
    .filter((row) => row.rightScore)
    .sort((a, b) => Math.abs(scorePpValue(b.leftScore) - scorePpValue(b.rightScore)) - Math.abs(scorePpValue(a.leftScore) - scorePpValue(a.rightScore)));
}

function renderMapCompareResults(data) {
  const output = compareOutput("maps");
  if (!output) return;

  const mode = data.meta?.mode || mapCompareGameMode();
  const scope = document.querySelector("#mapCompareScope")?.value || "both";
  const allRows = (data.scores || []).filter((score) => {
    if (scope === "ranked") return isRankedScoreForDisplay(score, false);
    if (scope === "loved") return isLovedScoreForDisplay(score);
    return isRankedScoreForDisplay(score, true);
  });
  const rows = allRows.slice(0, 200);
  compareDetailScores = rows;
  output.innerHTML = `
    <div class="compare-results">
      <div class="compare-result-head">
        <div>
          <span>${escapeHtml(t("compare.loadedMaps"))}</span>
          <strong>${formatNumber(rows.length)} ${escapeHtml(t("compare.shown"))}</strong>
        </div>
        <div>
          <span>${escapeHtml(t("compare.mapStatus"))}</span>
          <strong>${escapeHtml(t(`compare.scope${scope === "both" ? "Both" : scope[0].toUpperCase() + scope.slice(1)}`))}</strong>
        </div>
      </div>
      <div class="map-compare-table">
        ${
          rows.length
            ? rows.map((score, index) => {
                const set = score.beatmapset || {};
                const beatmap = score.beatmap || {};
                const ppValue = scorePpValue(score);
                const leaderboardUrl = beatmap?.id
                  ? `https://osu.ppy.sh/beatmaps/${encodeURIComponent(beatmap.id)}`
                  : beatmapUrl(score);
                const great = scoreHitStat(score, "great");
                const ok = scoreHitStat(score, "ok");
                const meh = scoreHitStat(score, "meh");
                const miss = missCount(score);
                return `
                  <div class="map-compare-row">
                    <div class="map-compare-title">
                      <span class="pp-rank-badge">#${formatNumber(index + 1)}</span>
                      <span class="rank-badge">${escapeHtml(score.rank || "")}</span>
                      <div>
                        <strong>${escapeHtml(set.artist || beatmap.artist || "?")} - ${escapeHtml(set.title || beatmap.title || "?")}</strong>
                        <small>${escapeHtml(beatmap.version || "Difficulty")}</small>
                      </div>
                    </div>
                    <div class="map-compare-stats">
                      <span><small>${escapeHtml(t("compare.totalScore"))}</small><b>${formatNumber(score.score)}</b></span>
                      <span><small>${escapeHtml(t("label.accuracy"))}</small><b>${formatAccuracy(score.accuracy)}</b></span>
                      <span><small>${escapeHtml(t("label.combo"))}</small><b>${formatNumber(score.max_combo)}x</b></span>
                      <span><small>${escapeHtml(t("compare.hitResults"))}</small><b>${formatNumber(great)} / ${formatNumber(ok)} / ${formatNumber(meh)} / ${formatNumber(miss)}</b></span>
                      <span><small>PP</small><b>${formatPp(ppValue)}</b></span>
                      <span><small>${escapeHtml(t("compare.time"))}</small><b>${formatDate(score.ended_at || score.created_at)}</b></span>
                      <span><small>Mods</small><b>${renderMods(score)}</b></span>
                    </div>
                    <div class="map-compare-actions">
                      <button class="detail-button" type="button" data-score-key="${escapeHtml(scoreDomKey(score))}">${escapeHtml(t("button.details"))}</button>
                      <a href="${escapeHtml(leaderboardUrl)}" target="_blank" rel="noreferrer">${escapeHtml(t("compare.openLeaderboard"))}</a>
                    </div>
                  </div>
                `;
              }).join("")
            : `<div class="compare-empty">${escapeHtml(t("compare.noMaps"))}</div>`
        }
      </div>
    </div>
  `;
}

function clampPercent(value) {
  return Math.max(0, Math.min(100, Number(value) || 0));
}

function scoreModsSet(score) {
  const mods = (score.normalized_mods?.length ? score.normalized_mods : score.mods || [])
    .map((mod) => String(mod.acronym || mod || "").toUpperCase())
    .filter(Boolean);
  return new Set(mods.length ? mods : ["NM"]);
}

function skillModObjects(score) {
  return score.normalized_mods?.length ? score.normalized_mods : score.mods || [];
}

function skillAdjustedDifficulty(score, kind) {
  const keysByKind = {
    ar: ["approach_rate", "ApproachRate", "ar", "AR"],
    od: ["overall_difficulty", "OverallDifficulty", "accuracy", "od", "OD"],
    cs: ["circle_size", "CircleSize", "cs", "CS"],
  };
  const baseKeys = kind === "od"
    ? ["accuracy", "od", "overall_difficulty"]
    : kind === "cs"
      ? ["cs", "circle_size"]
      : ["ar", "approach_rate"];
  let value = beatmapNumber(score, baseKeys);
  const mods = skillModObjects(score);

  for (const mod of mods) {
    const acronym = String(mod?.acronym || mod || "").toUpperCase();
    const adjusted = modSettingNumber(mod, keysByKind[kind] || []);
    if (adjusted !== null) value = adjusted;
    if (acronym === "HR") value *= kind === "cs" ? 1.3 : 1.4;
    if (acronym === "EZ") value *= 0.5;
  }

  return Math.max(0, Math.min(11, value || 0));
}

function skillScoreFeatures(score) {
  const stats = effectiveBeatmapStats(score);
  const mods = scoreModsSet(score);
  const acc = accuracyPercentValue(score);
  const misses = Number(missCount(score) || 0);
  const pp = passPpValue(score) || scorePpValue(score);
  const combo = scoreMaxComboValue(score);
  const length = Number(stats.length || 0);
  return {
    stats,
    mods,
    acc,
    misses,
    pp,
    combo,
    length,
    stars: Number(stats.stars || 0),
    bpm: Number(stats.bpm || 0),
    ar: skillAdjustedDifficulty(score, "ar"),
    od: skillAdjustedDifficulty(score, "od"),
    cs: skillAdjustedDifficulty(score, "cs"),
    hitTotal: scoreHitTotal(score),
  };
}

function skillCategoryValue(category, score) {
  const feature = skillScoreFeatures(score);
  const cleanBonus = Math.max(0, 1 - feature.misses / 18);
  const accBonus = Math.max(0, (feature.acc - 80) / 20);
  const ppBonus = Math.min(1, feature.pp / 450);
  const highStar = Math.min(1, feature.stars / 8.5);
  const modBonus = (mods) => mods.some((mod) => feature.mods.has(mod)) ? 1 : 0;
  const rawSpeed = clampPercent((Math.max(0, feature.bpm - 155) / 155 * 76) + (highStar * 16) + (feature.bpm >= 235 ? 8 : 0));
  const speedCleanliness = clampPercent((accBonus * 46) + (cleanBonus * 34) + (Math.min(1, feature.combo / 900) * 12) + (ppBonus * 8));
  const lowArLoad = Math.max(0, (8 - feature.ar) / 5);
  const ezBonus = modBonus(["EZ"]) ? 1 : 0;

  if (category.key === "aim") {
    return clampPercent((highStar * 42) + (Math.min(1, feature.cs / 5) * 18) + (ppBonus * 18) + (accBonus * 12) + (cleanBonus * 10));
  }
  if (category.key === "speed") {
    return rawSpeed;
  }
  if (category.key === "speedControl") {
    return clampPercent((rawSpeed * 0.45) + (speedCleanliness * 0.55));
  }
  if (category.key === "reading") {
    const highArLoad = feature.ar > 0 ? Math.max(0, (feature.ar - 8) / 2.7) : 0;
    return clampPercent((Math.min(1, highArLoad) * 28) + (modBonus(["HD", "FL", "BL", "HDHR", "HDDT"]) * 20) + (highStar * 20) + (accBonus * 16) + (cleanBonus * 16));
  }
  if (category.key === "lowAr") {
    if (feature.ar <= 0) return 0;
    if (lowArLoad <= 0 && !ezBonus) return 0;
    return clampPercent((Math.min(1, lowArLoad) * 38) + (ezBonus * 24) + (highStar * 12) + (accBonus * 14) + (cleanBonus * 12));
  }
  if (category.key === "precision") {
    return clampPercent((Math.min(1, feature.od / 10.5) * 34) + (Math.min(1, feature.cs / 5.2) * 18) + (accBonus * 24) + (cleanBonus * 14) + (ppBonus * 10));
  }
  if (category.key === "rhythm") {
    const rhythmBpm = feature.bpm >= 150 && feature.bpm <= 230 ? 1 : Math.max(0, 1 - Math.abs(feature.bpm - 190) / 160);
    return clampPercent((rhythmBpm * 28) + (highStar * 22) + (Math.min(1, feature.length / 210) * 14) + (accBonus * 20) + (cleanBonus * 16));
  }
  if (category.key === "stamina") {
    return clampPercent((Math.min(1, feature.length / 300) * 34) + (Math.min(1, feature.combo / 1200) * 18) + (highStar * 16) + (ppBonus * 14) + (cleanBonus * 18));
  }
  return clampPercent((accBonus * 38) + (cleanBonus * 34) + (Math.min(1, feature.combo / 900) * 12) + (ppBonus * 10) + (highStar * 6));
}

function skillCategories() {
  return [
    { key: "aim", label: t("skill.aim"), hint: t("skill.aimHint") },
    { key: "speed", label: t("skill.speed"), hint: t("skill.speedHint"), sampleSize: 10 },
    { key: "speedControl", label: t("skill.speedControl"), hint: t("skill.speedControlHint"), sampleSize: 15 },
    { key: "reading", label: t("skill.reading"), hint: t("skill.readingHint") },
    { key: "lowAr", label: t("skill.lowAr"), hint: t("skill.lowArHint"), sampleSize: 15 },
    { key: "precision", label: t("skill.precision"), hint: t("skill.precisionHint") },
    { key: "rhythm", label: t("skill.rhythm"), hint: t("skill.rhythmHint") },
    { key: "stamina", label: t("skill.stamina"), hint: t("skill.staminaHint") },
    { key: "consistency", label: t("skill.consistency"), hint: t("skill.consistencyHint") },
  ];
}

function scoreDifficultyLine(score) {
  const stats = effectiveBeatmapStats(score);
  const ar = skillAdjustedDifficulty(score, "ar");
  const od = skillAdjustedDifficulty(score, "od");
  const cs = skillAdjustedDifficulty(score, "cs");
  return `${formatStars(stats.stars)} - ${formatNumber(Math.round(stats.bpm))} BPM - AR ${formatFixed(ar, 2)} - OD ${formatFixed(od, 2)} - CS ${formatFixed(cs, 2)}`;
}

function analyzeSkillTree(scores) {
  const bestScores = bestScorePerMapForDisplay(scores, "pp").slice(0, 500);
  const categories = skillCategories().map((category) => {
    const ranked = bestScores
      .map((score) => ({ score, value: skillCategoryValue(category, score) }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value || passPpValue(b.score) - passPpValue(a.score));
    const top = ranked.slice(0, category.sampleSize || 25);
    return {
      ...category,
      value: Math.round(average(top.map((item) => item.value))),
      maps: ranked.slice(0, 5),
      training: ranked
        .filter((item) => missCount(item.score) > 0 || accuracyPercentValue(item.score) < 96)
        .slice(0, 4),
    };
  }).sort((a, b) => b.value - a.value);

  const categoryByKey = new Map(categories.map((category) => [category.key, category]));

  return {
    scores: bestScores,
    categories,
    categoryByKey,
    strongest: categories[0],
    weakest: [...categories].sort((a, b) => a.value - b.value)[0],
    avgStars: average(bestScores.map((score) => effectiveBeatmapStats(score).stars)),
    avgBpm: average(bestScores.map((score) => effectiveBeatmapStats(score).bpm)),
    avgAccuracy: average(bestScores.map(accuracyPercentValue)),
    totalMisses: bestScores.reduce((total, score) => total + missCount(score), 0),
  };
}

function starValue(score) {
  return Number(effectiveBeatmapStats(score).stars || 0);
}

function filterScoresByStars(scores, minStars, maxStars) {
  return scores.filter((score) => {
    const stars = starValue(score);
    return stars >= minStars && stars <= maxStars;
  });
}

function filterScoresByStarBucket(scores, minStars, maxStars, includeUpperBound = false) {
  return scores.filter((score) => {
    const stars = starValue(score);
    if (!Number.isFinite(stars) || stars <= 0) return false;
    return includeUpperBound
      ? stars >= minStars && stars <= maxStars
      : stars >= minStars && stars < maxStars;
  });
}

function readSkillStarRange() {
  const min = Number.parseFloat(String(skillStarMinInput?.value || "0").replace(",", "."));
  const max = Number.parseFloat(String(skillStarMaxInput?.value || "20").replace(",", "."));
  const minStars = Number.isFinite(min) ? Math.max(0, min) : 0;
  const maxStars = Number.isFinite(max) ? Math.max(minStars, max) : 20;
  return { minStars, maxStars };
}

function skillStarBuckets(scores) {
  const starValues = scores
    .map(starValue)
    .filter((stars) => Number.isFinite(stars) && stars > 0);
  const highestPassedStar = Math.max(2, Math.ceil(Math.max(...starValues, 0)));
  const buckets = [];
  for (let min = 1; min < highestPassedStar; min += 1) {
    buckets.push({
      label: `${formatFixed(min, 2)} - ${formatFixed(min + 1, 2)}*`,
      min,
      max: min + 1,
      includeUpperBound: min + 1 >= highestPassedStar,
    });
  }

  return buckets.map((bucket) => {
    const bucketScores = filterScoresByStarBucket(scores, bucket.min, bucket.max, bucket.includeUpperBound);
    if (!bucketScores.length) return { ...bucket, count: 0, value: 0, strongest: "-" };
    const analysis = analyzeSkillTree(bucketScores);
    return {
      ...bucket,
      count: bucketScores.length,
      value: Math.round(average(analysis.categories.map((category) => category.value))),
      strongest: analysis.strongest?.label || "-",
    };
  });
}

function skillMix(categoryByKey, parts) {
  const totalWeight = parts.reduce((total, [, weight]) => total + weight, 0) || 1;
  return Math.round(parts.reduce((total, [key, weight]) => {
    return total + ((categoryByKey.get(key)?.value || 0) * weight);
  }, 0) / totalWeight);
}

function skillGraphData(analysis) {
  const map = analysis.categoryByKey;
  const value = (key) => Math.round(map.get(key)?.value || 0);
  const nodes = [
    { key: "fundamentals", label: "fundamentals", sub: "circles / sliders", value: skillMix(map, [["consistency", 2], ["precision", 1]]), x: 50, y: 4, tone: "blue" },
    { key: "lowStars", label: "low star maps", sub: "base control", value: skillMix(map, [["consistency", 2], ["reading", 1]]), x: 50, y: 14, tone: "blue" },
    { key: "tapping", label: "tapping", sub: "click control", value: value("speedControl"), x: 7, y: 34, tone: "pink", major: true },
    { key: "finger", label: "finger control", sub: "clean inputs", value: skillMix(map, [["speedControl", 1], ["precision", 1], ["consistency", 1]]), x: 24, y: 34, tone: "pink" },
    { key: "tappingSpeed", label: "tapping speed", sub: "raw BPM", value: skillMix(map, [["speed", 4], ["speedControl", 1]]), x: 10, y: 86, tone: "pink" },
    { key: "tappingStamina", label: "tapping stamina", sub: "hold speed", value: skillMix(map, [["stamina", 2], ["speedControl", 1]]), x: 27, y: 72, tone: "pink" },
    { key: "streaming", label: "streaming", sub: "speed + rhythm", value: skillMix(map, [["speed", 1], ["speedControl", 1], ["rhythm", 1], ["stamina", 1]]), x: 38, y: 58, tone: "pink" },
    { key: "sightreading", label: "sightreading", sub: "first read", value: skillMix(map, [["reading", 2], ["lowAr", 1], ["consistency", 1]]), x: 36, y: 24, tone: "violet" },
    { key: "rhythm", label: "rhythm sense", sub: "timing feel", value: value("rhythm"), x: 36, y: 36, tone: "violet" },
    { key: "accuracy", label: "accuracy", sub: "hit precision", value: value("precision"), x: 36, y: 47, tone: "violet" },
    { key: "lowArReading", label: "low AR / EZ", sub: "slow reads", value: value("lowAr"), x: 51, y: 21, tone: "blue" },
    { key: "reading", label: "reading", sub: "visual load", value: value("reading"), x: 51, y: 31, tone: "blue", major: true },
    { key: "pattern", label: "pattern processing", sub: "recognition", value: skillMix(map, [["reading", 1], ["lowAr", 1], ["rhythm", 1], ["aim", 1]]), x: 51, y: 47, tone: "blue", major: true },
    { key: "consistency", label: "consistency", sub: "repeatable play", value: value("consistency"), x: 51, y: 62, tone: "cyan" },
    { key: "mindblock", label: "preventing mindblock", sub: "reset bad habits", value: skillMix(map, [["consistency", 2], ["reading", 1]]), x: 51, y: 72, tone: "cyan" },
    { key: "endurance", label: "endurance", sub: "long maps", value: value("stamina"), x: 51, y: 82, tone: "cyan" },
    { key: "speed", label: "raw speed", sub: "tempo ceiling", value: value("speed"), x: 51, y: 93, tone: "cream" },
    { key: "technique", label: "technique efficiency", sub: "low strain", value: skillMix(map, [["speedControl", 1], ["precision", 1], ["consistency", 1]]), x: 51, y: 101, tone: "cream" },
    { key: "readingSpeed", label: "reading speed", sub: "fast AR/BPM", value: skillMix(map, [["reading", 2], ["speed", 1]]), x: 51, y: 91, tone: "green" },
    { key: "focus", label: "focus", sub: "attention", value: skillMix(map, [["consistency", 2], ["precision", 1], ["reading", 1]]), x: 65, y: 62, tone: "green" },
    { key: "nerve", label: "nerve control", sub: "closeout", value: skillMix(map, [["consistency", 2], ["stamina", 1]]), x: 65, y: 73, tone: "green" },
    { key: "flowAim", label: "flow aim", sub: "moving aim", value: skillMix(map, [["aim", 1], ["rhythm", 1], ["stamina", 1]]), x: 65, y: 84, tone: "green" },
    { key: "sliderAim", label: "slider aim", sub: "slider control", value: skillMix(map, [["aim", 1], ["precision", 1], ["reading", 1]]), x: 66, y: 33, tone: "green" },
    { key: "cursor", label: "cursor control", sub: "movement", value: skillMix(map, [["aim", 2], ["precision", 1]]), x: 78, y: 43, tone: "yellow" },
    { key: "precision", label: "precision", sub: "exact aim", value: value("precision"), x: 82, y: 60, tone: "yellow" },
    { key: "aimStamina", label: "aim stamina", sub: "long aim", value: skillMix(map, [["aim", 1], ["stamina", 1]]), x: 82, y: 78, tone: "yellow" },
    { key: "aimSpeed", label: "aim speed", sub: "fast jumps", value: skillMix(map, [["aim", 2], ["speed", 1]]), x: 82, y: 92, tone: "yellow" },
    { key: "aim", label: "aim", sub: "main aim skill", value: value("aim"), x: 93, y: 43, tone: "yellow", major: true },
  ];

  const links = [
    ["fundamentals", "lowStars"], ["lowStars", "lowArReading"], ["lowArReading", "reading"], ["reading", "pattern"], ["pattern", "consistency"],
    ["tapping", "finger"], ["finger", "accuracy"], ["finger", "streaming"], ["finger", "tappingStamina"],
    ["tapping", "tappingSpeed"], ["tappingSpeed", "speed"], ["tappingStamina", "streaming"], ["tappingStamina", "endurance"],
    ["tappingStamina", "technique"], ["streaming", "readingSpeed"], ["streaming", "consistency"],
    ["sightreading", "rhythm"], ["rhythm", "sightreading"], ["rhythm", "accuracy"], ["rhythm", "pattern"], ["accuracy", "pattern"],
    ["reading", "sightreading"], ["reading", "rhythm"], ["reading", "readingSpeed"], ["lowArReading", "sightreading"], ["pattern", "sliderAim"], ["pattern", "focus"], ["pattern", "readingSpeed"],
    ["pattern", "mindblock"], ["consistency", "mindblock"], ["consistency", "endurance"], ["mindblock", "focus"],
    ["endurance", "nerve"], ["endurance", "aimStamina"], ["speed", "readingSpeed"], ["technique", "speed"], ["technique", "cursor"],
    ["focus", "nerve"], ["focus", "flowAim"], ["focus", "mindblock"], ["sliderAim", "cursor"], ["sliderAim", "aim"],
    ["cursor", "precision"], ["cursor", "aim"], ["cursor", "aimStamina"], ["precision", "aimStamina"], ["flowAim", "aimStamina"],
    ["aim", "cursor"], ["aim", "aimSpeed"], ["aimSpeed", "speed"], ["aimStamina", "aimSpeed"],
  ];

  return { nodes, links };
}

function renderSkillGraph(analysis) {
  const graph = skillGraphData(analysis);
  const nodeByKey = new Map(graph.nodes.map((node) => [node.key, node]));
  const line = ([fromKey, toKey]) => {
    const from = nodeByKey.get(fromKey);
    const to = nodeByKey.get(toKey);
    if (!from || !to) return "";
    return `<line x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" class="skill-link skill-link-${escapeHtml(from.tone)}" marker-end="url(#skillArrow-${escapeHtml(from.tone)})" />`;
  };
  return `
    <section class="skill-graph" aria-label="osu skill graph">
      <svg class="skill-links" viewBox="0 0 100 108" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          ${["pink", "violet", "blue", "cyan", "green", "yellow", "cream"].map((tone) => `
            <marker id="skillArrow-${tone}" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
              <path d="M0,0 L8,4 L0,8 Z" class="skill-arrow skill-arrow-${tone}" />
            </marker>
          `).join("")}
        </defs>
        ${graph.links.map(line).join("")}
      </svg>
      ${graph.nodes.map((node) => `
        <div class="skill-graph-node skill-tone-${escapeHtml(node.tone)}${node.major ? " major" : ""}" style="left: ${node.x}%; top: ${node.y}%">
          <strong>${escapeHtml(node.label)}</strong>
          <span>${escapeHtml(node.sub)}</span>
          <b>${escapeHtml(t("skill.scoreLabel", { value: formatNumber(node.value) }))}</b>
        </div>
      `).join("")}
    </section>
  `;
}

function renderSkillStarOverview(scores) {
  const buckets = skillStarBuckets(scores);
  return `
    <section class="skill-star-overview">
      <header>
        <span>${escapeHtml(t("skill.starOverview"))}</span>
      </header>
      <div class="skill-star-grid">
        ${buckets.map((bucket) => `
          <div class="skill-star-bucket${bucket.count ? "" : " empty"}">
            <strong>${escapeHtml(bucket.label)}</strong>
            <span>${bucket.count ? escapeHtml(t("skill.scoreLabel", { value: formatNumber(bucket.value) })) : "-"}</span>
            <small>${formatNumber(bucket.count)} ${escapeHtml(t("skill.playCount"))} - ${escapeHtml(bucket.strongest)}</small>
          </div>
        `).join("")}
      </div>
    </section>
  `;
}

function renderSkillMiniScore(item, mode) {
  const score = item.score;
  return `
    <button class="skill-map-row" type="button" data-score-key="${escapeHtml(scoreDomKey(score))}">
      <span>
        <strong>${escapeHtml(score.beatmapset?.title || score.beatmap?.title || "Unknown map")}</strong>
        <small>${escapeHtml(score.beatmap?.version || "")}</small>
      </span>
      <span>${formatPp(passPpValue(score) || scorePpValue(score))}</span>
      <span>${formatAccuracy(accuracyPercentValue(score))}</span>
      <span>${formatNumber(missCount(score))} Miss</span>
      <small>${escapeHtml(scoreDifficultyLine(score))}</small>
    </button>
  `;
}

const trainingGoalsStorageKey = "performance-finder-training-goals-v1";

function readTrainingGoals() {
  try {
    const parsed = JSON.parse(localStorage.getItem(trainingGoalsStorageKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeTrainingGoals(goals) {
  localStorage.setItem(trainingGoalsStorageKey, JSON.stringify(goals.slice(0, 80)));
}

function trainingGoalMatches(goal, username, mode) {
  return String(goal.username || "").toLowerCase() === String(username || "").toLowerCase() &&
    String(goal.mode || "osu") === String(mode || "osu");
}

function selectedTrainingCategory(analysis) {
  const key = skillTrainingState.skillKey === "weakest"
    ? analysis.weakest?.key
    : skillTrainingState.skillKey;
  return analysis.categories.find((category) => category.key === key) || analysis.weakest || analysis.categories[0];
}

function trainingReadiness(score) {
  const acc = accuracyPercentValue(score);
  const misses = missCount(score);
  if (acc >= 95 && misses <= 2) return "ready";
  return "needsPrep";
}

function trainingScoreLabel(score) {
  const pp = passPpValue(score) || scorePpValue(score);
  const stars = starValue(score);
  return `${formatPp(pp)} - ${formatAccuracy(accuracyPercentValue(score))} - ${formatStars(stars)} - ${formatNumber(missCount(score))} Miss`;
}

function buildTrainingPlan(analysis) {
  const category = selectedTrainingCategory(analysis);
  const all = analysis.scores || [];
  const targetPp = Number.parseFloat(String(skillTrainingState.targetPp || "").replace(",", "."));
  const usableTargetPp = Number.isFinite(targetPp) && targetPp > 0 ? targetPp : 0;
  const relevant = all
    .map((score) => ({
      score,
      value: skillCategoryValue(category, score),
      pp: passPpValue(score) || scorePpValue(score),
      stars: starValue(score),
    }))
    .filter((item) => item.value > 18 && item.stars > 0);

  const targetMaps = relevant
    .map((item) => {
      const targetDistance = usableTargetPp
        ? Math.max(0, 1 - Math.abs(item.pp - usableTargetPp) / Math.max(usableTargetPp, 1))
        : Math.min(1, item.pp / Math.max(analysis.strongest?.maps?.[0]?.score ? passPpValue(analysis.strongest.maps[0].score) : 300, 1));
      const weaknessSignal = (accuracyPercentValue(item.score) < 95 ? 12 : 0) + Math.min(14, missCount(item.score) * 2);
      const score = (item.value * 0.48) + (targetDistance * 34) + weaknessSignal + Math.min(10, item.stars);
      return { ...item, plannerScore: score };
    })
    .filter((item) => !usableTargetPp || item.pp >= usableTargetPp * 0.55 || item.value >= 70)
    .sort((a, b) => b.plannerScore - a.plannerScore || b.pp - a.pp)
    .slice(0, 5);

  const targetKeys = new Set(targetMaps.map((item) => mapDomKey(item.score)));
  const prepMaps = targetMaps.flatMap((target) => {
    const targetStars = target.stars;
    return relevant
      .filter((item) => {
        if (targetKeys.has(mapDomKey(item.score))) return false;
        return item.stars >= targetStars - 0.85 && item.stars <= targetStars - 0.25;
      })
      .sort((a, b) => {
        const readyA = trainingReadiness(a.score) === "ready" ? 1 : 0;
        const readyB = trainingReadiness(b.score) === "ready" ? 1 : 0;
        return readyA - readyB || b.value - a.value || b.pp - a.pp;
      })
      .slice(0, 3)
      .map((item) => ({ ...item, target }));
  });

  const uniquePrep = [];
  const seenPrep = new Set();
  for (const item of prepMaps) {
    const key = mapDomKey(item.score);
    if (seenPrep.has(key)) continue;
    seenPrep.add(key);
    uniquePrep.push(item);
  }

  return {
    category,
    targetMaps,
    prepMaps: uniquePrep.slice(0, 8),
    readyCount: uniquePrep.filter((item) => trainingReadiness(item.score) === "ready").length,
    needsPrepCount: uniquePrep.filter((item) => trainingReadiness(item.score) !== "ready").length,
    targetPp: usableTargetPp,
  };
}

function renderTrainingGoal(goal) {
  const goalValue = goal.goalType === "rank"
    ? `#${escapeHtml(goal.targetRank || "-")}`
    : formatPp(Number(goal.targetPp || 0));
  return `
    <div class="training-goal-pill">
      <span>${escapeHtml(goal.skillLabel || goal.skillKey || "-")}</span>
      <strong>${goalValue}</strong>
      <small>${escapeHtml(formatDate(goal.createdAt))}</small>
    </div>
  `;
}

function renderTrainingPlanScore(item, mode, index) {
  const state = trainingReadiness(item.score);
  return `
    <article class="training-plan-score">
      <div>
        <span class="training-status-pill ${state}">${escapeHtml(t(`skill.${state}`))}</span>
        <strong>${escapeHtml(item.score.beatmapset?.title || item.score.beatmap?.title || "Unknown map")}</strong>
        <small>${escapeHtml(item.score.beatmap?.version || "")}</small>
      </div>
      <div>
        <b>${escapeHtml(trainingScoreLabel(item.score))}</b>
        <small>${escapeHtml(scoreDifficultyLine(item.score))}</small>
      </div>
      <button class="detail-button" type="button" data-score-key="${escapeHtml(scoreDomKey(item.score))}">${escapeHtml(t("button.details"))}</button>
    </article>
  `;
}

function renderTrainingPathStep(numberLabel, title, text, items, mode) {
  return `
    <section class="training-step">
      <header>
        <span>${escapeHtml(numberLabel)}</span>
        <strong>${escapeHtml(title)}</strong>
        <p>${escapeHtml(text)}</p>
      </header>
      <div class="training-step-items">
        ${items.length
          ? items.map((item, index) => renderTrainingPlanScore(item, mode, index)).join("")
          : `<div class="compare-empty">${escapeHtml(t("skill.noTrainingMaps"))}</div>`}
      </div>
    </section>
  `;
}

function renderSkillTrainingPlanner(analysis, mode) {
  const username = skillPlayer?.value.trim() || "";
  const selected = selectedTrainingCategory(analysis);
  const plan = buildTrainingPlan(analysis);
  const goals = readTrainingGoals().filter((goal) => trainingGoalMatches(goal, username, mode));
  const targetPpLabel = plan.targetPp ? formatPp(plan.targetPp) : formatPp(Number(skillTrainingState.targetPp || 0));
  const goalText = skillTrainingState.goalType === "rank"
    ? t("skill.rankTargetText", { rank: skillTrainingState.targetRank || "-" })
    : t("skill.targetPlayText", { pp: targetPpLabel });
  const categories = [
    { key: "weakest", label: `${t("skill.weakest")}: ${analysis.weakest?.label || "-"}` },
    ...analysis.categories.map((category) => ({ key: category.key, label: category.label })),
  ];

  return `
    <section class="training-planner">
      <header>
        <div>
          <span>${escapeHtml(t("skill.trainingPlanner"))}</span>
          <strong>${escapeHtml(selected?.label || "-")}</strong>
        </div>
        <p>${escapeHtml(t("skill.externalNote"))}</p>
      </header>
      <div class="training-planner-controls">
        <label class="field">
          <span>${escapeHtml(t("skill.trainingSkill"))}</span>
          <select id="skillTrainingSkill">
            ${categories.map((category) => `
              <option value="${escapeHtml(category.key)}"${skillTrainingState.skillKey === category.key ? " selected" : ""}>${escapeHtml(category.label)}</option>
            `).join("")}
          </select>
        </label>
        <label class="field">
          <span>${escapeHtml(t("skill.goalType"))}</span>
          <select id="skillGoalType">
            <option value="pp"${skillTrainingState.goalType === "pp" ? " selected" : ""}>${escapeHtml(t("skill.goalPpOption"))}</option>
            <option value="rank"${skillTrainingState.goalType === "rank" ? " selected" : ""}>${escapeHtml(t("skill.goalRankOption"))}</option>
          </select>
        </label>
        <label class="field">
          <span>${escapeHtml(t("skill.goalPp"))}</span>
          <input id="skillGoalPp" type="number" min="0" step="1" value="${escapeHtml(skillTrainingState.targetPp)}" />
        </label>
        <label class="field">
          <span>${escapeHtml(t("skill.goalRank"))}</span>
          <input id="skillGoalRank" type="number" min="1" step="1" value="${escapeHtml(skillTrainingState.targetRank)}" />
        </label>
        <button class="ghost-button" type="button" data-skill-training="refresh">${escapeHtml(t("skill.updatePlan"))}</button>
        <button class="primary-button compact" type="button" data-skill-training="save">${escapeHtml(t("skill.saveGoal"))}</button>
      </div>
      ${skillTrainingState.goalType === "rank" ? `<p class="compare-muted">${escapeHtml(t("skill.ppProxyNote"))}</p>` : ""}
      <div class="training-plan-summary">
        ${renderPassStat(t("skill.targetCount"), formatNumber(plan.targetMaps.length))}
        ${renderPassStat(t("skill.prepCount"), formatNumber(plan.prepMaps.length))}
        ${renderPassStat(t("skill.readyCount"), formatNumber(plan.readyCount))}
        ${renderPassStat(t("skill.needsPrep"), formatNumber(plan.needsPrepCount))}
      </div>
      <article class="training-target-requirement">
        <span>${escapeHtml(t("skill.targetPlayTitle"))}</span>
        <strong>${escapeHtml(targetPpLabel)}</strong>
        <p>${escapeHtml(goalText)}</p>
      </article>
      <div class="training-path">
        ${renderTrainingPathStep(t("skill.stepPrep"), t("skill.prepMaps"), t("skill.prepText"), plan.prepMaps, mode)}
        ${renderTrainingPathStep(t("skill.stepTarget"), t("skill.targetMaps"), t("skill.targetText"), plan.targetMaps, mode)}
        ${renderTrainingPathStep(t("skill.stepPolish"), selected?.label || "-", t("skill.polishText"), plan.targetMaps.filter((item) => trainingReadiness(item.score) !== "ready").slice(0, 3), mode)}
      </div>
      <section class="training-goals-list">
        <h3>${escapeHtml(t("skill.savedGoals"))}</h3>
        ${goals.length ? goals.map(renderTrainingGoal).join("") : `<div class="compare-empty">${escapeHtml(t("skill.noSavedGoals"))}</div>`}
      </section>
    </section>
  `;
}

function renderSkillTreeResults(data, mode) {
  if (!skillTreeOutput) return;
  latestSkillTreeData = data;
  latestSkillTreeMode = mode;
  const scores = uniqueScores(data.passScores || data.scores || allScoresFromData(data))
    .filter((score) => scoreTimeValue(score) || scorePpValue(score) || passPpValue(score));
  if (!scores.length) {
    skillTreeOutput.innerHTML = `<div class="compare-empty">${escapeHtml(t("skill.noScores"))}</div>`;
    return;
  }

  const { minStars, maxStars } = readSkillStarRange();
  const rangeScores = filterScoresByStars(scores, minStars, maxStars);
  if (!rangeScores.length) {
    skillTreeOutput.innerHTML = `<div class="compare-empty">${escapeHtml(t("skill.noRangeScores"))}</div>`;
    return;
  }

  const analysis = analyzeSkillTree(rangeScores);
  compareDetailScores = uniqueScores([...compareDetailScores, ...analysis.scores]);
  skillTreeOutput.innerHTML = `
    <div class="skill-tree-results">
      <section class="skill-summary-grid">
        ${[
          [t("skill.playCount"), formatNumber(analysis.scores.length)],
          [t("skill.starRange"), `${formatFixed(minStars, 2)}* - ${formatFixed(maxStars, 2)}*`],
          [t("skill.strongest"), analysis.strongest?.label || "-"],
          [t("skill.weakest"), analysis.weakest?.label || "-"],
          [t("skill.avgStars"), `${formatFixed(analysis.avgStars, 2)}*`],
          [t("skill.avgBpm"), `${formatNumber(Math.round(analysis.avgBpm))} BPM`],
          [t("skill.avgAccuracy"), formatAccuracy(analysis.avgAccuracy)],
          [t("skill.totalMisses"), formatNumber(analysis.totalMisses)],
        ].map(([label, value]) => renderPassStat(label, value)).join("")}
      </section>

      ${renderSkillStarOverview(scores)}

      ${renderSkillGraph(analysis)}

      <section class="skill-tree-grid">
        ${analysis.categories.map((category) => `
          <article class="skill-node">
            <div class="skill-node-head">
              <span>${escapeHtml(category.label)}</span>
              <strong>${formatNumber(category.value)}/100</strong>
            </div>
            <div class="skill-node-bar"><i style="width: ${category.value}%"></i></div>
            <p>${escapeHtml(category.hint)}</p>
            <div class="skill-node-maps">
              <strong>${escapeHtml(t("skill.maps"))}</strong>
              ${category.maps.slice(0, 3).map((item) => renderSkillMiniScore(item, mode)).join("")}
            </div>
          </article>
        `).join("")}
      </section>

      ${renderSkillTrainingPlanner(analysis, mode)}
    </div>
  `;
}

async function runSkillTree() {
  const username = skillPlayer?.value.trim() || document.querySelector("#username")?.value.trim() || comparePlayerA?.value.trim() || "";
  if (!username) {
    if (skillTreeOutput) skillTreeOutput.innerHTML = `<div class="compare-empty">${escapeHtml(t("compare.needOnePlayer"))}</div>`;
    return;
  }

  if (skillTreeOutput) {
    skillTreeOutput.innerHTML = `
      <div class="compare-loading">
        <strong>${escapeHtml(t("skill.loading"))}</strong>
        <span>${escapeHtml(t("compare.loadDetail"))}</span>
      </div>
    `;
  }

  try {
    const mode = skillMode?.value || "osu";
    const data = await fetchCompareData(username, mode, {
      rankedOnly: "0",
      includeLoved: "1",
      includeUnrankedPasses: "1",
      bestPerMap: "0",
      limit: "500",
      rankMode: "none",
    });
    if (skillPlayer) skillPlayer.value = data.user?.username || username;
    renderSkillTreeResults(data, mode);
  } catch (error) {
    if (skillTreeOutput) {
      skillTreeOutput.innerHTML = `
        <div class="error-box">
          <strong>${escapeHtml(t("compare.failed"))}</strong>
          <span>${escapeHtml(error.message || String(error))}</span>
        </div>
      `;
    }
  }
}

async function runVsCompare() {
  const leftName = comparePlayerA?.value.trim() || "";
  const rightName = comparePlayerB?.value.trim() || "";
  if (!leftName || !rightName) {
    setCompareError("vs", new Error(t("compare.needTwoPlayers")));
    return;
  }

  setCompareLoading("vs", t("compare.vsLoading"));
  try {
    const mode = compareGameMode();
    const [leftData, rightData] = await Promise.all([fetchCompareData(leftName, mode), fetchCompareData(rightName, mode)]);
    renderVsResults(leftData, rightData);
  } catch (error) {
    setCompareError("vs", error);
  }
}

async function runMapCompare() {
  const leftName = mapComparePlayerA?.value.trim() || comparePlayerA?.value.trim() || "";
  if (!leftName) {
    setCompareError("maps", new Error(t("compare.needOnePlayer")));
    return;
  }

  setCompareLoading("maps", t("compare.mapLoading"), t("compare.mapLoadingDetail"));
  try {
    const scope = document.querySelector("#mapCompareScope")?.value || "both";
    const data = await fetchCompareData(leftName, mapCompareGameMode(), {
      rankedOnly: "1",
      includeLoved: scope === "ranked" ? "0" : "1",
    });
    renderMapCompareResults(data);
  } catch (error) {
    setCompareError("maps", error);
  }
}

function timeTravelDayFromScore(score) {
  const timestamp = scoreTimeValue(score);
  return timestamp ? berlinDayKeyFromValue(timestamp) : "";
}

function rawTimeTravelScoresUntil(dayKey) {
  if (!dayKey) return [];
  return timeTravelScores.filter((score) => {
    const scoreDay = timeTravelDayFromScore(score);
    return scoreDay && scoreDay <= dayKey;
  });
}

function knownScoresUntil(dayKey) {
  return bestScorePerMapForDisplay(
    rawTimeTravelScoresUntil(dayKey),
    "pp",
  ).sort((a, b) => scorePpValue(b) - scorePpValue(a) || scoreTimeValue(b) - scoreTimeValue(a));
}

function estimateWeightedPp(scores) {
  return scores.reduce((total, score, index) => total + scorePpValue(score) * Math.pow(0.95, index), 0);
}

function scoreTotalValue(score) {
  return Number(score?.score ?? score?.total_score ?? score?.legacy_total_score ?? 0) || 0;
}

function scoreMaxComboValue(score) {
  return Number(score?.max_combo ?? score?.maximum_combo ?? 0) || 0;
}

function scoreHitTotal(score) {
  const stats = score?.statistics || {};
  const osuKeys = ["great", "ok", "meh", "miss"];
  const legacyKeys = ["count_300", "count_100", "count_50", "count_miss"];
  const osuTotal = osuKeys.reduce((total, key) => total + (Number(stats[key]) || 0), 0);
  if (osuTotal > 0) return osuTotal;
  return legacyKeys.reduce((total, key) => total + (Number(stats[key]) || 0), 0);
}

function formatTimeTravelDuration(totalSeconds) {
  const seconds = Math.max(0, Math.round(Number(totalSeconds) || 0));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function estimateHistoricalRank(currentRank, currentPp, historicalPp) {
  const rank = Number(currentRank || 0);
  const current = Number(currentPp || 0);
  const historical = Number(historicalPp || 0);
  if (!rank || !current || !historical) return 0;
  if (historical >= current) return Math.max(1, Math.round(rank * (current / historical)));
  return Math.max(rank, Math.round(rank * Math.pow(current / historical, 2.15)));
}

function apiGradeCounts(stats) {
  const grades = stats?.grade_counts || {};
  return {
    XH: Number(grades.ssh || grades.XH || grades.xh || 0),
    X: Number(grades.ss || grades.X || grades.x || 0),
    SH: Number(grades.sh || grades.SH || 0),
    S: Number(grades.s || grades.S || 0),
    A: Number(grades.a || grades.A || 0),
  };
}

function localGradeCounts(scores) {
  return scores.reduce((counts, score) => {
    const rank = String(score.rank || "").toUpperCase();
    if (["XH", "X", "SH", "S", "A"].includes(rank)) counts[rank] = (counts[rank] || 0) + 1;
    return counts;
  }, { XH: 0, X: 0, SH: 0, S: 0, A: 0 });
}

function normalizeExternalGradeCounts(grades = {}) {
  return {
    XH: Number(grades.ssh ?? grades.XH ?? grades.xh ?? 0) || 0,
    X: Number(grades.ss ?? grades.X ?? grades.x ?? 0) || 0,
    SH: Number(grades.sh ?? grades.SH ?? 0) || 0,
    S: Number(grades.s ?? grades.S ?? 0) || 0,
    A: Number(grades.a ?? grades.A ?? 0) || 0,
  };
}

function isCurrentTimeTravelDay(dayKey) {
  return dayKey && (dayKey === todayDayKey() || dayKey === timeTravelDays[timeTravelDays.length - 1]);
}

function externalSnapshotUntil(dayKey) {
  if (!dayKey) return null;
  return [...timeTravelExternalSnapshots]
    .filter((snapshot) => {
      const snapshotDay = berlinDayKeyFromValue(snapshot.captured_at);
      return snapshotDay && snapshotDay <= dayKey;
    })
    .sort((a, b) => Date.parse(b.captured_at) - Date.parse(a.captured_at))[0] || null;
}

function externalSnapshotOnDay(dayKey) {
  if (!dayKey) return null;
  return timeTravelExternalSnapshots.find((snapshot) => berlinDayKeyFromValue(snapshot.captured_at) === dayKey) || null;
}

function sourceColor(source) {
  if (source === "api") return "#67d8f2";
  if (source === "osutrack") return "#ff4fa3";
  if (source === "mixed") return "#ffd166";
  return "#8aef6a";
}

function sourceShortLabel(source) {
  if (source === "api") return t("time.sourceApiShort");
  if (source === "osutrack") return t("time.sourceTrackShort");
  if (source === "mixed") return t("time.sourceMixedShort");
  return t("time.sourceLocalShort");
}

function timeTravelDaySource(dayKey) {
  const isCurrent = isCurrentTimeTravelDay(dayKey) && Number(timeTravelUser?.statistics?.pp || 0) > 0;
  if (isCurrent) return "api";
  const hasExternal = Boolean(externalSnapshotOnDay(dayKey));
  const hasLocal = timeTravelScores.some((score) => timeTravelDayFromScore(score) === dayKey);
  if (hasExternal && hasLocal) return "mixed";
  if (hasExternal) return "osutrack";
  return "local";
}

function renderTimeSourceLegend(selectedDay = "") {
  if (!timeSourceLegend) return;
  const available = {
    api: Boolean(timeTravelUser?.statistics?.pp),
    osutrack: timeTravelExternalSnapshots.length > 0,
    local: timeTravelScores.length > 0,
    mixed: timeTravelExternalSnapshots.length > 0 && timeTravelScores.length > 0,
  };
  const selectedSource = selectedDay ? timeTravelDaySource(selectedDay) : "";
  const sources = ["api", "osutrack", "local", "mixed"];
  timeSourceLegend.innerHTML = `
    <div class="time-source-title">${escapeHtml(t("time.sourcesTitle"))}</div>
    <div class="time-source-chips">
      ${sources.map((source) => `
        <span
          class="time-source-chip ${available[source] ? "is-active" : "is-inactive"} ${selectedSource === source ? "is-selected" : ""}"
          style="--source-color: ${sourceColor(source)}"
          title="${escapeHtml(available[source] ? timeSourceLabel(source) : t("time.sourceUnavailable"))}"
        >
          <b>${available[source] ? "✓" : "-"}</b>
          ${escapeHtml(sourceShortLabel(source))}
        </span>
      `).join("")}
    </div>
    ${selectedSource ? `
      <div class="time-source-selected" style="--source-color: ${sourceColor(selectedSource)}">
        <span>${escapeHtml(t("time.selectedSource"))}</span>
        <strong>${escapeHtml(sourceShortLabel(selectedSource))}</strong>
      </div>
    ` : ""}
  `;
}

function updateTimeSliderSourceTrack() {
  if (!timeSlider) return;
  if (timeTravelDays.length <= 1) {
    const color = timeTravelDays.length ? sourceColor(timeTravelDaySource(timeTravelDays[0])) : "rgba(148, 156, 176, 0.35)";
    timeSlider.style.setProperty("--timeline-source-track", color);
    return;
  }

  const lastIndex = timeTravelDays.length - 1;
  const stops = timeTravelDays.flatMap((day, index) => {
    const start = (index / lastIndex) * 100;
    const end = ((index + 1) / lastIndex) * 100;
    const color = sourceColor(timeTravelDaySource(day));
    return [`${color} ${start.toFixed(3)}%`, `${color} ${Math.min(100, end).toFixed(3)}%`];
  });
  timeSlider.style.setProperty("--timeline-source-track", `linear-gradient(90deg, ${stops.join(", ")})`);
}

function buildTimeTravelStats(rawScores, bestScores, weightedPp, dayKey) {
  const currentStats = timeTravelUser?.statistics || {};
  const currentPp = Number(currentStats.pp || currentStats.pp_raw || 0);
  const useCurrentProfile = isCurrentTimeTravelDay(dayKey) && currentPp > 0;
  const external = useCurrentProfile ? null : externalSnapshotUntil(dayKey);
  const externalPp = Number(external?.pp || 0);
  const accuracyValues = rawScores.map(accuracyPercentValue).filter((value) => Number.isFinite(value) && value > 0);
  const totalHits = rawScores.reduce((total, score) => total + scoreHitTotal(score), 0);
  const totalPlaytime = rawScores.reduce((total, score) => {
    const stats = effectiveBeatmapStats(score);
    return total + (Number(stats.length) || 0);
  }, 0);

  const reconstructed = {
    isCurrentProfile: false,
    externalSnapshot: external,
    displayPp: externalPp || weightedPp,
    globalRank: external?.global_rank || estimateHistoricalRank(currentStats.global_rank, currentPp, externalPp || weightedPp),
    countryRank: estimateHistoricalRank(currentStats.country_rank || currentStats.rank?.country, currentPp, externalPp || weightedPp),
    currentGlobalRank: Number(currentStats.global_rank || 0),
    currentCountryRank: Number(currentStats.country_rank || currentStats.rank?.country || 0),
    medals: null,
    weightedPp,
    totalPlaytime,
    gradeCounts: external?.grade_counts ? normalizeExternalGradeCounts(external.grade_counts) : localGradeCounts(rawScores),
    rankedScore: external?.ranked_score || bestScores.reduce((total, score) => total + scoreTotalValue(score), 0),
    hitAccuracy: external?.hit_accuracy || (accuracyValues.length ? average(accuracyValues) : 0),
    playCount: external?.play_count || rawScores.length,
    totalScore: external?.total_score || rawScores.reduce((total, score) => total + scoreTotalValue(score), 0),
    totalHits: external?.total_hits || totalHits,
    hitsPerPlay: (external?.total_hits && external?.play_count) ? external.total_hits / external.play_count : rawScores.length ? totalHits / rawScores.length : 0,
    maxCombo: external?.max_combo || rawScores.reduce((best, score) => Math.max(best, scoreMaxComboValue(score)), 0),
    replaysWatched: Number(currentStats.replays_watched_by_others || currentStats.replays_watched || 0),
    sources: {
      rank: external ? "osutrack" : "local",
      countryRank: external ? "mixed" : "local",
      pp: externalPp ? "osutrack" : "local",
      profile: external ? "osutrack" : "local",
      playtime: "local",
      score: external ? "osutrack" : "local",
      replay: "api-current",
    },
  };

  if (!useCurrentProfile) return reconstructed;

  return {
    ...reconstructed,
    isCurrentProfile: true,
    externalSnapshot: null,
    displayPp: currentPp,
    globalRank: Number(currentStats.global_rank || 0),
    countryRank: Number(currentStats.country_rank || currentStats.rank?.country || 0),
    weightedPp: currentPp,
    totalPlaytime: Number(currentStats.play_time || 0),
    gradeCounts: apiGradeCounts(currentStats),
    rankedScore: Number(currentStats.ranked_score || 0),
    hitAccuracy: Number(currentStats.hit_accuracy || (currentStats.accuracy ? currentStats.accuracy * 100 : 0)),
    playCount: Number(currentStats.play_count || 0),
    totalScore: Number(currentStats.total_score || 0),
    totalHits: Number(currentStats.total_hits || 0),
    hitsPerPlay: currentStats.play_count ? Number(currentStats.total_hits || 0) / Number(currentStats.play_count || 1) : 0,
    maxCombo: Number(currentStats.maximum_combo || 0),
    sources: {
      rank: "api",
      countryRank: "api",
      pp: "api",
      profile: "api",
      playtime: "api",
      score: "api",
      replay: "api-current",
    },
  };
}

function renderGradePills(counts) {
  return ["XH", "X", "SH", "S", "A"]
    .map((grade) => `
      <span class="time-grade-pill grade-${grade.toLowerCase()}">
        <b>${escapeHtml(grade === "XH" ? "SSH" : grade === "X" ? "SS" : grade)}</b>
        <small>${formatNumber(counts?.[grade] || 0)}</small>
      </span>
    `)
    .join("");
}

function renderTimeTravelMetric(label, value, note = "") {
  return `
    <div class="time-metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${note ? `<small>${escapeHtml(note)}</small>` : ""}
    </div>
  `;
}

function timeSourceLabel(source) {
  if (source === "api") return t("time.sourceOsuApi");
  if (source === "osutrack") return t("time.sourceOsuTrack");
  if (source === "mixed") return t("time.sourceMixed");
  return t("time.sourceLocal");
}

function renderTimeTravelProfile(stats) {
  const profileNote = stats.isCurrentProfile ? t("time.actualCurrent") : timeSourceLabel(stats.sources.profile);
  const scoreNote = stats.isCurrentProfile ? t("time.actualCurrent") : timeSourceLabel(stats.sources.score);
  const rankNote = stats.isCurrentProfile ? t("time.actualCurrent") : timeSourceLabel(stats.sources.rank);
  const countryRankNote = stats.isCurrentProfile ? t("time.actualCurrent") : timeSourceLabel(stats.sources.countryRank);
  const ppNote = stats.isCurrentProfile ? t("time.actualCurrent") : timeSourceLabel(stats.sources.pp);
  const playtimeNote = stats.isCurrentProfile ? t("time.actualCurrent") : timeSourceLabel(stats.sources.playtime);
  const rankValue = stats.globalRank ? `#${formatNumber(stats.globalRank)}` : "-";
  const countryRankValue = stats.countryRank ? `#${formatNumber(stats.countryRank)}` : "-";
  return `
    <section class="time-profile-panel">
      <div class="time-rank-panel">
        <h3>${escapeHtml(t("time.profileEstimate"))}</h3>
        ${renderTimeTravelMetric(t("time.estimatedRank"), rankValue, rankNote)}
        ${renderTimeTravelMetric(t("time.estimatedCountryRank"), countryRankValue, countryRankNote)}
        ${renderTimeTravelMetric(t("time.medals"), stats.medals === null ? "-" : formatNumber(stats.medals), t("time.currentOnly"))}
        ${renderTimeTravelMetric(t("time.profilePp"), formatPp(stats.displayPp), ppNote)}
        ${renderTimeTravelMetric(t("time.playtime"), formatTimeTravelDuration(stats.totalPlaytime), playtimeNote)}
        <div class="time-grade-row">${renderGradePills(stats.gradeCounts)}</div>
      </div>
      <div class="time-score-panel">
        <h3>${escapeHtml(t("time.scoreEstimate"))}</h3>
        ${renderTimeTravelMetric(t("time.rankedScore"), formatNumber(stats.rankedScore), scoreNote)}
        ${renderTimeTravelMetric(t("time.hitAccuracy"), stats.hitAccuracy ? formatAccuracy(stats.hitAccuracy) : "-", scoreNote)}
        ${renderTimeTravelMetric(t("time.playCount"), formatNumber(stats.playCount), scoreNote)}
        ${renderTimeTravelMetric(t("time.totalScore"), formatNumber(stats.totalScore), scoreNote)}
        ${renderTimeTravelMetric(t("time.totalHits"), formatNumber(stats.totalHits), scoreNote)}
        ${renderTimeTravelMetric(t("time.hitsPerPlay"), formatNumber(Math.round(stats.hitsPerPlay)), scoreNote)}
        ${renderTimeTravelMetric(t("time.maxCombo"), stats.maxCombo ? `${formatNumber(stats.maxCombo)}x` : "-", scoreNote)}
        ${renderTimeTravelMetric(t("time.replaysWatched"), formatNumber(stats.replaysWatched), t("time.currentOnly"))}
      </div>
    </section>
  `;
}

function setTimeTravelDate(dayKey) {
  if (!dayKey || !timeTravelDays.length) return;
  const index = timeTravelDays.indexOf(dayKey);
  const clampedIndex = index >= 0 ? index : timeTravelDays.findLastIndex((day) => day <= dayKey);
  const nextIndex = Math.max(0, Math.min(timeTravelDays.length - 1, clampedIndex));
  const nextDay = timeTravelDays[nextIndex];
  if (timeDate) timeDate.value = nextDay;
  if (timeSlider) timeSlider.value = String(nextIndex);
  if (timeSelectedDate) timeSelectedDate.textContent = formatDayKey(nextDay);
  renderTimeSourceLegend(nextDay);
  renderTimeTravelResults(nextDay);
}

function renderTimeTravelResults(dayKey) {
  if (!timeTravelOutput) return;
  const rawScores = rawTimeTravelScoresUntil(dayKey);
  const scores = knownScoresUntil(dayKey);
  const weightedPp = estimateWeightedPp(scores);
  const best = scores[0];
  const rebuiltStats = buildTimeTravelStats(rawScores, scores, weightedPp, dayKey);
  compareDetailScores = uniqueScores([...compareDetailScores, ...scores]);

  if (!scores.length && !rebuiltStats.externalSnapshot) {
    timeTravelOutput.innerHTML = `<div class="compare-empty">${escapeHtml(t("time.noScores"))}</div>`;
    return;
  }

  timeTravelOutput.innerHTML = `
    <div class="compare-results">
      <div class="compare-result-head time-result-head">
        <div>
          <span>${escapeHtml(t("time.knownUntil"))}</span>
          <strong>${escapeHtml(formatDayKey(dayKey))}</strong>
        </div>
        <div>
          <span>${escapeHtml(rebuiltStats.isCurrentProfile ? t("time.profilePp") : t("time.estimatedPp"))}</span>
          <strong>${formatPp(rebuiltStats.displayPp)}</strong>
        </div>
        <div>
          <span>${escapeHtml(t("time.knownPlays"))}</span>
          <strong>${formatNumber(rawScores.length)}</strong>
        </div>
        <div>
          <span>${escapeHtml(t("time.uniqueMaps"))}</span>
          <strong>${formatNumber(scores.length)}</strong>
        </div>
        <div>
          <span>${escapeHtml(rebuiltStats.isCurrentProfile ? t("time.currentRank") : t("time.estimatedRank"))}</span>
          <strong>${rebuiltStats.globalRank ? `#${formatNumber(rebuiltStats.globalRank)}` : "-"}</strong>
        </div>
      </div>
      <div class="compare-result-head">
        <div>
          <span>${escapeHtml(t("time.bestPlay"))}</span>
          <strong>${best ? formatPp(scorePpValue(best)) : "-"}</strong>
        </div>
        <div>
          <span>${escapeHtml(t("time.estimateNote"))}</span>
          <strong>${escapeHtml(timeTravelUser?.username || "-")}</strong>
        </div>
      </div>
      ${renderTimeTravelProfile(rebuiltStats)}
      <section class="compare-score-list time-travel-list">
        <header>
          <span>${escapeHtml(t("time.topAtDate"))}</span>
          <strong>${formatNumber(scores.length)}</strong>
        </header>
        ${scores.length ? scores.map((score, index) => renderCompareScoreCard(score, timeMode?.value || "osu", index)).join("") : `<div class="compare-empty">${escapeHtml(t("time.noScores"))}</div>`}
      </section>
    </div>
  `;
}

async function runTimeTravel() {
  const username = timePlayer?.value.trim() || document.querySelector("#username")?.value.trim() || comparePlayerA?.value.trim() || "";
  if (!username) {
    if (timeTravelOutput) timeTravelOutput.innerHTML = `<div class="compare-empty">${escapeHtml(t("compare.needOnePlayer"))}</div>`;
    return;
  }

  if (timeTravelOutput) {
    timeTravelOutput.innerHTML = `
      <div class="compare-loading">
        <strong>${escapeHtml(t("time.loading"))}</strong>
        <span>${escapeHtml(t("compare.loadDetail"))}</span>
      </div>
    `;
  }

  try {
    const data = await fetchCompareData(username, timeMode?.value || "osu", {
      rankedOnly: "0",
      includeLoved: "1",
      includeUnrankedPasses: "1",
      bestPerMap: "0",
      limit: "500",
      rankMode: "none",
      timeTravel: "1",
    });
    timeTravelUser = data.user || null;
    timeTravelExternalSnapshots = data.timeSources?.osutrack?.scores || [];
    timeTravelScores = uniqueScores(data.passScores || data.scores || [])
      .filter((score) => scoreTimeValue(score))
      .sort((a, b) => scoreTimeValue(a) - scoreTimeValue(b));
    timeTravelDays = [...new Set([
      ...timeTravelScores.map(timeTravelDayFromScore).filter(Boolean),
      ...timeTravelExternalSnapshots.map((snapshot) => berlinDayKeyFromValue(snapshot.captured_at)).filter(Boolean),
    ])].sort();

    if (!timeTravelDays.length) {
      if (timeTravelOutput) timeTravelOutput.innerHTML = `<div class="compare-empty">${escapeHtml(t("time.noScores"))}</div>`;
      return;
    }

    if (timePlayer) timePlayer.value = data.user?.username || username;
    if (timeDate) {
      timeDate.min = timeTravelDays[0];
      timeDate.max = timeTravelDays[timeTravelDays.length - 1];
    }
    if (timeSlider) {
      timeSlider.min = "0";
      timeSlider.max = String(timeTravelDays.length - 1);
      timeSlider.disabled = false;
    }
    updateTimeSliderSourceTrack();
    setTimeTravelDate(timeTravelDays[timeTravelDays.length - 1]);
  } catch (error) {
    if (timeTravelOutput) {
      timeTravelOutput.innerHTML = `
        <div class="error-box">
          <strong>${escapeHtml(t("compare.failed"))}</strong>
          <span>${escapeHtml(error.message || String(error))}</span>
        </div>
      `;
    }
  }
}

function setMenuOpen(open) {
  document.body.classList.toggle("menu-open", open);
  menuToggle?.setAttribute("aria-expanded", open ? "true" : "false");
}

function setActiveSection(section) {
  const nextSection = section === "compare"
    ? "compare"
    : section === "time"
      ? "time"
      : section === "skillTree"
        ? "skillTree"
        : section === "ppMaps"
          ? "ppMaps"
          : "home";
  document.body.dataset.activeSection = nextSection;
  compareView?.classList.toggle("hidden", nextSection !== "compare");
  timeTravelView?.classList.toggle("hidden", nextSection !== "time");
  skillTreeView?.classList.toggle("hidden", nextSection !== "skillTree");
  ppMapsView?.classList.toggle("hidden", nextSection !== "ppMaps");

  const showHome = nextSection === "home";
  form.classList.toggle("hidden", !showHome);
  document.querySelector(".notice")?.classList.toggle("hidden", !showHome);
  startupSync.classList.toggle("hidden", !showHome || !latestStartupSync);
  summary.classList.toggle("hidden", !showHome || !lastSearchData);
  viewTabs.classList.toggle("hidden", !showHome);
  results.classList.toggle("hidden", !showHome || activeView !== "scores");
  passes.classList.toggle("hidden", !showHome || activeView !== "passes");
  topScores?.classList.toggle("hidden", !showHome || activeView !== "top");
  improvements.classList.toggle("hidden", !showHome || activeView !== "improvements");
  calendar.classList.toggle("hidden", !showHome || activeView !== "calendar");
}

menuToggle?.addEventListener("click", () => setMenuOpen(!document.body.classList.contains("menu-open")));
menuClose?.addEventListener("click", () => setMenuOpen(false));
menuBackdrop?.addEventListener("click", () => setMenuOpen(false));

sideMenu?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-section]");
  if (!button) return;

  for (const item of sideMenu.querySelectorAll("[data-section]")) {
    item.classList.toggle("active", item === button);
  }

  if (button.dataset.section === "time") {
    if (timePlayer && !timePlayer.value) timePlayer.value = document.querySelector("#username")?.value.trim() || comparePlayerA?.value.trim() || "";
    if (timeMode) timeMode.value = compareMode?.value || document.querySelector("#mode")?.value || "osu";
  }

  if (button.dataset.section === "skillTree") {
    if (skillPlayer && !skillPlayer.value) skillPlayer.value = document.querySelector("#username")?.value.trim() || comparePlayerA?.value.trim() || timePlayer?.value.trim() || "";
    if (skillMode) skillMode.value = document.querySelector("#mode")?.value || compareMode?.value || timeMode?.value || "osu";
  }

  if (button.dataset.section === "ppMaps") {
    if (ppMapsPlayer && !ppMapsPlayer.value) ppMapsPlayer.value = document.querySelector("#username")?.value.trim() || comparePlayerA?.value.trim() || skillPlayer?.value.trim() || timePlayer?.value.trim() || "";
    if (ppMapsMode) ppMapsMode.value = document.querySelector("#mode")?.value || compareMode?.value || skillMode?.value || timeMode?.value || "osu";
    syncPpMapsModeRadios();
  }

  setActiveSection(button.dataset.section);
  setMenuOpen(false);
});

compareView?.addEventListener("click", (event) => {
  const detailButton = event.target.closest("button[data-score-key]");
  if (detailButton) {
    renderMapDetails(detailButton.dataset.scoreKey);
    return;
  }

  if (event.target.closest("#compareRun")) {
    void runVsCompare();
    return;
  }

  if (event.target.closest("#mapCompareRun")) {
    void runMapCompare();
    return;
  }

  if (event.target.closest("#compareReset")) {
    if (comparePlayerA) comparePlayerA.value = "";
    if (comparePlayerB) comparePlayerB.value = "";
    if (mapComparePlayerA) mapComparePlayerA.value = "";
    resetCompareOutput("vs");
    resetCompareOutput("maps");
    return;
  }

  const button = event.target.closest("button[data-compare-mode]");
  if (!button) return;

  const mode = button.dataset.compareMode === "maps" ? "maps" : "vs";
  if (mode === "maps") {
    if (mapComparePlayerA && !mapComparePlayerA.value && comparePlayerA?.value) mapComparePlayerA.value = comparePlayerA.value;
    if (mapCompareMode && compareMode) mapCompareMode.value = compareMode.value;
  } else {
    if (comparePlayerA && !comparePlayerA.value && mapComparePlayerA?.value) comparePlayerA.value = mapComparePlayerA.value;
    if (compareMode && mapCompareMode) compareMode.value = mapCompareMode.value;
  }

  for (const tab of compareView.querySelectorAll("button[data-compare-mode]")) {
    tab.classList.toggle("active", tab === button);
  }

  for (const view of compareView.querySelectorAll("[data-compare-view]")) {
    view.classList.toggle("active", view.dataset.compareView === mode);
  }

  for (const placeholder of compareView.querySelectorAll("[data-compare-placeholder]")) {
    placeholder.classList.toggle("hidden", placeholder.dataset.comparePlaceholder !== mode);
  }
});

compareView?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const input = event.target.closest("input");
  if (!input) return;

  event.preventDefault();
  const activeMode = compareView.querySelector("button[data-compare-mode].active")?.dataset.compareMode === "maps" ? "maps" : "vs";
  if (activeMode === "maps") {
    void runMapCompare();
  } else {
    void runVsCompare();
  }
});

timeRun?.addEventListener("click", () => void runTimeTravel());

timeDate?.addEventListener("change", () => setTimeTravelDate(timeDate.value));

timeSlider?.addEventListener("input", () => {
  const index = Number(timeSlider.value);
  const day = timeTravelDays[index];
  if (day) setTimeTravelDate(day);
});

timeTravelView?.addEventListener("click", (event) => {
  const detailButton = event.target.closest("button[data-score-key]");
  if (detailButton) renderMapDetails(detailButton.dataset.scoreKey);
});

timeTravelView?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const input = event.target.closest("input");
  if (!input) return;
  event.preventDefault();
  void runTimeTravel();
});

skillRun?.addEventListener("click", () => void runSkillTree());

skillTreeView?.addEventListener("click", (event) => {
  const trainingButton = event.target.closest("button[data-skill-training]");
  if (trainingButton) {
    skillTrainingState = {
      skillKey: document.querySelector("#skillTrainingSkill")?.value || skillTrainingState.skillKey,
      goalType: document.querySelector("#skillGoalType")?.value || skillTrainingState.goalType,
      targetPp: document.querySelector("#skillGoalPp")?.value || skillTrainingState.targetPp,
      targetRank: document.querySelector("#skillGoalRank")?.value || skillTrainingState.targetRank,
    };

    if (trainingButton.dataset.skillTraining === "save") {
      const analysis = latestSkillTreeData ? analyzeSkillTree(filterScoresByStars(
        uniqueScores(latestSkillTreeData.passScores || latestSkillTreeData.scores || allScoresFromData(latestSkillTreeData)),
        readSkillStarRange().minStars,
        readSkillStarRange().maxStars,
      )) : null;
      const selected = analysis ? selectedTrainingCategory(analysis) : null;
      const goal = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        username: skillPlayer?.value.trim() || "",
        mode: latestSkillTreeMode,
        skillKey: selected?.key || skillTrainingState.skillKey,
        skillLabel: selected?.label || skillTrainingState.skillKey,
        goalType: skillTrainingState.goalType,
        targetPp: skillTrainingState.targetPp,
        targetRank: skillTrainingState.targetRank,
        createdAt: new Date().toISOString(),
      };
      writeTrainingGoals([goal, ...readTrainingGoals()]);
    }

    if (latestSkillTreeData) renderSkillTreeResults(latestSkillTreeData, latestSkillTreeMode);
    return;
  }

  const detailButton = event.target.closest("button[data-score-key]");
  if (detailButton) renderMapDetails(detailButton.dataset.scoreKey);
});

skillTreeView?.addEventListener("change", (event) => {
  if (!event.target.closest("#skillTrainingSkill, #skillGoalType")) return;
  skillTrainingState = {
    skillKey: document.querySelector("#skillTrainingSkill")?.value || skillTrainingState.skillKey,
    goalType: document.querySelector("#skillGoalType")?.value || skillTrainingState.goalType,
    targetPp: document.querySelector("#skillGoalPp")?.value || skillTrainingState.targetPp,
    targetRank: document.querySelector("#skillGoalRank")?.value || skillTrainingState.targetRank,
  };
  if (latestSkillTreeData) renderSkillTreeResults(latestSkillTreeData, latestSkillTreeMode);
});

skillTreeView?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const input = event.target.closest("input");
  if (!input) return;
  event.preventDefault();
  if (event.target.closest(".training-planner")) {
    skillTrainingState = {
      skillKey: document.querySelector("#skillTrainingSkill")?.value || skillTrainingState.skillKey,
      goalType: document.querySelector("#skillGoalType")?.value || skillTrainingState.goalType,
      targetPp: document.querySelector("#skillGoalPp")?.value || skillTrainingState.targetPp,
      targetRank: document.querySelector("#skillGoalRank")?.value || skillTrainingState.targetRank,
    };
    if (latestSkillTreeData) renderSkillTreeResults(latestSkillTreeData, latestSkillTreeMode);
    return;
  }
  void runSkillTree();
});

ppMapsRun?.addEventListener("click", () => void runPpMapsSearch());

ppMapsReset?.addEventListener("click", resetPpMaps);

ppMapsModButtons?.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-ppmaps-mod]");
  if (!button) return;
  const mod = button.dataset.ppmapsMod;
  const currentState = ppMapsModStates.get(mod) || "optional";
  const nextState = currentState === "optional" ? "required" : currentState === "required" ? "excluded" : "optional";
  if (nextState === "optional") {
    ppMapsModStates.delete(mod);
  } else {
    ppMapsModStates.set(mod, nextState);
  }
  renderPpMapsMods();
  savePpMapsSettings();
});

ppMapsView?.addEventListener("click", (event) => {
  const viewButton = event.target.closest("button[data-ppmaps-view]");
  if (!viewButton) return;
  ppMapsResultMode = ["improvement", "account"].includes(viewButton.dataset.ppmapsView) ? viewButton.dataset.ppmapsView : "unplayed";
  syncPpMapsResultTabs();
  savePpMapsSettings();
  if (ppMapsResultMode === "account") {
    renderPpMapsAccountSimulation(latestPpMapsKnownData || lastSearchData);
  } else if (latestPpMapsPayload) {
    renderPpMapsResults(latestPpMapsPayload, latestPpMapsKnownData, latestPpMapsKnownError);
  }
});

ppMapsMore?.addEventListener("click", () => {
  const advanced = document.querySelector("#ppMapsAdvanced");
  const isOpen = !advanced?.classList.contains("hidden");
  advanced?.classList.toggle("hidden", isOpen);
  ppMapsMore.setAttribute("aria-expanded", isOpen ? "false" : "true");
  savePpMapsSettings();
});

ppMapsView?.addEventListener("change", (event) => {
  const modeChoice = event.target.closest("input[name='ppMapsModeChoice']");
  if (modeChoice && ppMapsMode) {
    ppMapsMode.value = modeChoice.value;
    syncPpMapsModeRadios();
    savePpMapsSettings();
    return;
  }

  if (event.target.closest("#ppMapsView input, #ppMapsView select")) savePpMapsSettings();

  if (
    event.target.closest("#ppMapsAccMin, #ppMapsAccMax, #ppMapsMissMin, #ppMapsMissMax, #ppMapsLimit") &&
    latestPpMapsPayload
  ) {
    renderPpMapsResults(latestPpMapsPayload, latestPpMapsKnownData, latestPpMapsKnownError);
    return;
  }

  if (
    event.target.closest("#ppMapsPpMin, #ppMapsPpMax, #ppMapsTopCount") &&
    ppMapsResultMode === "account"
  ) {
    renderPpMapsAccountSimulation(latestPpMapsKnownData || lastSearchData);
  }
});

ppMapsView?.addEventListener("input", (event) => {
  if (!event.target.closest("input, select")) return;
  savePpMapsSettings();
  if (
    event.target.closest("#ppMapsPpMin, #ppMapsTopCount") &&
    ppMapsResultMode === "account"
  ) {
    renderPpMapsAccountSimulation(latestPpMapsKnownData || lastSearchData);
  }
});

ppMapsView?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  const input = event.target.closest("input");
  if (!input) return;
  event.preventDefault();
  void runPpMapsSearch();
});

compareView?.addEventListener("error", (event) => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.classList.contains("compare-sig-image")) return;

  const retry = Number(image.dataset.retry || 0);
  const fallbackSrc = image.dataset.fallbackSrc || "";
  if (retry === 0 && fallbackSrc && !image.src.startsWith("https://osu-sig.s23.moe/")) {
    image.dataset.retry = "1";
    const separator = fallbackSrc.includes("?") ? "&" : "?";
    image.src = `${fallbackSrc}${separator}fallback=1&at=${Date.now()}`;
    return;
  }

  if (retry >= 3) {
    image.classList.add("is-unavailable");
    return;
  }

  image.dataset.retry = String(retry + 1);
  const baseSrc = fallbackSrc || image.dataset.src || image.src;
  const separator = baseSrc.includes("?") ? "&" : "?";
  window.setTimeout(() => {
    image.classList.remove("is-unavailable");
    image.src = `${baseSrc}${separator}retry=${retry + 1}&at=${Date.now()}`;
  }, 900 + retry * 1400);
}, true);

compareView?.addEventListener("load", (event) => {
  const image = event.target;
  if (!(image instanceof HTMLImageElement) || !image.classList.contains("compare-sig-image")) return;
  image.classList.remove("is-unavailable");
}, true);

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
  document.body.dataset.activeView = activeView;
  results.classList.toggle("hidden", activeView !== "scores");
  passes.classList.toggle("hidden", activeView !== "passes");
  topScores?.classList.toggle("hidden", activeView !== "top");
  improvements.classList.toggle("hidden", activeView !== "improvements");
  calendar.classList.toggle("hidden", activeView !== "calendar");

  if (activeView === "top") {
    renderTopScores(lastSearchData);
  }

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
topScores?.addEventListener("click", (event) => {
  const rangeButton = event.target.closest("button[data-top-range]");
  if (rangeButton && lastSearchData) {
    if (rangeButton.dataset.topRange === "today") {
      topDateFrom = todayDayKey();
      topDateTo = topDateFrom;
      topTimeFrom = "00:00";
      topTimeTo = "23:59";
    } else {
      topDateFrom = topScores.querySelector("[data-top-date-from]")?.value || todayDayKey();
      topDateTo = topScores.querySelector("[data-top-date-to]")?.value || topDateFrom;
      topTimeFrom = topScores.querySelector("[data-top-time-from]")?.value || "00:00";
      topTimeTo = topScores.querySelector("[data-top-time-to]")?.value || "23:59";
    }
    renderTopScores(lastSearchData);
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
  renderPpMapsMods();
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
restorePpMapsSettings();
renderPpMapsMods();
syncPpMapsModeRadios();
syncPpMapsResultTabs();
checkStatus();
checkForUpdates();
startStartupSyncPolling();
