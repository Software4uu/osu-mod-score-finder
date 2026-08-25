import { readFile } from "node:fs/promises";

const rosuPackageUrl = new URL("./node_modules/rosu-pp-js/package.json", import.meta.url);
const rosuRegistryUrl = "https://registry.npmjs.org/rosu-pp-js/latest";

let rosuPromise = null;
let engineStatusCache = null;
let engineStatusCheckedAt = 0;

async function loadRosu() {
  if (!rosuPromise) {
    rosuPromise = import("rosu-pp-js").catch(() => null);
  }
  return rosuPromise;
}

function compareVersion(a, b) {
  const left = String(a || "0").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const right = String(b || "0").split(".").map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(left.length, right.length);

  for (let index = 0; index < length; index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff !== 0) return diff;
  }

  return 0;
}

async function installedRosuVersion() {
  try {
    const raw = await readFile(rosuPackageUrl, "utf8");
    return JSON.parse(raw).version || null;
  } catch {
    return null;
  }
}

async function latestRosuVersion() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);

  try {
    const response = await fetch(rosuRegistryUrl, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.version || null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function ppEngineStatus() {
  const now = Date.now();
  if (engineStatusCache && now - engineStatusCheckedAt < 60 * 60 * 1000) return engineStatusCache;

  const installedVersion = await installedRosuVersion();
  const latestVersion = await latestRosuVersion();
  const outdated = Boolean(installedVersion && latestVersion && compareVersion(installedVersion, latestVersion) < 0);

  engineStatusCache = {
    name: "rosu-pp-js",
    installedVersion,
    latestVersion,
    outdated,
  };
  engineStatusCheckedAt = now;
  return engineStatusCache;
}

function missCount(score) {
  const stats = score.statistics || {};
  return stats.miss || stats.count_miss || 0;
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

function accuracyPercent(score) {
  if (score.accuracy === null || score.accuracy === undefined) return null;
  const value = Number(score.accuracy);
  if (!Number.isFinite(value)) return null;
  return value > 1 ? value : value * 100;
}

function modsForPp(score) {
  return modAcronymsForCalculation(score, { includeUnrankedGameplay: true });
}

function modsForDifficulty(score) {
  return modAcronymsForCalculation(score, { includeUnrankedGameplay: false });
}

function modAcronymsForCalculation(score, options = {}) {
  const includeUnrankedGameplay = Boolean(options.includeUnrankedGameplay);
  const mods = Array.isArray(score.normalized_mods) ? score.normalized_mods : score.mods || [];
  const acronyms = mods
    .map((mod) => (typeof mod === "string" ? mod : mod?.acronym))
    .filter(Boolean)
    .map((mod) => String(mod).toUpperCase())
    .filter((mod) => mod !== "NM")
    .filter((mod) => mod !== "RA")
    .filter((mod) => includeUnrankedGameplay || !unrankedGameplayMods.has(mod));

  if (score.client === "stable" && !acronyms.includes("CL")) {
    acronyms.push("CL");
  }

  return acronyms.join("");
}

function modSettingNumber(mod, keys) {
  const settings = mod?.settings || {};
  for (const key of keys) {
    const value = Number(settings[key] ?? mod?.[key]);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function clockRateForPp(score) {
  const mods = Array.isArray(score.normalized_mods) ? score.normalized_mods : score.mods || [];
  for (const mod of mods) {
    const acronym = String(typeof mod === "string" ? mod : mod?.acronym || "").toUpperCase();
    if (!clockRateModAcronyms.has(acronym)) continue;

    const customSpeed = modSettingNumber(mod, customRateKeys);

    if (customSpeed !== null) return customSpeed;
    return clockRateDefaultByMod.get(acronym) || null;
  }

  return null;
}

function isCustomClockRateMod(mod) {
  const acronym = String(typeof mod === "string" ? mod : mod?.acronym || "").toUpperCase();
  if (!clockRateModAcronyms.has(acronym)) return false;

  const customSpeed = modSettingNumber(mod, customRateKeys);
  if (customSpeed === null) return false;
  if (acronym === "RA") return true;
  return Math.abs(customSpeed - clockRateDefaultByMod.get(acronym)) > 0.001;
}

function unrankedScoreReason(score) {
  if (score.score_unranked_reason) return score.score_unranked_reason;

  const mods = Array.isArray(score.normalized_mods) ? score.normalized_mods : score.mods || [];
  for (const mod of mods) {
    const acronym = String(typeof mod === "string" ? mod : mod?.acronym || "").toUpperCase();
    if (mod?.ranked === false) return "unranked_mod";
    if (unrankedGameplayMods.has(acronym)) return acronym === "RX" ? "relax" : "unranked_mod";
    if (acronym === "RA" || isCustomClockRateMod(mod)) return "custom_rate";
  }

  return "";
}

function scorePpEligible(score) {
  return !unrankedScoreReason(score);
}

function modeEnum(rosu, mode) {
  if (mode === "taiko") return rosu.GameMode.Taiko;
  if (mode === "fruits") return rosu.GameMode.Catch;
  if (mode === "mania") return rosu.GameMode.Mania;
  return rosu.GameMode.Osu;
}

function performanceOptions(rosu, score) {
  const stats = score.statistics || {};
  const options = {
    mods: modsForPp(score),
    clockRate: clockRateForPp(score) ?? undefined,
    combo: score.max_combo || undefined,
    misses: missCount(score),
    accuracy: accuracyPercent(score) ?? undefined,
    n300: stats.great ?? stats.count_300 ?? undefined,
    n100: stats.ok ?? stats.count_100 ?? undefined,
    n50: stats.meh ?? stats.count_50 ?? undefined,
    nGeki: stats.geki ?? stats.count_geki ?? undefined,
    nKatu: stats.katu ?? stats.count_katu ?? undefined,
    hitresultPriority: rosu.HitResultPriority?.BestCase,
    lazer: score.client !== "stable",
  };

  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null || value === "") delete options[key];
  }

  return options;
}

function difficultyOptions(score) {
  const options = {
    mods: modsForDifficulty(score),
    clockRate: clockRateForPp(score) ?? undefined,
    lazer: score.client !== "stable",
  };

  for (const [key, value] of Object.entries(options)) {
    if (value === undefined || value === null || value === "") delete options[key];
  }

  return options;
}

function setIfNumber(target, key, value) {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    target[key] = parsed;
    return true;
  }
  return false;
}

function applyDisplayAttributes(score, difficulty) {
  score.beatmap ||= {};
  let changed = false;

  if (setIfNumber(score.beatmap, "effective_difficulty_rating", difficulty?.stars)) changed = true;

  const clockRate = clockRateForPp(score);
  if (clockRate && Number.isFinite(clockRate) && clockRate > 0) {
    score.beatmap.effective_clock_rate = clockRate;
    changed = true;

    const baseBpm = Number(score.beatmap.bpm || 0);
    if (baseBpm > 0 && setIfNumber(score.beatmap, "effective_bpm", baseBpm * clockRate)) changed = true;

    const baseTotalLength = Number(score.beatmap.total_length || 0);
    if (baseTotalLength > 0 && setIfNumber(score.beatmap, "effective_total_length", Math.round(baseTotalLength / clockRate))) changed = true;

    const baseHitLength = Number(score.beatmap.hit_length || 0);
    if (baseHitLength > 0 && setIfNumber(score.beatmap, "effective_hit_length", Math.round(baseHitLength / clockRate))) changed = true;
  }

  return changed;
}

async function calculateScoreMetrics(score, mode, rosu) {
  const osuPath = score.beatmap?.local_osu_path;
  if (!osuPath) return null;

  const bytes = await readFile(osuPath);
  const beatmap = new rosu.Beatmap(new Uint8Array(bytes));

  if (beatmap.isSuspicious()) return null;

  if (mode !== "osu") {
    beatmap.convert(modeEnum(rosu, mode), modsForDifficulty(score));
  }

  const difficulty = new rosu.Difficulty(difficultyOptions(score)).calculate(beatmap);
  const result = {
    pp: null,
    difficulty,
  };

  if (scorePpEligible(score)) {
    const attrs = new rosu.Performance(performanceOptions(rosu, score)).calculate(beatmap);
    result.pp = attrs?.pp ?? null;
    result.difficulty = attrs?.difficulty || difficulty;
  }

  return result;
}

export async function hydrateCalculatedPp(scores, mode, options = {}) {
  const engine = await ppEngineStatus();
  const rosu = await loadRosu();
  if (!rosu) {
    return { attempted: 0, filled: 0, enriched: 0, unavailable: true, errors: ["rosu-pp-js ist nicht installiert."], engine };
  }

  const max = options.max ?? 250;
  const force = Boolean(options.force);
  let attempted = 0;
  let filled = 0;
  let enriched = 0;
  const errors = [];
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;

  if (engine.outdated) {
    errors.push(
      `PP-Engine veraltet: rosu-pp-js ${engine.installedVersion} installiert, ${engine.latestVersion} ist aktuell. Starte setup-beta.bat oder start-beta.bat neu, damit die aktuelle Rework-Berechnung installiert wird.`
    );
  }

  for (const score of scores) {
    if (attempted >= max) break;
    if (!score?.beatmap?.local_osu_path) continue;
    if (!force && score.pp && score.beatmap?.effective_difficulty_rating) continue;

    attempted += 1;
    try {
      const calculated = await calculateScoreMetrics(score, mode, rosu);
      if (!calculated) {
        onProgress?.({ attempted, filled });
        continue;
      }

      if (applyDisplayAttributes(score, calculated.difficulty)) enriched += 1;

      const reason = unrankedScoreReason(score);
      score.score_unranked_reason = reason || null;
      score.pp_ranked = !reason;

      if (!reason && calculated.pp !== null && calculated.pp !== undefined) {
        if (score.pp && !score.original_pp) score.original_pp = score.pp;
        score.pp = calculated.pp;
        score.calculated_pp = calculated.pp;
        score.pp_source = "rosu-current";
        score.pp_algorithm = `rosu-pp-js@${engine.installedVersion || "unknown"}`;
        filled += 1;
      }
    } catch (error) {
      if (errors.length < 5) errors.push(error.message || String(error));
    }
    onProgress?.({ attempted, filled });
  }

  return { attempted, filled, enriched, unavailable: false, errors, engine };
}
