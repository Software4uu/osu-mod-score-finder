import { readFile } from "node:fs/promises";

let rosuPromise = null;

async function loadRosu() {
  if (!rosuPromise) {
    rosuPromise = import("rosu-pp-js").catch(() => null);
  }
  return rosuPromise;
}

function missCount(score) {
  const stats = score.statistics || {};
  return stats.miss || stats.count_miss || 0;
}

function accuracyPercent(score) {
  if (score.accuracy === null || score.accuracy === undefined) return null;
  const value = Number(score.accuracy);
  if (!Number.isFinite(value)) return null;
  return value > 1 ? value : value * 100;
}

function modsForPp(score) {
  const mods = Array.isArray(score.normalized_mods) ? score.normalized_mods : score.mods || [];
  const acronyms = mods
    .map((mod) => (typeof mod === "string" ? mod : mod?.acronym))
    .filter(Boolean)
    .filter((mod) => mod !== "NM");

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
    if (!["DT", "NC", "HT"].includes(acronym)) continue;

    const customSpeed = modSettingNumber(mod, [
      "speed_change",
      "speedChange",
      "SpeedChange",
      "clock_rate",
      "clockRate",
      "rate",
      "speed",
    ]);

    if (customSpeed !== null) return customSpeed;
    if (acronym === "HT") return 0.75;
    return 1.5;
  }

  return null;
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

async function calculateScorePp(score, mode, rosu) {
  const osuPath = score.beatmap?.local_osu_path;
  if (!osuPath) return null;

  const bytes = await readFile(osuPath);
  const beatmap = new rosu.Beatmap(new Uint8Array(bytes));

  if (beatmap.isSuspicious()) return null;

  if (mode !== "osu") {
    beatmap.convert(modeEnum(rosu, mode), modsForPp(score));
  }

  const attrs = new rosu.Performance(performanceOptions(rosu, score)).calculate(beatmap);
  return attrs?.pp ?? null;
}

export async function hydrateCalculatedPp(scores, mode, options = {}) {
  const rosu = await loadRosu();
  if (!rosu) {
    return { attempted: 0, filled: 0, unavailable: true, errors: ["rosu-pp-js ist nicht installiert."] };
  }

  const max = options.max ?? 250;
  const force = Boolean(options.force);
  let attempted = 0;
  let filled = 0;
  const errors = [];
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : null;

  for (const score of scores) {
    if (attempted >= max) break;
    if (!score?.beatmap?.local_osu_path) continue;
    if (!force && score.pp) continue;

    attempted += 1;
    try {
      const calculated = await calculateScorePp(score, mode, rosu);
      if (calculated === null || calculated === undefined) {
        onProgress?.({ attempted, filled });
        continue;
      }

      if (score.pp && !score.original_pp) score.original_pp = score.pp;
      score.pp = calculated;
      score.calculated_pp = calculated;
      score.pp_source = "rosu-current";
      score.pp_algorithm = "rosu-pp-js";
      filled += 1;
    } catch (error) {
      if (errors.length < 5) errors.push(error.message || String(error));
    }
    onProgress?.({ attempted, filled });
  }

  return { attempted, filled, unavailable: false, errors };
}
