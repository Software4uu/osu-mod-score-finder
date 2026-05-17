import http from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { importLocalScores } from "./localImport.js";
import { hydrateCalculatedPp } from "./ppCalculator.js";
import {
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
const huisLiveReworkId = 1;

loadDotEnv();

const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";
let tokenCache = null;

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
        };
      }

      return { acronym: "", settings: null };
    })
    .filter((mod) => mod.acronym);
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
  return Number(score.calculated_pp || score.pp || 0);
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

async function hydrateScorePp(score, mode, cache) {
  const key = ppCacheKey(mode, score);
  if (!key || score.pp) return { score, fetched: false };

  const cached = cache[key];
  if (cached && cached.pp !== null && cached.pp !== undefined) {
    score.pp = cached.pp;
    score.pp_source = cached.source || "cache";
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
    }

    return { score, fetched: true };
  } catch (error) {
    cache[key] = {
      pp: null,
      error: error.status || error.message || "unknown",
      fetched_at: new Date().toISOString(),
      source: "osu-api",
    };
    return { score, fetched: true };
  }
}

async function hydrateVisiblePp(scores, mode) {
  const cache = await loadPpCache();
  let fetched = 0;
  let filled = 0;
  let cursor = 0;
  const workers = Array.from({ length: 6 }, async () => {
    while (cursor < scores.length) {
      const index = cursor;
      cursor += 1;
      const before = scores[index].pp;
      const result = await hydrateScorePp(scores[index], mode, cache);
      if (result.fetched) fetched += 1;
      if (!before && scores[index].pp) filled += 1;
    }
  });

  await Promise.all(workers);
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

async function osuFetch(pathname, params = {}, retry = true) {
  const url = new URL(`${osuApiBase}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }

  const token = await getAccessToken();
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${token}`,
      accept: "application/json",
      "x-api-version": "20220705",
    },
  });

  if (response.status === 401 && retry) {
    await getAccessToken(true);
    return osuFetch(pathname, params, false);
  }

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(payload.error || payload.message || `osu! API Fehler ${response.status}`);
    error.status = response.status;
    error.details = payload;
    throw error;
  }

  return payload;
}

async function getUserByName(username, mode) {
  return osuFetch(`/users/${encodeURIComponent(username)}/${mode}`, {
    key: "username",
  });
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

    const pageScores = await osuFetch(`/users/${userId}/scores/${options.type}`, params);
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

function compactScore(score) {
  const normalizedMods = normalizeMods(score.mods);

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
    original_pp: score.original_pp || null,
    pp_rank: score.pp_rank || null,
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
  const selectedMods = parseSelectedMods(url.searchParams.get("mods"));

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

  let filteredCandidates = history.scores
    .filter((score) => isAllowedClient(score, includeLazer))
    .filter((score) => (passesOnly ? isPassed(score) : true))
    .filter((score) => (rankedOnly ? isRankedBeatmap(score, includeLoved) : true))
    .filter((score) => modsMatch(score.normalized_mods || normalizeMods(score.mods), selectedMods, matchMode));

  const ppWorkLimit = sort === "pp" || rankMode === "pp" ? Math.max(finalLimit, 1000) : Math.max(finalLimit, 200);
  const ppWorkSet =
    sort === "pp" || rankMode === "pp"
      ? [...filteredCandidates]
          .sort((a, b) => effectivePp(b) - effectivePp(a) || compareScores(a, b, "score"))
          .slice(0, ppWorkLimit)
      : [...filteredCandidates].sort((a, b) => compareScores(a, b, sort)).slice(0, ppWorkLimit);

  const ppHydration = await hydrateVisiblePp(ppWorkSet, mode);
  const calculatedHydration = recalculatePp
    ? await hydrateCalculatedPp(ppWorkSet, mode, {
        force: true,
        max: ppWorkLimit,
      })
    : { attempted: 0, filled: 0, unavailable: false, errors: [] };

  if (ppHydration.filled > 0 || calculatedHydration.filled > 0) {
    updateStoredScores(user, mode, ppWorkSet);
  }

  const improvements = buildImprovements(filteredCandidates, improvementScope, bestMode).slice(0, 50);

  if (dateFilter === "today") {
    filteredCandidates = filteredCandidates.filter(isTodayScore);
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

  const filteredScores = filteredCandidates
    .sort((a, b) => compareScores(a, b, sort))
    .slice(0, finalLimit);

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
      matchMode,
      selectedMods,
      historyTotal: history.total,
      savedNow: history.savedNow,
      apiFetched: fetchedScores.length,
      huisFetched: huisScores.length,
      localImported: localImport.scores.length,
      localImportSources: localImport.sources,
      localImportWarnings: localImport.warnings,
      apiWarning,
      huisWarning,
      ppFetched: ppHydration.fetched,
      ppFilled: ppHydration.filled,
      ppCalculated: calculatedHydration.filled,
      ppCalculationAttempted: calculatedHydration.attempted,
      ppCalculationWarnings: calculatedHydration.errors,
      source: "sqlite-score-database",
      note:
        "Die App speichert alle gefundenen Scores lokal in SQLite. osu!api v2 liefert trotzdem keine komplette alte Score-Historie.",
    },
    improvements,
  });
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

    if (url.pathname === "/api/search") {
      return await handleSearch(req, res);
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
});
