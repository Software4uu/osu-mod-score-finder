import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const WINDOWS_TICKS_AT_UNIX_EPOCH = 621355968000000000n;
const MODE_NAMES = ["osu", "taiko", "fruits", "mania"];

const STABLE_MOD_BITS = [
  [1, "NF"],
  [2, "EZ"],
  [4, "TD"],
  [8, "HD"],
  [16, "HR"],
  [32, "SD"],
  [64, "DT"],
  [128, "RX"],
  [256, "HT"],
  [512, "NC"],
  [1024, "FL"],
  [2048, "AT"],
  [4096, "SO"],
  [8192, "AP"],
  [16384, "PF"],
  [32768, "K4"],
  [65536, "K5"],
  [131072, "K6"],
  [262144, "K7"],
  [524288, "K8"],
  [1048576, "FI"],
  [2097152, "RD"],
  [4194304, "CN"],
  [8388608, "TP"],
  [16777216, "K9"],
  [33554432, "CP"],
  [67108864, "K1"],
  [134217728, "K3"],
  [268435456, "K2"],
  [536870912, "V2"],
  [1073741824, "MR"],
];

const RANKED_STATUS = new Map([
  [0, "unknown"],
  [1, "unsubmitted"],
  [2, "graveyard"],
  [3, "unused"],
  [4, "ranked"],
  [5, "approved"],
  [6, "qualified"],
  [7, "loved"],
]);

const LAZER_STATUS = new Map([
  [-3, "graveyard"],
  [-2, "graveyard"],
  [-1, "wip"],
  [0, "pending"],
  [1, "ranked"],
  [2, "approved"],
  [3, "qualified"],
  [4, "loved"],
]);

let cache = null;
let cachePromise = null;

class BinaryReader {
  constructor(buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  ensure(length) {
    if (this.offset + length > this.buffer.length) {
      throw new Error("Unexpected end of file");
    }
  }

  byte() {
    this.ensure(1);
    const value = this.buffer.readUInt8(this.offset);
    this.offset += 1;
    return value;
  }

  bool() {
    return this.byte() !== 0;
  }

  short() {
    this.ensure(2);
    const value = this.buffer.readInt16LE(this.offset);
    this.offset += 2;
    return value;
  }

  int() {
    this.ensure(4);
    const value = this.buffer.readInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  uint() {
    this.ensure(4);
    const value = this.buffer.readUInt32LE(this.offset);
    this.offset += 4;
    return value;
  }

  long() {
    this.ensure(8);
    const value = this.buffer.readBigInt64LE(this.offset);
    this.offset += 8;
    return value;
  }

  float() {
    this.ensure(4);
    const value = this.buffer.readFloatLE(this.offset);
    this.offset += 4;
    return value;
  }

  double() {
    this.ensure(8);
    const value = this.buffer.readDoubleLE(this.offset);
    this.offset += 8;
    return value;
  }

  bytes(length) {
    this.ensure(length);
    const value = this.buffer.subarray(this.offset, this.offset + length);
    this.offset += length;
    return value;
  }

  uleb128() {
    let result = 0;
    let shift = 0;

    while (true) {
      const value = this.byte();
      result |= (value & 0x7f) << shift;
      if ((value & 0x80) === 0) return result;
      shift += 7;
    }
  }

  string() {
    const marker = this.byte();
    if (marker === 0x00) return "";
    if (marker !== 0x0b) {
      throw new Error(`Invalid string marker ${marker}`);
    }

    const length = this.uleb128();
    return this.bytes(length).toString("utf8");
  }
}

function localAppData() {
  return process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
}

function appData() {
  return process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
}

function ticksToIso(ticks) {
  if (!ticks || ticks <= 0n) return null;
  const ms = Number((ticks - WINDOWS_TICKS_AT_UNIX_EPOCH) / 10000n);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms).toISOString();
}

function modeName(mode) {
  return MODE_NAMES[mode] || "osu";
}

function modeIntFromName(mode) {
  const index = MODE_NAMES.indexOf(mode);
  return index >= 0 ? index : 0;
}

function modsFromBitmask(mask) {
  let mods = STABLE_MOD_BITS.filter(([bit]) => (mask & bit) !== 0).map(([, mod]) => mod);

  if (mods.includes("NC")) mods = mods.filter((mod) => mod !== "DT");
  if (mods.includes("PF")) mods = mods.filter((mod) => mod !== "SD");

  return mods.map((acronym) => ({ acronym, settings: null }));
}

function accuracyFor(score) {
  const total = score.count300 + score.count100 + score.count50 + score.countMiss;
  if (total <= 0) return 0;

  if (score.mode === 1) {
    return (score.count300 * 300 + score.count100 * 150) / (total * 300);
  }

  if (score.mode === 2) {
    const fruits = score.count300 + score.count100 + score.count50;
    const all = fruits + score.countKatu + score.countMiss;
    return all > 0 ? fruits / all : 0;
  }

  if (score.mode === 3) {
    const maniaTotal =
      score.countGeki +
      score.count300 +
      score.countKatu +
      score.count100 +
      score.count50 +
      score.countMiss;
    if (maniaTotal <= 0) return 0;

    return (
      score.countGeki * 300 +
      score.count300 * 300 +
      score.countKatu * 200 +
      score.count100 * 100 +
      score.count50 * 50
    ) / (maniaTotal * 300);
  }

  return (score.count300 * 300 + score.count100 * 100 + score.count50 * 50) / (total * 300);
}

function rankFor(score, accuracy, mods) {
  const total = score.count300 + score.count100 + score.count50 + score.countMiss;
  if (total <= 0) return "F";

  const ratio300 = score.count300 / total;
  const ratio50 = score.count50 / total;
  const hasSilver = mods.some((mod) => mod.acronym === "HD" || mod.acronym === "FL");
  let rank = "D";

  if (score.countMiss === 0 && score.count50 === 0 && score.count100 === 0) rank = "X";
  else if (ratio300 > 0.9 && ratio50 <= 0.01 && score.countMiss === 0) rank = "S";
  else if ((ratio300 > 0.8 && score.countMiss === 0) || ratio300 > 0.9) rank = "A";
  else if ((ratio300 > 0.7 && score.countMiss === 0) || ratio300 > 0.8) rank = "B";
  else if (ratio300 > 0.6 || accuracy > 0.6) rank = "C";

  if (hasSilver && rank === "X") return "XH";
  if (hasSilver && rank === "S") return "SH";
  return rank;
}

function rankedNumber(status) {
  if (status === "ranked") return 1;
  if (status === "approved") return 2;
  if (status === "loved") return 4;
  if (status === "qualified") return 3;
  return -2;
}

function readScorePayload(reader) {
  const mode = reader.byte();
  const version = reader.int();
  const beatmapMd5 = reader.string();
  const playerName = reader.string();
  const replayMd5 = reader.string();
  const count300 = reader.short();
  const count100 = reader.short();
  const count50 = reader.short();
  const countGeki = reader.short();
  const countKatu = reader.short();
  const countMiss = reader.short();
  const replayScore = reader.int();
  const maxCombo = reader.short();
  const perfect = reader.bool();
  const modsBitmask = reader.uint();
  const lifeBar = reader.string();
  const timestamp = reader.long();

  return {
    mode,
    version,
    beatmapMd5,
    playerName,
    replayMd5,
    count300,
    count100,
    count50,
    countGeki,
    countKatu,
    countMiss,
    replayScore,
    maxCombo,
    perfect,
    modsBitmask,
    lifeBar,
    timestamp,
  };
}

function readReplayFile(buffer) {
  const reader = new BinaryReader(buffer);
  const payload = readScorePayload(reader);
  const compressedLength = reader.int();
  if (compressedLength > 0) reader.bytes(compressedLength);
  payload.onlineScoreId = reader.offset + 8 <= buffer.length ? reader.long() : 0n;
  return payload;
}

function readScoresDb(buffer) {
  const reader = new BinaryReader(buffer);
  const dbVersion = reader.int();
  const beatmapCount = reader.int();
  const scores = [];

  for (let i = 0; i < beatmapCount; i += 1) {
    const beatmapMd5 = reader.string();
    const scoreCount = reader.int();

    for (let j = 0; j < scoreCount; j += 1) {
      const score = readScorePayload(reader);
      score.groupBeatmapMd5 = beatmapMd5;
      reader.int();
      score.onlineScoreId = reader.long();
      if ((score.modsBitmask & 8388608) !== 0 && reader.offset + 8 <= buffer.length) {
        score.targetPracticeAccuracy = reader.double();
      }
      scores.push(score);
    }
  }

  return { dbVersion, scores };
}

function readStarRatings(reader, dbVersion) {
  const count = reader.int();
  const values = new Map();

  for (let i = 0; i < count; i += 1) {
    reader.byte();
    const mods = reader.uint();
    reader.byte();
    const rating = dbVersion < 20250107 ? reader.double() : reader.float();
    values.set(mods, rating);
  }

  return values;
}

function readOsuDb(buffer) {
  const reader = new BinaryReader(buffer);
  const dbVersion = reader.int();
  reader.int();
  reader.bool();
  reader.long();
  const localPlayer = reader.string();
  const beatmapCount = reader.int();
  const beatmaps = new Map();

  for (let i = 0; i < beatmapCount; i += 1) {
    if (dbVersion < 20191106) reader.int();

    const artist = reader.string();
    const artistUnicode = reader.string();
    const title = reader.string();
    const titleUnicode = reader.string();
    const creator = reader.string();
    const version = reader.string();
    reader.string();
    const md5 = reader.string();
    const osuFile = reader.string();
    const rankedStatusCode = reader.byte();
    const countCircles = reader.short();
    const countSliders = reader.short();
    const countSpinners = reader.short();
    reader.long();
    const ar = dbVersion < 20140609 ? reader.byte() : reader.float();
    const cs = dbVersion < 20140609 ? reader.byte() : reader.float();
    const hp = dbVersion < 20140609 ? reader.byte() : reader.float();
    const od = dbVersion < 20140609 ? reader.byte() : reader.float();
    const sliderVelocity = reader.double();
    const stars = dbVersion >= 20140609 ? readStarRatings(reader, dbVersion) : new Map();
    if (dbVersion >= 20140609) {
      readStarRatings(reader, dbVersion);
      readStarRatings(reader, dbVersion);
      readStarRatings(reader, dbVersion);
    }

    const drainTime = reader.int();
    const totalTime = reader.int();
    const previewTime = reader.int();
    const timingPointCount = reader.int();
    let bpm = null;

    for (let t = 0; t < timingPointCount; t += 1) {
      const beatLength = reader.double();
      reader.double();
      const inherited = reader.bool();
      if (inherited && beatLength > 0 && !bpm) bpm = 60000 / beatLength;
    }

    const difficultyId = reader.int();
    const beatmapId = reader.int();
    const threadId = reader.int();
    reader.byte();
    reader.byte();
    reader.byte();
    reader.byte();
    reader.short();
    reader.float();
    const mode = reader.byte();
    const source = reader.string();
    const tags = reader.string();
    reader.short();
    reader.string();
    reader.bool();
    reader.long();
    reader.bool();
    const folderName = reader.string();
    reader.long();
    reader.bool();
    reader.bool();
    reader.bool();
    reader.bool();
    reader.bool();
    if (dbVersion < 20140609) reader.short();
    reader.int();
    reader.byte();

    if (md5) {
      const status = RANKED_STATUS.get(rankedStatusCode) || "unknown";
      beatmaps.set(md5, {
        artist,
        artist_unicode: artistUnicode,
        title,
        title_unicode: titleUnicode,
        creator,
        version,
        md5,
        osu_file: osuFile,
        folder_name: folderName,
        status,
        ranked: rankedNumber(status),
        count_circles: countCircles,
        count_sliders: countSliders,
        count_spinners: countSpinners,
        ar,
        cs,
        drain: hp,
        accuracy: od,
        slider_velocity: sliderVelocity,
        difficulty_rating: stars.get(0) || null,
        stars,
        total_length: Math.round(totalTime / 1000),
        hit_length: drainTime,
        preview_time: previewTime,
        bpm,
        mode: modeName(mode),
        mode_int: mode,
        difficulty_id: difficultyId,
        id: beatmapId > 0 ? beatmapId : null,
        thread_id: threadId,
        source,
        tags,
      });
    }
  }

  return { dbVersion, localPlayer, beatmaps };
}

async function readOptionalFile(filePath) {
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

async function listReplayFiles(dir) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".osr"))
      .map((entry) => path.join(dir, entry.name));
  } catch {
    return [];
  }
}

async function listReplayFilesRecursive(dir, maxDepth = 2) {
  const results = [];

  async function visit(current, depth) {
    if (depth > maxDepth) return;
    let entries = [];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) await visit(fullPath, depth + 1);
      else if (entry.isFile() && entry.name.toLowerCase().endsWith(".osr")) results.push(fullPath);
    }
  }

  await visit(dir, 0);
  return results;
}

function sourceStampItem(label, filePath) {
  try {
    const info = existsSync(filePath) ? null : null;
    return { label, filePath, exists: Boolean(info) };
  } catch {
    return { label, filePath, exists: false };
  }
}

async function buildSignature(paths) {
  const interesting = [
    paths.osuDb,
    paths.scoresDb,
    paths.replaysDir,
    paths.dataReplayDir,
    paths.lazerExportsDir,
    paths.lazerRealm,
  ];
  const parts = [];

  for (const filePath of interesting) {
    try {
      const info = await stat(filePath);
      parts.push(`${filePath}:${info.mtimeMs}:${info.size}`);
    } catch {
      parts.push(`${filePath}:missing`);
    }
  }

  return parts.join("|");
}

async function enrichBeatmapFromOsuFile(metadata, stableDir) {
  if (!metadata || !metadata.folder_name || !metadata.osu_file) {
    return metadata;
  }

  const osuPath = path.join(stableDir, "Songs", metadata.folder_name, metadata.osu_file);
  metadata.local_osu_path = osuPath;
  if (metadata.beatmapset_id) return metadata;

  const raw = await readOptionalFile(osuPath);
  if (!raw) return metadata;

  const text = raw.toString("utf8");
  const beatmapSetId = Number((text.match(/^BeatmapSetID\s*:\s*(-?\d+)/m) || [])[1]);
  const beatmapId = Number((text.match(/^BeatmapID\s*:\s*(-?\d+)/m) || [])[1]);

  if (Number.isFinite(beatmapSetId) && beatmapSetId > 0) metadata.beatmapset_id = beatmapSetId;
  if (Number.isFinite(beatmapId) && beatmapId > 0) metadata.id = beatmapId;
  return metadata;
}

function localScoreToAppScore(raw, metadata, source) {
  const mods = modsFromBitmask(raw.modsBitmask);
  const accuracy = accuracyFor(raw);
  const rank = rankFor(raw, accuracy, mods);
  const timestamp = ticksToIso(raw.timestamp);
  const beatmapStatus = metadata?.status || "unknown";
  const beatmapId = metadata?.id || null;
  const beatmapsetId = metadata?.beatmapset_id || null;
  const localId = `local:${source}:${raw.replayMd5 || raw.beatmapMd5}:${raw.timestamp.toString()}`;
  const onlineScoreId = raw.onlineScoreId && raw.onlineScoreId > 0n ? Number(raw.onlineScoreId) : null;

  return {
    id: localId,
    legacy_score_id: onlineScoreId,
    local_source: source,
    client: source.startsWith("lazer") ? "lazer" : "stable",
    ranked: ["ranked", "approved", "loved"].includes(beatmapStatus),
    preserved: true,
    processed: true,
    maximum_statistics: null,
    mods,
    normalized_mods: mods,
    score: raw.replayScore,
    accuracy,
    pp: null,
    max_combo: raw.maxCombo,
    passed: rank !== "F",
    rank,
    statistics: {
      great: raw.count300,
      ok: raw.count100,
      meh: raw.count50,
      geki: raw.countGeki,
      katu: raw.countKatu,
      miss: raw.countMiss,
    },
    created_at: timestamp,
    ended_at: timestamp,
    beatmap_id: beatmapId,
    beatmap: {
      beatmapset_id: beatmapsetId,
      difficulty_rating: metadata?.difficulty_rating || null,
      id: beatmapId,
      mode: metadata?.mode || modeName(raw.mode),
      status: beatmapStatus,
      total_length: metadata?.total_length || null,
      user_id: null,
      version: metadata?.version || "Unknown difficulty",
      accuracy: metadata?.accuracy || null,
      ar: metadata?.ar || null,
      bpm: metadata?.bpm || null,
      convert: false,
      count_circles: metadata?.count_circles || null,
      count_sliders: metadata?.count_sliders || null,
      count_spinners: metadata?.count_spinners || null,
      cs: metadata?.cs || null,
      drain: metadata?.drain || null,
      hit_length: metadata?.hit_length || null,
      is_scoreable: ["ranked", "approved", "loved", "qualified"].includes(beatmapStatus),
      mode_int: raw.mode,
      ranked: metadata?.ranked ?? -2,
      url: beatmapId ? `https://osu.ppy.sh/beatmaps/${beatmapId}` : null,
      checksum: raw.beatmapMd5,
      local_osu_path: metadata?.local_osu_path || null,
    },
    beatmapset: {
      artist: metadata?.artist || "Unknown artist",
      artist_unicode: metadata?.artist_unicode || metadata?.artist || "Unknown artist",
      covers: beatmapsetId
        ? {
            cover: `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/cover.jpg`,
            card: `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/card.jpg`,
            list: `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/list.jpg`,
          }
        : {},
      creator: metadata?.creator || "Unknown creator",
      id: beatmapsetId,
      status: beatmapStatus,
      title: metadata?.title || "Unknown title",
      title_unicode: metadata?.title_unicode || metadata?.title || "Unknown title",
      source: metadata?.source || "",
    },
    user: {
      username: raw.playerName,
    },
  };
}

function parseJsonObject(raw, fallback) {
  if (!raw) return fallback;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function plainString(value, fallback = "") {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function modsFromLazerJson(raw) {
  const mods = parseJsonObject(raw, []);
  if (!Array.isArray(mods)) return [];

  return mods
    .map((mod) => ({
      acronym: String(mod.acronym || mod.type || mod.name || "").toUpperCase(),
      settings: mod.settings || null,
    }))
    .filter((mod) => mod.acronym);
}

function lazerFilePath(lazerDir, hash) {
  if (!hash || hash.length < 2) return null;
  const filePath = path.join(lazerDir, "files", hash.slice(0, 1), hash.slice(0, 2), hash);
  return existsSync(filePath) ? filePath : null;
}

function lazerScoreToAppScore(score, lazerDir) {
  const beatmap = score.BeatmapInfo;
  const beatmapSet = beatmap?.BeatmapSet;
  const metadata = beatmap?.Metadata;
  const rulesetName = score.Ruleset?.ShortName || beatmap?.Ruleset?.ShortName || "osu";
  const modeInt = modeIntFromName(rulesetName);
  const status = LAZER_STATUS.get(Number(beatmap?.Status)) || "unknown";
  const mods = modsFromLazerJson(score.Mods);
  const stats = parseJsonObject(score.Statistics, {});
  const maxStats = parseJsonObject(score.MaximumStatistics, {});
  const creator = plainString(metadata?.Author?.Username || metadata?.Author?.Name, "Unknown creator");
  const rawForRank = {
    mode: modeInt,
    count300: stats.great || 0,
    count100: stats.ok || 0,
    count50: stats.meh || 0,
    countGeki: stats.perfect || 0,
    countKatu: stats.good || 0,
    countMiss: stats.miss || 0,
  };
  const accuracy = Number(score.Accuracy || accuracyFor(rawForRank) || 0);
  const onlineId = Number(score.OnlineID || -1);
  const legacyOnlineId = Number(score.LegacyOnlineID || -1);
  const realmId = String(score.ID);
  const beatmapId = Number(beatmap?.OnlineID || -1) > 0 ? Number(beatmap.OnlineID) : null;
  const beatmapsetId = Number(beatmapSet?.OnlineID || -1) > 0 ? Number(beatmapSet.OnlineID) : null;
  const endedAt = score.Date instanceof Date ? score.Date.toISOString() : null;
  const pp = score.PP === null || score.PP === undefined ? null : Number(score.PP);
  const localOsuPath = lazerFilePath(lazerDir, beatmap?.Hash);

  return {
    id: onlineId > 0 ? onlineId : `lazer-realm:${realmId}`,
    legacy_score_id: legacyOnlineId > 0 ? legacyOnlineId : null,
    local_source: "lazer-client-realm",
    client: "lazer",
    ranked: ["ranked", "approved", "loved"].includes(status),
    preserved: true,
    processed: true,
    maximum_statistics: maxStats,
    mods,
    normalized_mods: mods,
    score: Number(score.TotalScore || 0),
    accuracy,
    pp,
    pp_source: pp ? "lazer-local" : null,
    max_combo: Number(score.MaxCombo || score.Combo || 0),
    passed: rankFor(rawForRank, accuracy, mods) !== "F",
    rank: rankFor(rawForRank, accuracy, mods),
    statistics: {
      great: stats.great || 0,
      ok: stats.ok || 0,
      meh: stats.meh || 0,
      geki: stats.perfect || 0,
      katu: stats.good || 0,
      miss: stats.miss || 0,
    },
    created_at: endedAt,
    ended_at: endedAt,
    beatmap_id: beatmapId,
    beatmap: {
      beatmapset_id: beatmapsetId,
      difficulty_rating: Number(beatmap?.StarRating || 0) || null,
      id: beatmapId,
      mode: rulesetName,
      status,
      total_length: beatmap?.Length ? Math.round(Number(beatmap.Length) / 1000) : null,
      hit_length: beatmap?.Length ? Math.round(Number(beatmap.Length) / 1000) : null,
      user_id: null,
      version: beatmap?.DifficultyName || "Unknown difficulty",
      accuracy: beatmap?.Difficulty?.OverallDifficulty || null,
      ar: beatmap?.Difficulty?.ApproachRate || null,
      bpm: beatmap?.BPM || null,
      convert: false,
      count_circles: null,
      count_sliders: null,
      count_spinners: null,
      cs: beatmap?.Difficulty?.CircleSize || null,
      drain: beatmap?.Difficulty?.DrainRate || null,
      hit_length: beatmap?.Length ? Math.round(Number(beatmap.Length) / 1000) : null,
      is_scoreable: ["ranked", "approved", "loved", "qualified"].includes(status),
      mode_int: modeInt,
      ranked: rankedNumber(status),
      url: beatmapId ? `https://osu.ppy.sh/beatmaps/${beatmapId}` : null,
      checksum: beatmap?.MD5Hash || beatmap?.OnlineMD5Hash || beatmap?.Hash || score.BeatmapHash || null,
      local_osu_path: localOsuPath,
    },
    beatmapset: {
      artist: metadata?.Artist || "Unknown artist",
      artist_unicode: metadata?.ArtistUnicode || metadata?.Artist || "Unknown artist",
      covers: beatmapsetId
        ? {
            cover: `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/cover.jpg`,
            card: `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/card.jpg`,
            list: `https://assets.ppy.sh/beatmaps/${beatmapsetId}/covers/list.jpg`,
          }
        : {},
      creator,
      id: beatmapsetId,
      status,
      title: metadata?.Title || "Unknown title",
      title_unicode: metadata?.TitleUnicode || metadata?.Title || "Unknown title",
      source: metadata?.Source || "",
    },
    user: {
      id: score.User?.OnlineID || null,
      username: score.User?.Username || "",
      country_code: score.User?.CountryCode || "",
    },
  };
}

async function readLazerRealmScores(filePath, lazerDir) {
  if (!existsSync(filePath)) return { scores: [], warning: null };

  try {
    const Realm = (await import("realm")).default;
    const realm = await Realm.open({ path: filePath, readOnly: true });
    const scores = [];

    try {
      for (const score of realm.objects("Score")) {
        if (score.DeletePending) continue;
        scores.push(JSON.parse(JSON.stringify(lazerScoreToAppScore(score, lazerDir))));
      }
    } finally {
      realm.close();
    }

    return { scores, warning: null };
  } catch (error) {
    return {
      scores: [],
      warning: `client.realm konnte nicht gelesen werden: ${error.message}`,
    };
  }
}

async function buildLocalCache() {
  const stableDir = process.env.OSU_STABLE_DIR || path.join(localAppData(), "osu!");
  const lazerDir = process.env.OSU_LAZER_DIR || path.join(appData(), "osu");
  const paths = {
    stableDir,
    lazerDir,
    osuDb: path.join(stableDir, "osu!.db"),
    scoresDb: path.join(stableDir, "scores.db"),
    replaysDir: path.join(stableDir, "Replays"),
    dataReplayDir: path.join(stableDir, "Data", "r"),
    lazerExportsDir: path.join(lazerDir, "exports"),
    lazerRealm: path.join(lazerDir, "client.realm"),
  };

  const signature = await buildSignature(paths);
  if (cache?.signature === signature) return cache;

  if (cachePromise) return cachePromise;
  cachePromise = rebuildLocalCache(paths, signature);
  try {
    return await cachePromise;
  } finally {
    cachePromise = null;
  }
}

async function rebuildLocalCache(paths, signature) {
  const warnings = [];
  const sources = [];
  let beatmaps = new Map();

  const osuDbBuffer = await readOptionalFile(paths.osuDb);
  if (osuDbBuffer) {
    try {
      beatmaps = readOsuDb(osuDbBuffer).beatmaps;
      sources.push({ name: "osu!.db", count: beatmaps.size });
    } catch (error) {
      warnings.push(`osu!.db konnte nicht gelesen werden: ${error.message}`);
    }
  }

  const rawScores = [];
  const scoresDbBuffer = await readOptionalFile(paths.scoresDb);
  if (scoresDbBuffer) {
    try {
      const parsed = readScoresDb(scoresDbBuffer);
      rawScores.push(...parsed.scores.map((score) => ({ score, source: "stable-scoresdb" })));
      sources.push({ name: "scores.db", count: parsed.scores.length });
    } catch (error) {
      warnings.push(`scores.db konnte nicht gelesen werden: ${error.message}`);
    }
  }

  const replaySources = [
    { dir: paths.replaysDir, source: "stable-exported-replay", recursive: false },
    { dir: paths.dataReplayDir, source: "stable-internal-replay", recursive: false },
    { dir: paths.lazerExportsDir, source: "lazer-exported-replay", recursive: true },
  ];

  for (const replaySource of replaySources) {
    const files = replaySource.recursive
      ? await listReplayFilesRecursive(replaySource.dir)
      : await listReplayFiles(replaySource.dir);
    let imported = 0;

    for (const file of files) {
      try {
        const buffer = await readFile(file);
        rawScores.push({ score: readReplayFile(buffer), source: replaySource.source });
        imported += 1;
      } catch {
        // Some local replay files can be partial or from a newer format. Skip them.
      }
    }

    sources.push({ name: replaySource.source, count: imported });
  }

  const dedupedRawScores = new Map();
  const sourcePriority = new Map([
    ["stable-scoresdb", 4],
    ["stable-exported-replay", 3],
    ["stable-internal-replay", 2],
    ["lazer-exported-replay", 1],
  ]);

  for (const item of rawScores) {
    const key = [
      item.score.mode,
      item.score.beatmapMd5 || item.score.groupBeatmapMd5,
      item.score.timestamp.toString(),
      item.score.replayScore,
      item.score.modsBitmask,
    ].join(":");
    const existing = dedupedRawScores.get(key);
    const existingPriority = existing ? sourcePriority.get(existing.source) || 0 : -1;
    const nextPriority = sourcePriority.get(item.source) || 0;
    if (!existing || nextPriority > existingPriority) dedupedRawScores.set(key, item);
  }

  const appScores = [];
  const enriched = new Map();

  for (const item of dedupedRawScores.values()) {
    const metadata = beatmaps.get(item.score.beatmapMd5) || beatmaps.get(item.score.groupBeatmapMd5);
    if (metadata && !enriched.has(metadata.md5)) {
      try {
        await enrichBeatmapFromOsuFile(metadata, paths.stableDir);
      } catch {
        // Metadata from osu!.db is enough for display if .osu is unavailable.
      }
      enriched.set(metadata.md5, true);
    }

    appScores.push(localScoreToAppScore(item.score, metadata, item.source));
  }

  const realmImport = await readLazerRealmScores(paths.lazerRealm, paths.lazerDir);
  if (realmImport.warning) warnings.push(realmImport.warning);
  if (realmImport.scores.length) {
    appScores.push(...realmImport.scores);
    sources.push({ name: "client.realm", count: realmImport.scores.length });
  }

  cache = {
    signature,
    scores: appScores,
    sources,
    warnings,
    paths,
  };
  return cache;
}

export async function importLocalScores({ username, userId, mode }) {
  const local = await buildLocalCache();
  const wantedUser = String(username || "").toLowerCase();
  const wantedUserId = Number(userId);
  const hasWantedUserId = Number.isFinite(wantedUserId) && wantedUserId > 1;
  const wantedMode = String(mode || "osu");

  const scores = local.scores.filter((score) => {
    const scoreUser = String(score.user?.username || "").toLowerCase();
    const scoreUserId = Number(score.user?.id);
    const hasScoreUserId = Number.isFinite(scoreUserId) && scoreUserId > 1;
    const idMatches = hasWantedUserId && hasScoreUserId && scoreUserId === wantedUserId;
    const usernameMatches = scoreUser === wantedUser;
    const userMatches = idMatches || (usernameMatches && (!hasWantedUserId || !hasScoreUserId));
    return userMatches && score.beatmap?.mode === wantedMode;
  });

  return {
    scores,
    sources: local.sources,
    warnings: local.warnings,
    totalLocalScores: local.scores.length,
  };
}
