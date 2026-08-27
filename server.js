import http from "node:http";
import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importLocalScores } from "./localImport.js";
import { hydrateCalculatedPp } from "./ppCalculator.js";
import {
  getMostRecentStoredUser,
  getScoreStoreStats,
  getStoredUserByName,
  updateStoredScores,
  upsertStoredScores,
} from "./scoreStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "public");
const dataDir = path.join(__dirname, "data");
const historyPath = path.join(dataDir, "scores-history.json");
const ppCachePath = path.join(dataDir, "score-pp-cache.json");
const osuApiBase = "https://osu.ppy.sh/api/v2";
const tokenUrl = "https://osu.ppy.sh/oauth/token";
const huisApiBase = "https://api.pp.huismetbenen.nl";
const osuTrackApiBase = "https://osutrack-api.ameo.dev";
const huisLiveReworkId = 1;
const githubOwner = "Software4uu";
const githubRepo = "osu-mod-score-finder";
const githubRepoUrl = `https://github.com/${githubOwner}/${githubRepo}`;
const githubApiBase = `https://api.github.com/repos/${githubOwner}/${githubRepo}`;
const githubPackageContentsUrl = `${githubApiBase}/contents/package.json?ref=main`;
const updaterBatPath = path.join(__dirname, "update-beta.bat");
const updateLogPath = path.join(dataDir, "update.log");
const osuApiMinIntervalMs = 1_050;
const osuApiMaxRetries = 3;
const authoritativePpSources = new Set(["osu-api", "huismetbenen-live"]);
const ppCacheFreshMs = 24 * 60 * 60 * 1000;
const osuTrackCacheFreshMs = 6 * 60 * 60 * 1000;
const osuSigCacheFreshMs = 30 * 60 * 1000;

loadDotEnv();

const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";
let tokenCache = null;
const ppProgressJobs = new Map();
const osuTrackHistoryCache = new Map();
const osuSigImageCache = new Map();
const osuApiQueue = [];
let osuApiQueueRunning = false;
let osuApiQueueSequence = 0;
let osuApiLastRequestAt = 0;
let osuApiBlockedUntil = 0;
let startupSyncPromise = null;
let startupSync = {
  status: "scheduled",
  stage: "waiting",
  username: "",
  mode: "osu",
  apiPagesDone: 0,
  apiPagesTotal: 20,
  onlineScoresSeen: 0,
  localScoresSeen: 0,
  newScores: 0,
  ppDone: 0,
  ppTotal: 0,
  ppFilled: 0,
  waitUntil: null,
  warning: null,
  error: null,
  percent: 0,
  etaSeconds: null,
  startedAt: null,
  stageStartedAt: null,
  updatedAt: new Date().toISOString(),
};

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
}

function runNextOsuApiRequest() {
  if (osuApiQueueRunning || !osuApiQueue.length) return;
  osuApiQueueRunning = true;
  osuApiQueue.sort((a, b) => b.priority - a.priority || a.sequence - b.sequence);
  const entry = osuApiQueue.shift();

  void (async () => {
    try {
      const earliestStart = Math.max(
        osuApiLastRequestAt + osuApiMinIntervalMs,
        osuApiBlockedUntil,
      );
      await wait(earliestStart - Date.now());
      osuApiLastRequestAt = Date.now();
      entry.resolve(await entry.request());
    } catch (error) {
      entry.reject(error);
    } finally {
      osuApiQueueRunning = false;
      runNextOsuApiRequest();
    }
  })();
}

function enqueueOsuApiRequest(request, priority = 10) {
  return new Promise((resolve, reject) => {
    osuApiQueue.push({
      request,
      priority: Number(priority || 0),
      sequence: osuApiQueueSequence++,
      resolve,
      reject,
    });
    runNextOsuApiRequest();
  });
}

function osuRetryDelayMs(response, attempt) {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds >= 0) {
      return Math.max(osuApiMinIntervalMs, Math.ceil(seconds * 1_000));
    }

    const date = Date.parse(retryAfter);
    if (Number.isFinite(date)) {
      return Math.max(osuApiMinIntervalMs, date - Date.now());
    }
  }

  return Math.min(60_000, 5_000 * 2 ** attempt);
}

function startupSyncEstimate() {
  if (["done", "idle", "disabled", "error"].includes(startupSync.status)) {
    return startupSync.status === "done" ? 0 : null;
  }

  if (startupSync.stage === "rate_limited" && startupSync.waitUntil) {
    return Math.max(0, Math.ceil((Date.parse(startupSync.waitUntil) - Date.now()) / 1_000));
  }

  if (startupSync.stage === "online") {
    const remainingRequests = Math.max(
      0,
      startupSync.apiPagesTotal - startupSync.apiPagesDone + osuApiQueue.length,
    );
    return Math.ceil((remainingRequests * osuApiMinIntervalMs) / 1_000);
  }

  if (startupSync.stage === "pp" && startupSync.ppTotal > 0) {
    const elapsed = Math.max(1, (Date.now() - Date.parse(startupSync.stageStartedAt)) / 1_000);
    const perSecond = startupSync.ppDone / elapsed;
    return perSecond > 0
      ? Math.ceil((startupSync.ppTotal - startupSync.ppDone) / perSecond)
      : null;
  }

  return null;
}

function startupSyncPercent() {
  if (startupSync.status === "done") return 100;
  if (startupSync.stage === "online" || startupSync.stage === "rate_limited") {
    return Math.min(70, Math.round((startupSync.apiPagesDone / Math.max(1, startupSync.apiPagesTotal)) * 70));
  }
  if (startupSync.stage === "local") return 72;
  if (startupSync.stage === "pp") {
    return Math.min(99, 72 + Math.round((startupSync.ppDone / Math.max(1, startupSync.ppTotal)) * 27));
  }
  return 0;
}

function updateStartupSync(patch) {
  startupSync = {
    ...startupSync,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  startupSync.percent = startupSyncPercent();
  startupSync.etaSeconds = startupSyncEstimate();
}

function startupSyncSnapshot() {
  updateStartupSync({});
  return { ...startupSync, queueLength: osuApiQueue.length };
}

function ppProgressId(value) {
  const id = String(value || "").trim();
  return /^[a-zA-Z0-9_-]{8,80}$/.test(id) ? id : "";
}

function updatePpProgress(id, patch) {
  if (!id) return;
  const current = ppProgressJobs.get(id) || {
    id,
    status: "starting",
    stage: "waiting",
    total: 0,
    attempted: 0,
    filled: 0,
    updated_at: new Date().toISOString(),
  };
  ppProgressJobs.set(id, {
    ...current,
    ...patch,
    updated_at: new Date().toISOString(),
  });
}

function finishPpProgress(id, patch = {}) {
  updatePpProgress(id, { status: "done", stage: "done", ...patch });
  setTimeout(() => ppProgressJobs.delete(id), 2 * 60 * 1000).unref?.();
}

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".svg", "image/svg+xml"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
]);

const modAliases = new Map(
  Object.entries({
    NoFail: "NF",
    Easy: "EZ",
    TouchDevice: "TD",
    Hidden: "HD",
    HardRock: "HR",
    SuddenDeath: "SD",
    Perfect: "PF",
    DoubleTime: "DT",
    Nightcore: "NC",
    HalfTime: "HT",
    Daycore: "DC",
    Flashlight: "FL",
    SpunOut: "SO",
    Relax: "RX",
    Autopilot: "AP",
    Autoplay: "AT",
    Cinema: "CN",
    Classic: "CL",
    DifficultyAdjust: "DA",
    RateAdjust: "RA",
    Alternate: "AL",
    SingleTap: "SG",
    Mirror: "MR",
    Magnetised: "MG",
    Magnetized: "MG",
    Repel: "RP",
    AdaptiveSpeed: "AS",
    Traceable: "TC",
    BarrelRoll: "BR",
    ApproachDifferent: "AD",
    WindUp: "WU",
    WindDown: "WD",
    Transform: "TR",
    Wiggle: "WG",
    SpinIn: "SI",
    Grow: "GR",
    Deflate: "DF",
    Muted: "MU",
    NoScope: "NS",
    Bubbles: "BU",
    Synesthesia: "SY",
    Depth: "DP",
  })
);

function loadDotEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!existsSync(envPath)) return;

  const raw = readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const splitAt = trimmed.indexOf("=");
    if (splitAt === -1) continue;

    const key = trimmed.slice(0, splitAt).trim();
    let value = trimmed.slice(splitAt + 1).trim();
    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) process.env[key] = value;
  }
}

function hasCredentials() {
  return Boolean(process.env.OSU_CLIENT_ID && process.env.OSU_CLIENT_SECRET);
}

function json(res, status, data) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(JSON.stringify(data));
}

function text(res, status, body) {
  res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
  res.end(body);
}

function statusError(status, message, details = null) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

function normalizeVersion(value) {
  return String(value || "0.0.0")
    .trim()
    .replace(/^v/i, "")
    .split(/[+-]/)[0];
}

function compareVersions(a, b) {
  const left = normalizeVersion(a).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const right = normalizeVersion(b).split(".").map((part) => Number.parseInt(part, 10) || 0);
  const max = Math.max(left.length, right.length, 3);

  for (let index = 0; index < max; index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }

  return 0;
}

async function readPackageInfo() {
  try {
    return JSON.parse(await readFile(path.join(__dirname, "package.json"), "utf8"));
  } catch {
    return { version: "0.0.0" };
  }
}

async function githubJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/vnd.github+json",
      "user-agent": "osu-mod-score-finder-beta",
    },
    signal: AbortSignal.timeout(7000),
  });

  if (!response.ok) {
    throw statusError(response.status, `GitHub returned ${response.status}`);
  }

  return response.json();
}

async function githubPackageInfo() {
  const data = await githubJson(githubPackageContentsUrl);
  const encoded = String(data.content || "").replace(/\s/g, "");
  if (!encoded || data.encoding !== "base64") {
    throw statusError(502, "GitHub package metadata could not be decoded.");
  }

  return JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
}

function summarizeCommit(commit) {
  if (!commit) return null;
  const message = String(commit.commit?.message || commit.message || "")
    .split(/\r?\n/)
    .find(Boolean);
  return {
    sha: commit.sha || "",
    shortSha: commit.sha ? commit.sha.slice(0, 7) : "",
    message: message || "Update",
    url: commit.html_url || "",
  };
}

async function githubUpdateChanges(currentCommit, latestCommit) {
  if (!latestCommit?.sha) return [];

  try {
    if (currentCommit && latestCommit.sha.slice(0, 12) !== currentCommit.slice(0, 12)) {
      const compare = await githubJson(`${githubApiBase}/compare/${currentCommit}...main`);
      return (compare.commits || [])
        .map(summarizeCommit)
        .filter(Boolean)
        .reverse()
        .slice(0, 5);
    }

    if (!currentCommit) {
      const commits = await githubJson(`${githubApiBase}/commits?sha=main&per_page=5`);
      return (Array.isArray(commits) ? commits : [])
        .map(summarizeCommit)
        .filter(Boolean)
        .slice(0, 5);
    }
  } catch {
    return [summarizeCommit(latestCommit)].filter(Boolean);
  }

  return [summarizeCommit(latestCommit)].filter(Boolean);
}

async function resolveGitDir() {
  const dotGit = path.join(__dirname, ".git");
  const gitHead = path.join(dotGit, "HEAD");
  if (existsSync(gitHead)) return dotGit;

  try {
    const pointer = await readFile(dotGit, "utf8");
    const match = pointer.match(/^gitdir:\s*(.+)$/im);
    if (!match) return null;
    return path.resolve(__dirname, match[1].trim());
  } catch {
    return null;
  }
}

async function readLocalGitHead() {
  const gitDir = await resolveGitDir();
  if (!gitDir) return null;

  try {
    const head = (await readFile(path.join(gitDir, "HEAD"), "utf8")).trim();
    if (!head.startsWith("ref:")) return head;

    const ref = head.replace(/^ref:\s*/, "").trim();
    const refPath = path.join(gitDir, ...ref.split("/"));
    if (existsSync(refPath)) return (await readFile(refPath, "utf8")).trim();

    const packedRefs = await readFile(path.join(gitDir, "packed-refs"), "utf8");
    const packedLine = packedRefs
      .split(/\r?\n/)
      .find((line) => line.endsWith(` ${ref}`));
    return packedLine ? packedLine.split(" ")[0] : null;
  } catch {
    return null;
  }
}

function psQuote(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function clampNumber(value, fallback, min, max) {
  if (value === null || value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function boolParam(searchParams, name, fallback) {
  const value = searchParams.get(name);
  if (value === null) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

function cleanModAcronym(value) {
  if (!value) return "";
  const compact = String(value).replace(/[\s_-]/g, "");
  const alias = modAliases.get(compact);
  return (alias || compact).toUpperCase();
}

function normalizeMods(mods) {
  if (!Array.isArray(mods)) return [];

  return mods
    .map((mod) => {
      if (typeof mod === "string") {
        return { acronym: cleanModAcronym(mod), settings: null };
      }

      if (mod && typeof mod === "object") {
        const raw =
          mod.acronym ||
          mod.type ||
          mod.name ||
          mod.mod ||
          mod.short_name ||
          "";

        return {
          acronym: cleanModAcronym(raw),
          settings: mod.settings || null,
          ranked: mod.ranked,
        };
      }

      return { acronym: "", settings: null };
    })
    .filter((mod) => mod.acronym);
}

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

function modSettingNumber(mod, keys) {
  const settings = mod?.settings || {};
  for (const key of keys) {
    const value = Number(settings[key] ?? mod?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function scoreMods(score) {
  return score.normalized_mods || normalizeMods(score.mods);
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
  if (score.score_unranked_reason) return score.score_unranked_reason;

  for (const mod of scoreMods(score)) {
    const acronym = String(mod?.acronym || mod || "").toUpperCase();
    if (mod?.ranked === false) return "unranked_mod";
    if (unrankedGameplayMods.has(acronym)) return acronym === "RX" ? "relax" : "unranked_mod";
    if (acronym === "RA" || isCustomClockRateMod(mod)) return "custom_rate";
  }

  return "";
}

function scorePpEligible(score) {
  return !unrankedScoreReason(score);
}

function parseSelectedMods(raw) {
  if (!raw) return [];
  return raw
    .split(",")
    .map(cleanModAcronym)
    .filter(Boolean);
}

function modsMatch(scoreMods, selectedMods, matchMode) {
  if (selectedMods.length === 0) return true;

  const scoreSet = new Set(scoreMods.map((mod) => mod.acronym));
  const wantsNoMod = selectedMods.includes("NM");

  if (wantsNoMod) {
    return scoreSet.size === 0 || (scoreSet.size === 1 && scoreSet.has("CL"));
  }

  if (matchMode === "exact") {
    return (
      scoreSet.size === selectedMods.length &&
      selectedMods.every((mod) => scoreSet.has(mod))
    );
  }

  if (matchMode === "any") {
    return selectedMods.some((mod) => scoreSet.has(mod));
  }

  return selectedMods.every((mod) => scoreSet.has(mod));
}

function isPassed(score) {
  if (score.passed === false) return false;
  if (String(score.rank || "").toUpperCase() === "F") return false;
  return true;
}

function isRankedBeatmap(score, includeLoved) {
  if (unrankedScoreReason(score)) return false;

  const beatmap = score.beatmap || {};
  const status = String(beatmap.status || beatmap.ranked_status || "").toLowerCase();
  const allowedStatuses = includeLoved
    ? new Set(["ranked", "approved", "loved"])
    : new Set(["ranked", "approved"]);

  if (status) return allowedStatuses.has(status);

  const ranked = Number(beatmap.ranked);
  if (!Number.isNaN(ranked)) {
    return includeLoved ? [1, 2, 4].includes(ranked) : [1, 2].includes(ranked);
  }

  return false;
}

function scoreTime(score) {
  return Date.parse(score.ended_at || score.created_at || score.started_at || "") || 0;
}

function missCount(score) {
  const stats = score.statistics || {};
  return stats.miss || stats.count_miss || 0;
}

function scoreStorageKey(score) {
  return String(
    score.id ||
      score.legacy_score_id ||
      `${score.beatmap_id}-${scoreTime(score)}-${score.score}`
  );
}

function compareScores(a, b, sort) {
  if (sort === "acc") return (b.accuracy || 0) - (a.accuracy || 0);
  if (sort === "date") return scoreTime(b) - scoreTime(a);
  if (sort === "score") return (b.score || 0) - (a.score || 0);
  return effectivePp(b) - effectivePp(a);
}

function effectivePp(score) {
  if (!scorePpEligible(score)) return 0;
  if (authoritativePpSources.has(score.pp_source)) return Number(score.pp || 0);
  return Number(score.calculated_pp || score.pp || 0);
}

function hasAuthoritativePp(score) {
  return authoritativePpSources.has(score.pp_source) && effectivePp(score) > 0;
}

function scoreModsKey(score) {
  const mods = score.normalized_mods || score.mods || [];
  return mods
    .map((mod) => (typeof mod === "string" ? cleanModAcronym(mod) : mod.acronym))
    .filter(Boolean)
    .join(",") || "NM";
}

function beatmapKey(score) {
  return String(
    score.beatmap?.checksum ||
      score.beatmap_id ||
      score.beatmap?.id ||
      `${score.beatmapset?.artist || ""}:${score.beatmapset?.title || ""}:${score.beatmap?.version || ""}`
  );
}

function parseBestMode(value) {
  return ["score", "pp", "acc", "date"].includes(value) ? value : "score";
}

function isBetterScore(next, current, bestMode = "score") {
  if (!current) return true;

  const modes =
    bestMode === "pp"
      ? [effectivePp, (score) => Number(score.accuracy || 0), (score) => Number(score.score || 0), (score) => -missCount(score)]
      : bestMode === "acc"
        ? [(score) => Number(score.accuracy || 0), (score) => -missCount(score), (score) => Number(score.score || 0), effectivePp]
        : bestMode === "date"
          ? [scoreTime, (score) => Number(score.score || 0), (score) => Number(score.accuracy || 0), effectivePp]
          : [(score) => Number(score.score || 0), (score) => Number(score.accuracy || 0), (score) => -missCount(score), effectivePp];

  for (const metric of modes) {
    const nextValue = Number(metric(next) || 0);
    const currentValue = Number(metric(current) || 0);
    if (nextValue !== currentValue) return nextValue > currentValue;
  }

  return scoreTime(next) > scoreTime(current);
}

function bestScorePerBeatmap(scores, bestMode = "score") {
  const best = new Map();
  for (const score of scores) {
    const key = beatmapKey(score);
    if (isBetterScore(score, best.get(key), bestMode)) best.set(key, score);
  }
  return [...best.values()];
}

function assignPpRanks(scores) {
  for (const score of scores) {
    delete score.pp_rank;
  }

  const ranked = [...scores]
    .filter((score) => effectivePp(score) > 0)
    .sort((a, b) => compareScores(a, b, "pp"));

  ranked.forEach((score, index) => {
    score.pp_rank = index + 1;
  });
}

function filterRankWindow(scores, rankMode, from, to) {
  if (rankMode !== "pp") return scores;
  return scores.filter((score) => {
    if (!score.pp_rank) return false;
    return score.pp_rank >= from && score.pp_rank <= to;
  });
}

function berlinDateKey(value) {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const lookup = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${lookup.year}-${lookup.month}-${lookup.day}`;
}

function isTodayScore(score) {
  const today = berlinDateKey();
  return berlinDateKey(score.ended_at || score.created_at) === today;
}

function comparisonDeltas(score, previous) {
  const scoreMiss = missCount(score);
  const previousMiss = previous ? missCount(previous) : null;
  return {
    acc_delta: previous ? Number(score.accuracy || 0) - Number(previous.accuracy || 0) : null,
    pp_delta: previous ? effectivePp(score) - effectivePp(previous) : null,
    miss_delta: previous ? previousMiss - scoreMiss : null,
    score_delta: previous ? Number(score.score || 0) - Number(previous.score || 0) : null,
    combo_delta: previous ? Number(score.max_combo || 0) - Number(previous.max_combo || 0) : null,
  };
}

function bestFromScores(scores, bestMode) {
  return scores.reduce((best, score) => (isBetterScore(score, best, bestMode) ? score : best), null);
}

function buildImprovements(scores, scope = "lastTry", bestMode = "score") {
  const grouped = new Map();

  for (const score of scores) {
    const key = `${beatmapKey(score)}:${scoreModsKey(score)}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(score);
  }

  const improvements = [];
  for (const groupScores of grouped.values()) {
    const sorted = [...groupScores].sort((a, b) => scoreTime(b) - scoreTime(a));
    let score = null;
    let previous = null;
    let scopeLabel = "letzter Try";

    if (scope === "lastHour") {
      const start = Date.now() - 60 * 60 * 1000;
      const currentScores = sorted.filter((candidate) => scoreTime(candidate) >= start);
      if (!currentScores.length) continue;
      score = bestFromScores(currentScores, bestMode);
      previous = bestFromScores(sorted.filter((candidate) => scoreTime(candidate) < start), bestMode);
      scopeLabel = "letzte Stunde";
    } else if (scope === "today") {
      const currentScores = sorted.filter(isTodayScore);
      if (!currentScores.length) continue;
      score = bestFromScores(currentScores, bestMode);
      previous = bestFromScores(sorted.filter((candidate) => !isTodayScore(candidate)), bestMode);
      scopeLabel = "heute";
    } else {
      score = sorted[0];
      previous = sorted.find((candidate) => scoreTime(candidate) < scoreTime(score)) || null;
    }

    const deltas = comparisonDeltas(score, previous);

    improvements.push({
      score,
      previous: previous || null,
      ...deltas,
      scope,
      scope_label: scopeLabel,
      is_new_period: !previous,
    });
  }

  return improvements.sort((a, b) => {
    const previousA = a.previous ? 1 : 0;
    const previousB = b.previous ? 1 : 0;
    if (previousA !== previousB) return previousB - previousA;

    const ppA = a.pp_delta ?? 0;
    const ppB = b.pp_delta ?? 0;
    if (ppA !== ppB) return ppB - ppA;

    const scoreA = a.score_delta ?? 0;
    const scoreB = b.score_delta ?? 0;
    if (scoreA !== scoreB) return scoreB - scoreA;

    return scoreTime(b.score) - scoreTime(a.score);
  });
}

function buildCalendar(scores, sort = "date") {
  const days = new Map();

  for (const score of scores) {
    const date = berlinDateKey(score.ended_at || score.created_at);
    if (!date) continue;

    if (!days.has(date)) {
      days.set(date, {
        date,
        count: 0,
        best_pp: 0,
        best_score: 0,
        total_accuracy: 0,
        total_misses: 0,
        latest_time: 0,
        scores: [],
      });
    }

    const day = days.get(date);
    const time = scoreTime(score);
    day.count += 1;
    day.best_pp = Math.max(day.best_pp, effectivePp(score));
    day.best_score = Math.max(day.best_score, Number(score.score || 0));
    day.total_accuracy += Number(score.accuracy || 0);
    day.total_misses += missCount(score);
    day.latest_time = Math.max(day.latest_time, time);
    day.scores.push(score);
  }

  const sortedDays = [...days.values()]
    .map((day) => {
      day.average_accuracy = day.count > 0 ? day.total_accuracy / day.count : 0;
      day.scores.sort((a, b) => compareScores(a, b, sort));
      delete day.total_accuracy;
      return day;
    })
    .sort((a, b) => b.latest_time - a.latest_time);

  return {
    days: sortedDays.map(({ scores, ...day }) => day),
    scoresByDay: Object.fromEntries(sortedDays.map((day) => [day.date, day.scores])),
  };
}

function inferClient(score) {
  if (score.client) return score.client;
  if (score.local_source?.startsWith("stable")) return "stable";
  if (score.local_source?.startsWith("lazer")) return "lazer";
  if (score.legacy_score_id || score.legacy_total_score > 0) return "stable";
  return "lazer";
}

async function loadPpCache() {
  try {
    const raw = await readFile(ppCachePath, "utf8");
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object") return parsed;
  } catch {
    // First run: no pp cache exists yet.
  }

  return {};
}

async function savePpCache(cache) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(ppCachePath, JSON.stringify(cache, null, 2), "utf8");
}

function ppCacheKey(mode, score) {
  const scoreId =
    score.legacy_score_id && score.legacy_score_id !== "0"
      ? score.legacy_score_id
      : score.id && !String(score.id).startsWith("local:") && !String(score.id).startsWith("lazer-realm:")
        ? score.id
        : null;
  if (!scoreId) return null;
  return `${mode}:${scoreId}`;
}

function isFreshPpCacheEntry(cached) {
  if (!cached || cached.pp === null || cached.pp === undefined) return false;
  const fetchedAt = Date.parse(cached.fetched_at || "");
  return fetchedAt > 0 && Date.now() - fetchedAt < ppCacheFreshMs;
}

function clearLocalDisplayAttributes(score) {
  if (!score.beatmap) return;
  for (const key of [
    "effective_difficulty_rating",
    "effective_clock_rate",
    "effective_bpm",
    "effective_total_length",
    "effective_hit_length",
  ]) {
    delete score.beatmap[key];
  }
}

async function hydrateScorePp(score, mode, cache) {
  const key = ppCacheKey(mode, score);
  if (!key || !scorePpEligible(score) || hasAuthoritativePp(score)) return { score, fetched: false };

  const cached = cache[key];
  if (isFreshPpCacheEntry(cached)) {
    score.pp = cached.pp;
    score.pp_source = cached.source || "cache";
    score.calculated_pp = null;
    clearLocalDisplayAttributes(score);
    return { score, fetched: false };
  }

  try {
    const scoreId = key.split(":").at(-1);
    const onlineScore = await osuFetch(`/scores/${mode}/${scoreId}`);
    cache[key] = {
      pp: onlineScore.pp ?? null,
      score_id: onlineScore.id || null,
      fetched_at: new Date().toISOString(),
      source: "osu-api",
    };

    if (onlineScore.pp !== null && onlineScore.pp !== undefined) {
      score.pp = onlineScore.pp;
      score.pp_source = "osu-api";
      score.calculated_pp = null;
      clearLocalDisplayAttributes(score);
    }

    return { score, fetched: true };
  } catch (error) {
    if (cached && cached.pp !== null && cached.pp !== undefined) {
      score.pp = cached.pp;
      score.pp_source = cached.source || "cache";
      score.calculated_pp = null;
      clearLocalDisplayAttributes(score);
    }

    const transient = error.status === 429 || error.status >= 500;
    if (!transient) {
      cache[key] = {
        pp: null,
        error: error.status || error.message || "unknown",
        fetched_at: new Date().toISOString(),
        source: "osu-api",
      };
    }
    return { score, fetched: true };
  }
}

async function hydrateVisiblePp(scores, mode, options = {}) {
  const cache = await loadPpCache();
  const max = Math.max(0, Number(options.max ?? 5));
  const candidates = scores
    .filter((score) => scorePpEligible(score) && !hasAuthoritativePp(score) && ppCacheKey(mode, score))
    .slice(0, max);
  let fetched = 0;
  let filled = 0;

  for (const score of candidates) {
    const before = effectivePp(score);
    const result = await hydrateScorePp(score, mode, cache);
    if (result.fetched) fetched += 1;
    if (!before && effectivePp(score)) filled += 1;
  }

  if (fetched > 0) await savePpCache(cache);
  return { fetched, filled };
}

async function getAccessToken(forceRefresh = false) {
  if (
    !forceRefresh &&
    tokenCache &&
    tokenCache.accessToken &&
    Date.now() < tokenCache.expiresAt - 30_000
  ) {
    return tokenCache.accessToken;
  }

  if (!hasCredentials()) {
    const error = new Error("osu! API Zugang fehlt. Trage OSU_CLIENT_ID und OSU_CLIENT_SECRET in .env ein.");
    error.status = 503;
    throw error;
  }

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      client_id: Number(process.env.OSU_CLIENT_ID),
      client_secret: process.env.OSU_CLIENT_SECRET,
      grant_type: "client_credentials",
      scope: "public",
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error_description || payload.message || "osu! Token konnte nicht geladen werden.");
    error.status = response.status;
    throw error;
  }

  tokenCache = {
    accessToken: payload.access_token,
    expiresAt: Date.now() + Number(payload.expires_in || 3600) * 1000,
  };

  return tokenCache.accessToken;
}

async function osuFetch(pathname, params = {}, state = {}) {
  const attempt = Number(state.attempt || 0);
  const tokenRetried = Boolean(state.tokenRetried);
  const priority = Number(state.priority ?? 10);
  const url = new URL(`${osuApiBase}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const token = await getAccessToken();
  const response = await enqueueOsuApiRequest(
    () =>
      fetch(url, {
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/json",
          "x-api-version": "20220705",
        },
      }),
    priority,
  );

  if (response.status === 401 && !tokenRetried) {
    await response.arrayBuffer().catch(() => undefined);
    await getAccessToken(true);
    return osuFetch(pathname, params, { ...state, attempt, tokenRetried: true });
  }

  if (response.status === 429 && attempt < osuApiMaxRetries) {
    await response.arrayBuffer().catch(() => undefined);
    const retryDelay = osuRetryDelayMs(response, attempt);
    osuApiBlockedUntil = Math.max(osuApiBlockedUntil, Date.now() + retryDelay);
    state.onRateLimit?.(retryDelay);
    return osuFetch(pathname, params, {
      ...state,
      attempt: attempt + 1,
      tokenRetried,
    });
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const fallbackMessage =
      response.status === 429
        ? "osu! API Rate-Limit aktiv. Die automatische Wartezeit war nicht ausreichend; bitte spaeter erneut versuchen."
        : `osu! API Fehler ${response.status}`;
    const error = new Error(payload.error || payload.message || fallbackMessage);
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  return payload;
}

async function getUserByName(username, mode, state = {}) {
  return osuFetch(`/users/${encodeURIComponent(username)}/${mode}`, {
    key: "username",
  }, state);
}

async function getUserScores(userId, options) {
  const allScores = [];
  const seen = new Set();
  const limit = 100;

  for (let page = 0; page < options.pages; page += 1) {
    const params = {
      mode: options.mode,
      limit,
      offset: page * limit,
      legacy_only: options.includeLazer ? 0 : 1,
    };

    if (options.type === "recent") {
      params.include_fails = options.passesOnly ? 0 : 1;
    }

    const pageScores = await osuFetch(`/users/${userId}/scores/${options.type}`, params, {
      priority: options.priority ?? 10,
      onRateLimit: options.onRateLimit,
    });
    options.onPage?.({
      page: page + 1,
      pages: options.pages,
      count: Array.isArray(pageScores) ? pageScores.length : 0,
      complete: !Array.isArray(pageScores) || pageScores.length < limit,
    });
    if (!Array.isArray(pageScores) || pageScores.length === 0) break;

    for (const score of pageScores) {
      const key = score.id || score.legacy_score_id || `${score.beatmap_id}-${scoreTime(score)}-${score.score}`;
      if (seen.has(key)) continue;
      seen.add(key);
      allScores.push(score);
    }

    if (pageScores.length < limit) break;
  }

  return allScores;
}

async function runStartupSync() {
  if (startupSyncPromise) return startupSyncPromise;

  startupSyncPromise = (async () => {
    if (!hasCredentials()) {
      updateStartupSync({ status: "disabled", stage: "disabled" });
      return;
    }

    const stored = getMostRecentStoredUser();
    if (!stored?.user?.username) {
      updateStartupSync({ status: "idle", stage: "idle" });
      return;
    }

    const startedAt = new Date().toISOString();
    updateStartupSync({
      status: "running",
      stage: "online",
      username: stored.user.username,
      mode: stored.mode,
      apiPagesDone: 0,
      apiPagesTotal: 20,
      onlineScoresSeen: 0,
      localScoresSeen: 0,
      newScores: 0,
      ppDone: 0,
      ppTotal: 0,
      ppFilled: 0,
      waitUntil: null,
      warning: null,
      error: null,
      startedAt,
      stageStartedAt: startedAt,
    });

    let syncUser = stored.user;
    let fetchedScores = [];
    let apiWarning = null;
    const onRateLimit = (delay) => {
      updateStartupSync({
        stage: "rate_limited",
        waitUntil: new Date(Date.now() + delay).toISOString(),
      });
    };

    if (!Number.isFinite(Number(syncUser.id))) {
      try {
        syncUser = await getUserByName(stored.user.username, stored.mode, {
          priority: 0,
          onRateLimit,
        });
      } catch (error) {
        apiWarning = error.message || String(error);
      }
    }

    if (Number.isFinite(Number(syncUser.id))) {
      try {
        fetchedScores = await getUserScores(syncUser.id, {
          mode: stored.mode,
          type: "recent",
          pages: 20,
          includeLazer: true,
          passesOnly: true,
          priority: 0,
          onRateLimit,
          onPage: ({ page, count, complete }) => {
            updateStartupSync({
              stage: "online",
              apiPagesDone: page,
              apiPagesTotal: complete ? page : 20,
              onlineScoresSeen: startupSync.onlineScoresSeen + count,
              waitUntil: null,
            });
          },
        });
      } catch (error) {
        apiWarning = error.message || String(error);
      }
    } else {
      if (!apiWarning) {
        apiWarning = "Fuer diesen lokal gespeicherten Spieler konnte keine Online-ID ermittelt werden.";
      }
      updateStartupSync({ apiPagesTotal: 0 });
    }

    const localStageStartedAt = new Date().toISOString();
    updateStartupSync({
      stage: "local",
      stageStartedAt: localStageStartedAt,
      warning: apiWarning,
      waitUntil: null,
    });
    const localImport = await importLocalScores({
      username: syncUser.username || stored.user.username,
      userId: syncUser.id || stored.user.id,
      mode: stored.mode,
    });
    updateStartupSync({ localScoresSeen: localImport.scores.length });

    const history = await upsertHistory(syncUser, stored.mode, [
      ...fetchedScores,
      ...localImport.scores,
    ]);
    updateStartupSync({ newScores: history.savedNow });

    const ppCandidates = history.scores
      .filter(scorePpEligible)
      .filter((score) => !effectivePp(score) && score.beatmap?.local_osu_path)
      .sort((a, b) => compareScores(a, b, "date"))
      .slice(0, 2_500);

    let calculated = { attempted: 0, filled: 0, enriched: 0, errors: [] };
    if (ppCandidates.length) {
      const ppStageStartedAt = new Date().toISOString();
      updateStartupSync({
        stage: "pp",
        stageStartedAt: ppStageStartedAt,
        ppDone: 0,
        ppTotal: ppCandidates.length,
        ppFilled: 0,
      });
      calculated = await hydrateCalculatedPp(ppCandidates, stored.mode, {
        force: true,
        max: ppCandidates.length,
        onProgress: ({ attempted, filled }) => {
          updateStartupSync({ ppDone: attempted, ppFilled: filled });
        },
      });
      if (calculated.filled > 0 || calculated.enriched > 0) {
        updateStoredScores(syncUser, stored.mode, ppCandidates);
      }
    }

    const warningParts = [
      apiWarning,
      ...(localImport.warnings || []),
      ...(calculated.errors || []),
    ].filter(Boolean);
    updateStartupSync({
      status: "done",
      stage: "done",
      ppDone: calculated.attempted || 0,
      ppFilled: calculated.filled || 0,
      warning: warningParts.join(" | ") || null,
      waitUntil: null,
    });
  })().catch((error) => {
    updateStartupSync({
      status: "error",
      stage: "error",
      error: error.message || String(error),
      waitUntil: null,
    });
  });

  return startupSyncPromise;
}

async function huisFetch(pathname, options = {}) {
  const response = await fetch(`${huisApiBase}${pathname}`, {
    method: options.method || "GET",
    headers: {
      accept: "application/json",
      ...(options.body ? { "content-type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const error = new Error(payload?.error || `huismetbenen API Fehler ${response.status}`);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function rankedStatusFromHuis(value) {
  if (value === 1) return "ranked";
  if (value === 2) return "approved";
  if (value === 3) return "qualified";
  if (value === 4) return "loved";
  return "unknown";
}

function gameModeFromHuis(value) {
  if (value === 1) return "taiko";
  if (value === 2) return "fruits";
  if (value === 3) return "mania";
  return "osu";
}

function huisScoreToAppScore(score) {
  const beatmap = score.beatmap || {};
  const pp = score.values?.local_pp ?? score.values?.live_pp ?? null;
  const mods = normalizeMods(score.mods || []);
  const hasClassic = mods.some((mod) => mod.acronym === "CL");
  const status = rankedStatusFromHuis(beatmap.ranked_status);
  const beatmapId = beatmap.id || score.beatmap_id || null;
  const setId = beatmap.set_id || null;

  return {
    id: score.score_id,
    legacy_score_id: score.score_id,
    external_source: "huismetbenen",
    pp_source: "huismetbenen-live",
    pp_algorithm: `huismetbenen-live-v${score.values?.version || "unknown"}`,
    calculated_pp: pp,
    client: hasClassic ? "stable" : "lazer",
    ranked: ["ranked", "approved", "loved"].includes(status),
    preserved: true,
    processed: true,
    maximum_statistics: null,
    mods,
    normalized_mods: mods,
    score: score.score || null,
    accuracy: Number(score.accuracy || 0) / 100,
    pp,
    max_combo: score.max_combo || null,
    passed: String(score.score_rank || "").toUpperCase() !== "F",
    rank: score.score_rank || null,
    statistics: {
      great: score.statistics?.great || 0,
      ok: score.statistics?.ok || 0,
      meh: score.statistics?.meh || 0,
      geki: score.statistics?.perfect || score.statistics?.geki || 0,
      katu: score.statistics?.good || score.statistics?.katu || 0,
      miss: score.statistics?.miss || 0,
    },
    created_at: score.score_date || null,
    ended_at: score.score_date || null,
    beatmap_id: beatmapId,
    beatmap: {
      beatmapset_id: setId,
      difficulty_rating: score.values?.sr || beatmap.star_rating || null,
      id: beatmapId,
      mode: gameModeFromHuis(beatmap.gamemode),
      status,
      total_length: beatmap.total_length || null,
      hit_length: beatmap.hit_length || null,
      user_id: beatmap.creator_id || null,
      version: beatmap.diff_name || "Unknown difficulty",
      accuracy: beatmap.od || null,
      ar: beatmap.ar || null,
      bpm: beatmap.bpm || null,
      convert: false,
      count_circles: beatmap.count_normal || null,
      count_sliders: beatmap.count_slider || null,
      count_spinners: beatmap.count_spinner || null,
      cs: beatmap.cs || null,
      drain: beatmap.hp || null,
      is_scoreable: ["ranked", "approved", "loved", "qualified"].includes(status),
      mode_int: beatmap.gamemode || 0,
      ranked: beatmap.ranked_status ?? -2,
      url: beatmapId ? `https://osu.ppy.sh/beatmaps/${beatmapId}` : null,
      checksum: beatmap.checksum || null,
    },
    beatmapset: {
      artist: beatmap.artist || "Unknown artist",
      artist_unicode: beatmap.artist || "Unknown artist",
      covers: setId
        ? {
            cover: `https://assets.ppy.sh/beatmaps/${setId}/covers/cover.jpg`,
            card: `https://assets.ppy.sh/beatmaps/${setId}/covers/card.jpg`,
            list: `https://assets.ppy.sh/beatmaps/${setId}/covers/list.jpg`,
          }
        : {},
      creator: beatmap.creator_name || "Unknown creator",
      id: setId,
      status,
      title: beatmap.title || "Unknown title",
      title_unicode: beatmap.title || "Unknown title",
      source: "",
    },
    user: {
      id: score.user?.id,
      username: score.user?.name,
      country_code: score.user?.country,
    },
  };
}

async function getHuisTopRanks(userId, mode) {
  if (mode !== "osu" || !Number.isFinite(Number(userId))) return [];
  const scores = await huisFetch(`/player/scores/${userId}/${huisLiveReworkId}/topranks`);
  if (!Array.isArray(scores)) return [];
  return scores.map(huisScoreToAppScore);
}

function osuTrackMode(mode) {
  if (mode === "taiko") return "1";
  if (mode === "fruits") return "2";
  if (mode === "mania") return "3";
  return "0";
}

function firstNumber(source, keys) {
  for (const key of keys) {
    const value = Number(source?.[key]);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function normalizeOsuTrackSnapshot(row) {
  const capturedAt = row?.timestamp || row?.date || row?.created_at || row?.time || null;
  const counts = {
    ssh: firstNumber(row, ["count_rank_ssh", "ssh", "rank_ssh"]) || 0,
    ss: firstNumber(row, ["count_rank_ss", "ss", "rank_ss"]) || 0,
    sh: firstNumber(row, ["count_rank_sh", "sh", "rank_sh"]) || 0,
    s: firstNumber(row, ["count_rank_s", "s", "rank_s"]) || 0,
    a: firstNumber(row, ["count_rank_a", "a", "rank_a"]) || 0,
  };
  const hitCounts = {
    count_300: firstNumber(row, ["count300", "count_300", "count300_total"]) || 0,
    count_100: firstNumber(row, ["count100", "count_100", "count100_total"]) || 0,
    count_50: firstNumber(row, ["count50", "count_50", "count50_total"]) || 0,
  };
  const totalHits =
    firstNumber(row, ["total_hits", "totalHits"]) ||
    hitCounts.count_300 + hitCounts.count_100 + hitCounts.count_50 ||
    null;

  return {
    source: "osu!track",
    captured_at: capturedAt,
    pp: firstNumber(row, ["pp_raw", "pp", "performance_points"]),
    global_rank: firstNumber(row, ["pp_rank", "global_rank", "rank"]),
    ranked_score: firstNumber(row, ["ranked_score", "rankedScore"]),
    total_score: firstNumber(row, ["total_score", "totalScore"]),
    hit_accuracy: firstNumber(row, ["accuracy", "hit_accuracy"]),
    play_count: firstNumber(row, ["playcount", "play_count", "playCount"]),
    total_hits: totalHits,
    max_combo: firstNumber(row, ["max_combo", "maximum_combo", "maximumCombo"]),
    grade_counts: counts,
    raw: row,
  };
}

async function getOsuTrackStatsHistory(userId, mode) {
  if (!Number.isFinite(Number(userId))) {
    return { source: "osu!track", available: false, scores: [], warning: "No numeric osu! user id." };
  }

  const cacheKey = `${osuTrackMode(mode)}:${userId}`;
  const cached = osuTrackHistoryCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < osuTrackCacheFreshMs) return cached.value;

  const query = new URLSearchParams({
    user: String(userId),
    mode: osuTrackMode(mode),
  });
  const url = `${osuTrackApiBase}/stats_history?${query.toString()}`;

  try {
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
        "user-agent": "osu-mod-score-finder-beta",
      },
      signal: AbortSignal.timeout(9_000),
    });

    if (!response.ok) {
      throw statusError(response.status, `osu!track returned ${response.status}`);
    }

    const data = await response.json();
    const rows = Array.isArray(data) ? data : Array.isArray(data?.stats) ? data.stats : Array.isArray(data?.history) ? data.history : [];
    const value = {
      source: "osu!track",
      available: rows.length > 0,
      fetched_at: new Date().toISOString(),
      scores: rows
        .map(normalizeOsuTrackSnapshot)
        .filter((item) => item.captured_at && (item.pp || item.global_rank))
        .sort((a, b) => Date.parse(a.captured_at) - Date.parse(b.captured_at)),
    };
    osuTrackHistoryCache.set(cacheKey, { fetchedAt: Date.now(), value });
    return value;
  } catch (error) {
    const value = {
      source: "osu!track",
      available: false,
      fetched_at: new Date().toISOString(),
      scores: [],
      warning: error.message || String(error),
    };
    osuTrackHistoryCache.set(cacheKey, { fetchedAt: Date.now(), value });
    return value;
  }
}

function compactScore(score) {
  const normalizedMods = normalizeMods(score.mods);
  const scoreForRules = {
    ...score,
    normalized_mods: normalizedMods,
  };
  const scoreUnrankedReason = unrankedScoreReason(scoreForRules) || null;

  return {
    storage_key: score.storage_key || scoreStorageKey(score),
    id: score.id,
    legacy_score_id: score.legacy_score_id,
    ranked: score.ranked,
    preserved: score.preserved,
    processed: score.processed,
    maximum_statistics: score.maximum_statistics,
    local_source: score.local_source || null,
    external_source: score.external_source || null,
    pp_source: score.pp_source || null,
    pp_algorithm: score.pp_algorithm || null,
    calculated_pp: score.calculated_pp || null,
    unranked_calculated_pp: score.unranked_calculated_pp || null,
    unranked_pp_algorithm: score.unranked_pp_algorithm || null,
    original_pp: score.original_pp || null,
    pp_rank: score.pp_rank || null,
    score_unranked_reason: scoreUnrankedReason,
    pp_ranked: !scoreUnrankedReason,
    client: inferClient(score),
    mods: score.mods,
    normalized_mods: normalizedMods,
    score: score.score,
    accuracy: score.accuracy,
    pp: score.pp,
    max_combo: score.max_combo,
    passed: score.passed,
    rank: score.rank,
    statistics: score.statistics,
    created_at: score.created_at,
    ended_at: score.ended_at,
    beatmap_id: score.beatmap_id,
    beatmap: score.beatmap,
    beatmapset: score.beatmapset,
    user: score.user,
  };
}

async function loadHistory() {
  return { version: 2, users: {} };
}

async function saveHistory(history) {
  return history;
}

async function upsertHistory(user, mode, fetchedScores) {
  const compactedScores = fetchedScores
    .map((rawScore) => compactScore(rawScore))
    .filter((score) => isPassed(score));

  return upsertStoredScores(user, mode, dedupeScores(compactedScores));
}

function isAllowedClient(score, includeLazer) {
  if (score.local_source?.startsWith("stable")) return true;
  if (score.local_source?.startsWith("lazer")) return includeLazer;
  if (includeLazer) return true;
  return Boolean(score.legacy_score_id);
}

function sourcePriority(score) {
  if (score.external_source === "huismetbenen") return 12;
  if (!score.local_source) return 10;
  if (score.local_source === "stable-scoresdb") return 4;
  if (score.local_source === "stable-exported-replay") return 3;
  if (score.local_source === "stable-internal-replay") return 2;
  if (score.local_source === "lazer-client-realm") return 5;
  if (score.local_source === "lazer-exported-replay") return 1;
  return 0;
}

function scoreDedupeKey(score) {
  if (!score.local_source) return `online:${score.id || score.legacy_score_id}`;

  const mods = (score.normalized_mods || score.mods || [])
    .map((mod) => mod.acronym || mod)
    .join(",");
  const map = score.beatmap?.checksum || score.beatmap_id || "unknown-map";
  const time = score.ended_at || score.created_at || "unknown-time";

  return `local:${map}:${time}:${score.score}:${mods}`;
}

function dedupeScores(scores) {
  const deduped = new Map();

  for (const score of scores) {
    const key = scoreDedupeKey(score);
    const current = deduped.get(key);
    if (!current || sourcePriority(score) > sourcePriority(current)) {
      deduped.set(key, score);
    }
  }

  return [...deduped.values()];
}

function monthKeyForScore(score) {
  return berlinDateKey(score?.ended_at || score?.created_at).slice(0, 7);
}

function cleanMonthKey(value) {
  const month = String(value || "").trim();
  return /^\d{4}-\d{2}$/.test(month) ? month : berlinDateKey().slice(0, 7);
}

function mergeScoreWorkSets(...sets) {
  const merged = new Map();
  for (const scores of sets) {
    for (const score of scores) {
      merged.set(scoreStorageKey(score), score);
    }
  }
  return [...merged.values()];
}

function oldestDateKey(scores) {
  const times = scores
    .map(scoreTime)
    .filter((time) => Number.isFinite(time) && time > 0);
  if (!times.length) return "";
  return berlinDateKey(new Date(Math.min(...times)).toISOString());
}

function ppProgressCallback(jobId, base = {}) {
  return ({ attempted, filled }) => {
    updatePpProgress(jobId, {
      status: "running",
      stage: base.stage || "calculating",
      total: base.total || 0,
      attempted,
      filled,
      ...base,
    });
  };
}

function collectImprovementPpWorkSet(scores, improvements, maxScores = 2500) {
  const mapKeys = new Set(
    improvements
      .flatMap((item) => [item.score, item.previous])
      .filter(Boolean)
      .map(beatmapKey)
  );

  if (!mapKeys.size) return [];

  return [...scores]
    .filter((score) => mapKeys.has(beatmapKey(score)))
    .filter(scorePpEligible)
    .filter((score) => !effectivePp(score))
    .filter((score) => score.beatmap?.local_osu_path || score.legacy_score_id || score.id)
    .sort((a, b) => scoreTime(b) - scoreTime(a))
    .slice(0, maxScores);
}

async function handleSearch(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const username = (url.searchParams.get("username") || "").trim();
  const mode = url.searchParams.get("mode") || "osu";
  const type = "recent";
  const matchMode = url.searchParams.get("match") || "contains";
  const sort = url.searchParams.get("sort") || "date";
  const dateFilter = url.searchParams.get("dateFilter") || "all";
  const rankMode = url.searchParams.get("rankMode") || "none";
  const rankFrom = clampNumber(url.searchParams.get("rankFrom"), 1, 1, 9999);
  const rankTo = clampNumber(url.searchParams.get("rankTo"), 100, 1, 9999);
  const pages = clampNumber(url.searchParams.get("pages"), 2, 1, 20);
  const finalLimit = clampNumber(url.searchParams.get("limit"), 100, 1, 500);
  const bestMode = parseBestMode(url.searchParams.get("bestMode"));
  const improvementScope = ["lastTry", "lastHour", "today"].includes(url.searchParams.get("improvementScope"))
    ? url.searchParams.get("improvementScope")
    : "lastTry";
  const includeLazer = boolParam(url.searchParams, "includeLazer", true);
  const useApiV2 = boolParam(url.searchParams, "useApiV2", true);
  const includeHuis = boolParam(url.searchParams, "includeHuis", true);
  const recalculatePp = boolParam(url.searchParams, "recalculatePp", true);
  const bestPerMap = boolParam(url.searchParams, "bestPerMap", true);
  const passesOnly = true;
  const rankedOnly = boolParam(url.searchParams, "rankedOnly", true);
  const includeLoved = boolParam(url.searchParams, "includeLoved", false);
  const includeUnrankedPasses = boolParam(url.searchParams, "includeUnrankedPasses", false);
  const includeTimeSources = boolParam(url.searchParams, "timeTravel", false);
  const selectedMods = parseSelectedMods(url.searchParams.get("mods"));
  const ppJobId = ppProgressId(url.searchParams.get("ppJobId"));

  if (!username) {
    return json(res, 400, { error: "Bitte gib einen osu!-Namen ein." });
  }

  if (!["osu", "taiko", "fruits", "mania"].includes(mode)) {
    return json(res, 400, { error: "Ungueltiger Spielmodus." });
  }

  const storedUser = getStoredUserByName(username, mode);
  let user = storedUser?.user || null;
  let fetchedScores = [];
  let apiWarning = null;
  let huisScores = [];
  let huisWarning = null;

  if (useApiV2) {
    try {
      user = await getUserByName(username, mode);
      fetchedScores = await getUserScores(user.id, {
        mode,
        type,
        pages,
        includeLazer,
        passesOnly,
      });
    } catch (error) {
      if (!user) throw error;
      apiWarning = `osu!api v2 nicht erreichbar, gespeicherte Daten werden genutzt: ${error.message}`;
    }
  }

  if (!user) {
    user = {
      id: `local:${mode}:${username.toLowerCase()}`,
      username,
      avatar_url: "",
      country_code: "--",
      statistics: {},
    };
  }

  const localImport = await importLocalScores({
    username: user.username,
    userId: user.id,
    mode,
  });

  if (includeHuis && mode === "osu" && Number.isFinite(Number(user.id))) {
    try {
      huisScores = await getHuisTopRanks(user.id, mode);
    } catch (error) {
      huisWarning = `huismetbenen konnte nicht geladen werden: ${error.message}`;
    }
  }

  const history = await upsertHistory(user, mode, [
    ...fetchedScores,
    ...huisScores,
    ...localImport.scores,
  ]);

  const baseCandidates = history.scores
    .filter((score) => isAllowedClient(score, includeLazer))
    .filter((score) => (passesOnly ? isPassed(score) : true))
    .filter((score) => modsMatch(score.normalized_mods || normalizeMods(score.mods), selectedMods, matchMode));
  let filteredCandidates = baseCandidates
    .filter((score) => (rankedOnly ? isRankedBeatmap(score, includeLoved) : true));
  let passCandidates = includeUnrankedPasses ? baseCandidates : filteredCandidates;

  const primaryPpWorkLimit = sort === "pp" || rankMode === "pp" ? Math.max(finalLimit, 1000) : Math.max(finalLimit, 300);
  const primaryPpWorkSet =
    sort === "pp" || rankMode === "pp"
      ? [...filteredCandidates]
          .sort((a, b) => effectivePp(b) - effectivePp(a) || compareScores(a, b, "score"))
          .slice(0, primaryPpWorkLimit)
      : [...filteredCandidates].sort((a, b) => compareScores(a, b, sort)).slice(0, primaryPpWorkLimit);
  const currentMonth = berlinDateKey().slice(0, 7);
  const currentMonthPpWorkSet = filteredCandidates
    .filter((score) => monthKeyForScore(score) === currentMonth)
    .sort((a, b) => compareScores(a, b, "date"))
    .slice(0, 2000);
  const recentLocalPpWorkSet = filteredCandidates
    .filter(scorePpEligible)
    .filter((score) => !effectivePp(score) && score.beatmap?.local_osu_path)
    .sort((a, b) => compareScores(a, b, "date"))
    .slice(0, 2500);
  const preHydrationImprovements = buildImprovements(filteredCandidates, improvementScope, bestMode).slice(0, 50);
  const improvementPpWorkSet = collectImprovementPpWorkSet(filteredCandidates, preHydrationImprovements);
  const passPpWorkSet = passCandidates
    .filter((score) => score.beatmap?.local_osu_path)
    .sort((a, b) => compareScores(a, b, sort))
    .slice(0, Math.max(finalLimit, 1000));
  const ppWorkSet = mergeScoreWorkSets(
    primaryPpWorkSet,
    passPpWorkSet,
    currentMonthPpWorkSet,
    recentLocalPpWorkSet,
    improvementPpWorkSet
  );
  const ppCalculationLimit = Math.min(ppWorkSet.length, 2500);
  const ppBackfillUntil = oldestDateKey(recentLocalPpWorkSet);

  updatePpProgress(ppJobId, {
    status: "running",
    stage: "search",
    total: ppCalculationLimit,
    attempted: 0,
    filled: 0,
    backfill_until: ppBackfillUntil,
  });
  const calculatedHydration = recalculatePp
    ? await hydrateCalculatedPp(ppWorkSet, mode, {
        force: true,
        max: ppCalculationLimit,
        onProgress: ppProgressCallback(ppJobId, {
          stage: "search",
          total: ppCalculationLimit,
          backfill_until: ppBackfillUntil,
        }),
      })
    : { attempted: 0, filled: 0, enriched: 0, unavailable: false, errors: [] };
  const ppHydration = await hydrateVisiblePp(ppWorkSet, mode, { max: 0 });

  if (ppHydration.filled > 0 || calculatedHydration.filled > 0 || calculatedHydration.enriched > 0) {
    updateStoredScores(user, mode, ppWorkSet);
  }

  const improvements = buildImprovements(filteredCandidates, improvementScope, bestMode).slice(0, 50);
  const calendar = buildCalendar(filteredCandidates, sort);
  const timeSources = includeTimeSources
    ? {
        osutrack: await getOsuTrackStatsHistory(user.id, mode),
      }
    : null;

  if (dateFilter === "today") {
    filteredCandidates = filteredCandidates.filter(isTodayScore);
    passCandidates = passCandidates.filter(isTodayScore);
  }

  if (bestPerMap) {
    filteredCandidates = bestScorePerBeatmap(filteredCandidates, bestMode);
  }

  assignPpRanks(filteredCandidates);
  filteredCandidates = filterRankWindow(
    filteredCandidates,
    rankMode,
    Math.min(rankFrom, rankTo),
    Math.max(rankFrom, rankTo)
  );

  let filteredScores = filteredCandidates
    .sort((a, b) => compareScores(a, b, sort))
    .slice(0, finalLimit);
  let visiblePpHydration = { fetched: 0, filled: 0 };
  let visibleCalculatedHydration = { attempted: 0, filled: 0, enriched: 0, unavailable: false, errors: [] };

  const visiblePpWorkSet = mergeScoreWorkSets(filteredScores);
  if (visiblePpWorkSet.length) {
    updatePpProgress(ppJobId, {
      status: "running",
      stage: "visible",
      total: visiblePpWorkSet.length,
      attempted: 0,
      filled: 0,
    });
    visibleCalculatedHydration = recalculatePp
      ? await hydrateCalculatedPp(visiblePpWorkSet, mode, {
          force: true,
          max: visiblePpWorkSet.length,
          onProgress: ppProgressCallback(ppJobId, {
            stage: "visible",
            total: visiblePpWorkSet.length,
          }),
        })
      : visibleCalculatedHydration;
    visiblePpHydration = await hydrateVisiblePp(visiblePpWorkSet, mode, { max: 5 });

    if (visiblePpHydration.filled > 0 || visibleCalculatedHydration.filled > 0 || visibleCalculatedHydration.enriched > 0) {
      updateStoredScores(user, mode, visiblePpWorkSet);
      assignPpRanks(filteredCandidates);
      filteredCandidates = filterRankWindow(
        filteredCandidates,
        rankMode,
        Math.min(rankFrom, rankTo),
        Math.max(rankFrom, rankTo)
      );
      filteredScores = filteredCandidates
        .sort((a, b) => compareScores(a, b, sort))
        .slice(0, finalLimit);
    }
  }

  finishPpProgress(ppJobId, {
    total: ppCalculationLimit + visiblePpWorkSet.length,
    attempted: calculatedHydration.attempted + visibleCalculatedHydration.attempted,
    filled: calculatedHydration.filled + visibleCalculatedHydration.filled,
    backfill_until: ppBackfillUntil,
  });

  return json(res, 200, {
    user: {
      id: user.id,
      username: user.username,
      avatar_url: user.avatar_url,
      country_code: user.country_code,
      url: `https://osu.ppy.sh/users/${user.id}/${mode}`,
      statistics: user.statistics,
    },
    scores: filteredScores,
    passScores: passCandidates.sort((a, b) => compareScores(a, b, sort)),
    meta: {
      fetched: fetchedScores.length,
      returned: filteredScores.length,
      pages,
      limit: finalLimit,
      mode,
      type,
      sort,
      dateFilter,
      rankMode,
      rankFrom: Math.min(rankFrom, rankTo),
      rankTo: Math.max(rankFrom, rankTo),
      bestMode,
      improvementScope,
      includeLazer,
      useApiV2,
      includeHuis,
      recalculatePp,
      bestPerMap,
      passesOnly,
      rankedOnly,
      includeLoved,
      includeUnrankedPasses,
      matchMode,
      selectedMods,
      calendarDays: calendar.days.length,
      historyTotal: history.total,
      savedNow: history.savedNow,
      apiFetched: fetchedScores.length,
      huisFetched: huisScores.length,
      localImported: localImport.scores.length,
      localImportSources: localImport.sources,
      localImportWarnings: localImport.warnings,
      apiWarning,
      huisWarning,
      ppFetched: ppHydration.fetched + visiblePpHydration.fetched,
      ppFilled: ppHydration.filled + visiblePpHydration.filled,
      ppCalculated: calculatedHydration.filled + visibleCalculatedHydration.filled,
      ppCalculationAttempted: calculatedHydration.attempted + visibleCalculatedHydration.attempted,
      ppImprovementQueued: improvementPpWorkSet.length,
      ppDisplayedQueued: visiblePpWorkSet.length,
      ppDisplayedCalculated: visibleCalculatedHydration.filled,
      ppBackfillUntil,
      ppEngine: calculatedHydration.engine || visibleCalculatedHydration.engine || null,
      ppCalculationWarnings: [...calculatedHydration.errors, ...visibleCalculatedHydration.errors],
      source: "sqlite-score-database",
      note:
        "Die App speichert alle gefundenen Scores lokal in SQLite. osu!api v2 liefert trotzdem keine komplette alte Score-Historie.",
    },
    improvements,
    calendar,
    timeSources,
  });
}

async function handlePpProgress(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const id = ppProgressId(url.searchParams.get("id"));
  return json(res, 200, ppProgressJobs.get(id) || {
    id,
    status: "idle",
    stage: "idle",
    total: 0,
    attempted: 0,
    filled: 0,
  });
}

async function handleBackfillMonth(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const username = (url.searchParams.get("username") || "").trim();
  const mode = url.searchParams.get("mode") || "osu";
  const sort = url.searchParams.get("sort") || "date";
  const month = cleanMonthKey(url.searchParams.get("month"));
  const matchMode = url.searchParams.get("match") || "contains";
  const includeLazer = boolParam(url.searchParams, "includeLazer", true);
  const rankedOnly = boolParam(url.searchParams, "rankedOnly", true);
  const includeLoved = boolParam(url.searchParams, "includeLoved", false);
  const recalculatePp = boolParam(url.searchParams, "recalculatePp", true);
  const selectedMods = parseSelectedMods(url.searchParams.get("mods"));
  const ppJobId = ppProgressId(url.searchParams.get("ppJobId"));

  if (!username) {
    return json(res, 400, { error: "Bitte gib einen osu!-Namen ein." });
  }

  if (!["osu", "taiko", "fruits", "mania"].includes(mode)) {
    return json(res, 400, { error: "Ungueltiger Spielmodus." });
  }

  updatePpProgress(ppJobId, {
    status: "running",
    stage: "collecting",
    total: 0,
    attempted: 0,
    filled: 0,
  });

  const storedUser = getStoredUserByName(username, mode);
  const user =
    storedUser?.user || {
      id: `local:${mode}:${username.toLowerCase()}`,
      username,
      avatar_url: "",
      country_code: "--",
      statistics: {},
    };

  const localImport = await importLocalScores({
    username: user.username,
    userId: user.id,
    mode,
  });
  const history = await upsertHistory(user, mode, localImport.scores);

  const filteredCandidates = history.scores
    .filter((score) => isAllowedClient(score, includeLazer))
    .filter(isPassed)
    .filter((score) => (rankedOnly ? isRankedBeatmap(score, includeLoved) : true))
    .filter((score) => modsMatch(score.normalized_mods || normalizeMods(score.mods), selectedMods, matchMode));

  const monthScores = filteredCandidates
    .filter((score) => monthKeyForScore(score) === month)
    .sort((a, b) => compareScores(a, b, "date"));
  const ppWorkSet = mergeScoreWorkSets(
    monthScores.filter((score) => score.beatmap?.local_osu_path || score.legacy_score_id || score.id)
  );

  updatePpProgress(ppJobId, {
    status: "running",
    stage: "calendar",
    month,
    total: ppWorkSet.length,
    attempted: 0,
    filled: 0,
  });

  const calculatedHydration = recalculatePp
    ? await hydrateCalculatedPp(ppWorkSet, mode, {
        force: true,
        max: ppWorkSet.length,
        onProgress: ppProgressCallback(ppJobId, {
          stage: "calendar",
          month,
          total: ppWorkSet.length,
        }),
      })
    : { attempted: 0, filled: 0, enriched: 0, unavailable: false, errors: [] };
  const ppHydration = await hydrateVisiblePp(ppWorkSet, mode, { max: 5 });

  if (ppHydration.filled > 0 || calculatedHydration.filled > 0 || calculatedHydration.enriched > 0) {
    updateStoredScores(user, mode, ppWorkSet);
  }

  const calendar = buildCalendar(filteredCandidates, sort);
  finishPpProgress(ppJobId, {
    month,
    total: ppWorkSet.length,
    attempted: calculatedHydration.attempted,
    filled: calculatedHydration.filled,
  });

  return json(res, 200, {
    month,
    calendar,
    meta: {
      ppFetched: ppHydration.fetched,
      ppFilled: ppHydration.filled,
      ppCalculated: calculatedHydration.filled,
      ppCalculationAttempted: calculatedHydration.attempted,
      ppEngine: calculatedHydration.engine || null,
      ppCalculationWarnings: calculatedHydration.errors,
      localImported: localImport.scores.length,
      localImportSources: localImport.sources,
      localImportWarnings: localImport.warnings,
    },
  });
}

async function handleLiveScan(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const username = (url.searchParams.get("username") || "").trim();
  const mode = url.searchParams.get("mode") || "osu";

  if (!username) {
    return json(res, 400, { error: "Bitte gib einen osu!-Namen ein." });
  }

  if (!["osu", "taiko", "fruits", "mania"].includes(mode)) {
    return json(res, 400, { error: "Ungueltiger Spielmodus." });
  }

  const storedUser = getStoredUserByName(username, mode);
  const user =
    storedUser?.user || {
      id: `local:${mode}:${username.toLowerCase()}`,
      username,
      avatar_url: "",
      country_code: "--",
      statistics: {},
    };

  const localImport = await importLocalScores({
    username: user.username,
    userId: user.id,
    mode,
  });

  const history = await upsertHistory(user, mode, localImport.scores);

  return json(res, 200, {
    savedNow: history.savedNow,
    total: history.total,
    localImported: localImport.scores.length,
    totalLocalScores: localImport.totalLocalScores,
    sources: localImport.sources,
    warnings: localImport.warnings,
    scannedAt: new Date().toISOString(),
  });
}

async function handleUpdateCheck(req, res) {
  if (req.method !== "GET") {
    throw statusError(405, "Method not allowed");
  }

  const localPackage = await readPackageInfo();
  const currentVersion = normalizeVersion(localPackage.version);
  const currentCommit = await readLocalGitHead();
  const checks = [];
  let latestPackage = null;
  let latestCommit = null;
  let latestRelease = null;

  try {
    latestPackage = await githubPackageInfo();
    checks.push("package");
  } catch (error) {
    checks.push(`package-failed:${error.status || "network"}`);
  }

  try {
    latestCommit = await githubJson(`${githubApiBase}/commits/main`);
    checks.push("commit");
  } catch (error) {
    checks.push(`commit-failed:${error.status || "network"}`);
  }

  try {
    latestRelease = await githubJson(`${githubApiBase}/releases/latest`);
    checks.push("release");
  } catch (error) {
    checks.push(`release-failed:${error.status || "none"}`);
  }

  if (!latestPackage && !latestCommit && !latestRelease) {
    throw statusError(502, "Could not reach GitHub update information.", checks);
  }

  const latestVersion = normalizeVersion(
    latestRelease?.tag_name || latestPackage?.version || currentVersion,
  );
  const versionComparison = compareVersions(latestVersion, currentVersion);
  const versionIsNewer = versionComparison > 0;
  const commitIsNewer = Boolean(
    versionComparison === 0 &&
      currentCommit &&
      latestCommit?.sha &&
      latestCommit.sha.slice(0, 12) !== currentCommit.slice(0, 12),
  );
  const updateAvailable = versionIsNewer || commitIsNewer;
  const changes = updateAvailable ? await githubUpdateChanges(currentCommit, latestCommit) : [];

  return json(res, 200, {
    repo: githubRepoUrl,
    currentVersion,
    latestVersion,
    currentCommit,
    latestCommit: latestCommit?.sha || null,
    updateAvailable,
    canAutoUpdate: existsSync(updaterBatPath),
    source: latestRelease ? "release" : "main",
    htmlUrl: latestRelease?.html_url || latestCommit?.html_url || githubRepoUrl,
    changes,
    checks,
  });
}

async function handleUpdateStart(req, res) {
  if (req.method !== "POST") {
    throw statusError(405, "Method not allowed");
  }

  if (!existsSync(updaterBatPath)) {
    throw statusError(404, "Updater script was not found.");
  }

  if (process.platform !== "win32") {
    throw statusError(400, "Automatic updates are currently available on Windows only.");
  }

  await mkdir(dataDir, { recursive: true });

  const command = `Start-Process -FilePath ${psQuote(updaterBatPath)} -WorkingDirectory ${psQuote(__dirname)}`;
  const child = spawn(
    "powershell.exe",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
    {
      cwd: __dirname,
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    },
  );
  child.unref();

  return json(res, 202, {
    started: true,
    logPath: updateLogPath,
    message: "Updater started. The app will restart automatically after a successful update.",
  });
}

function osuSigMode(mode) {
  if (mode === "osu") return "std";
  if (mode === "fruits") return "catch";
  if (mode === "taiko" || mode === "mania") return mode;
  return "std";
}

async function handleOsuSigImage(req, res) {
  if (req.method !== "GET") {
    throw statusError(405, "Method not allowed");
  }

  const url = new URL(req.url, `http://${req.headers.host}`);
  const user = String(url.searchParams.get("user") || "").trim();
  const mode = osuSigMode(url.searchParams.get("mode") || "osu");
  const type = url.searchParams.get("type") === "skills" ? "skills" : "full";
  const lang = url.searchParams.get("lang") === "de" ? "de" : "en";
  if (!user || user.length > 80) {
    throw statusError(400, "Missing osu-sig user.");
  }

  const cacheKey = `${type}:${mode}:${lang}:${user}`;
  const cached = osuSigImageCache.get(cacheKey);
  if (cached && Date.now() - cached.fetchedAt < osuSigCacheFreshMs) {
    res.writeHead(200, {
      "content-type": cached.contentType,
      "cache-control": "public, max-age=1800",
    });
    return res.end(cached.body);
  }

  const params = new URLSearchParams({
    user,
    mode,
    lang,
    hue: "333",
    animation: "false",
  });
  let remoteUrl = "";
  if (type === "skills") {
    remoteUrl = `https://osu-sig.s23.moe/skills?${params.toString()}`;
  } else {
    params.set("skills", "true");
    remoteUrl = `https://osu-sig.s23.moe/card?${params.toString()}`;
  }

  const response = await fetch(remoteUrl, {
    headers: {
      accept: "image/png,image/*;q=0.9,*/*;q=0.2",
      "user-agent": "osu-mod-score-finder-beta",
    },
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    throw statusError(response.status, `osu-sig returned ${response.status}`);
  }

  const contentType = response.headers.get("content-type") || "image/png";
  if (!contentType.startsWith("image/")) {
    throw statusError(502, "osu-sig did not return an image.");
  }

  const body = Buffer.from(await response.arrayBuffer());
  osuSigImageCache.set(cacheKey, { fetchedAt: Date.now(), contentType, body });
  res.writeHead(200, {
    "content-type": contentType,
    "cache-control": "public, max-age=1800",
  });
  return res.end(body);
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  const requested = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const filePath = path.resolve(publicDir, requested);
  const relativePath = path.relative(publicDir, filePath);

  if (relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return text(res, 403, "Forbidden");
  }

  try {
    const body = await readFile(filePath);
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "content-type": mimeTypes.get(ext) || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(body);
  } catch {
    text(res, 404, "Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/status") {
      const storeStats = getScoreStoreStats();
      return json(res, 200, {
        hasCredentials: hasCredentials(),
        port,
        database: storeStats,
      });
    }

    if (url.pathname === "/api/startup-sync") {
      if (req.method !== "GET") {
        throw statusError(405, "Method not allowed");
      }
      return json(res, 200, startupSyncSnapshot());
    }

    if (url.pathname === "/api/update-check") {
      return await handleUpdateCheck(req, res);
    }

    if (url.pathname === "/api/update-start") {
      return await handleUpdateStart(req, res);
    }

    if (url.pathname === "/api/osu-sig") {
      return await handleOsuSigImage(req, res);
    }

    if (url.pathname === "/api/search") {
      return await handleSearch(req, res);
    }

    if (url.pathname === "/api/pp-progress") {
      return await handlePpProgress(req, res);
    }

    if (url.pathname === "/api/backfill-month") {
      return await handleBackfillMonth(req, res);
    }

    if (url.pathname === "/api/live-scan") {
      return await handleLiveScan(req, res);
    }

    return await serveStatic(req, res);
  } catch (error) {
    const status = error.status || 500;
    return json(res, status, {
      error: error.message || "Unbekannter Fehler.",
      details: error.details || null,
    });
  }
});

server.listen(port, host, () => {
  console.log(`osu! Mod Score Finder laeuft auf http://${host}:${port}`);
  setTimeout(() => {
    void runStartupSync();
  }, 1_500).unref?.();
});
