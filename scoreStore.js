import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, "data");
const dbPath = path.join(dataDir, "scores.sqlite");
const legacyHistoryPath = path.join(dataDir, "scores-history.json");

let db = null;

function stringify(value) {
  return JSON.stringify(value ?? null);
}

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function numberOrNull(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function boolInt(value) {
  return value ? 1 : 0;
}

function lower(value) {
  return String(value || "").toLowerCase();
}

function bucketKey(user, mode) {
  return `${mode}:${user.id}`;
}

function modsKey(score) {
  const mods = Array.isArray(score.normalized_mods) ? score.normalized_mods : score.mods || [];
  return mods
    .map((mod) => (typeof mod === "string" ? mod : mod?.acronym))
    .filter(Boolean)
    .join(",") || "NM";
}

function beatmapId(score) {
  return score.beatmap_id || score.beatmap?.id || null;
}

function beatmapChecksum(score) {
  return score.beatmap?.checksum || null;
}

function beatmapsetId(score) {
  return score.beatmapset?.id || score.beatmap?.beatmapset_id || null;
}

function missCount(score) {
  const stats = score.statistics || {};
  return stats.miss || stats.count_miss || 0;
}

function rankedStatus(score) {
  return String(score.beatmap?.status || score.beatmap?.ranked_status || "").toLowerCase() || null;
}

function scoreTime(score) {
  return Date.parse(score.ended_at || score.created_at || score.started_at || "") || 0;
}

function fallbackScoreKey(score) {
  return String(
    score.storage_key ||
      score.id ||
      score.legacy_score_id ||
      `${beatmapId(score) || beatmapChecksum(score) || "unknown-map"}-${scoreTime(score)}-${score.score}`
  );
}

function ensureDb() {
  if (db) return db;

  mkdirSync(dataDir, { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA synchronous = NORMAL;

    CREATE TABLE IF NOT EXISTS meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      bucket_key TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      mode TEXT NOT NULL,
      username TEXT NOT NULL,
      username_lower TEXT NOT NULL,
      avatar_url TEXT,
      country_code TEXT,
      statistics_json TEXT,
      raw_user_json TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scores (
      bucket_key TEXT NOT NULL,
      score_key TEXT NOT NULL,
      user_id TEXT NOT NULL,
      username TEXT NOT NULL,
      username_lower TEXT NOT NULL,
      mode TEXT NOT NULL,
      client TEXT,
      local_source TEXT,
      external_source TEXT,
      pp_source TEXT,
      pp REAL,
      calculated_pp REAL,
      beatmap_id TEXT,
      beatmap_checksum TEXT,
      beatmapset_id TEXT,
      mods_key TEXT,
      accuracy REAL,
      miss_count INTEGER,
      max_combo INTEGER,
      score_value INTEGER,
      rank TEXT,
      passed INTEGER,
      ranked_status TEXT,
      created_at TEXT,
      ended_at TEXT,
      score_json TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      PRIMARY KEY (bucket_key, score_key)
    );

    CREATE INDEX IF NOT EXISTS idx_users_name_mode ON users(username_lower, mode);
    CREATE INDEX IF NOT EXISTS idx_scores_user_mode ON scores(username_lower, mode);
    CREATE INDEX IF NOT EXISTS idx_scores_bucket_time ON scores(bucket_key, ended_at, created_at);
    CREATE INDEX IF NOT EXISTS idx_scores_bucket_pp ON scores(bucket_key, pp);
  `);

  migrateLegacyHistory();
  return db;
}

function getMeta(key) {
  return ensureDb().prepare("SELECT value FROM meta WHERE key = ?").get(key)?.value || null;
}

function setMeta(key, value) {
  ensureDb()
    .prepare(
      `INSERT INTO meta(key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`
    )
    .run(key, String(value));
}

function upsertUser(user, mode, now = new Date().toISOString()) {
  const key = bucketKey(user, mode);
  ensureDb()
    .prepare(
      `INSERT INTO users (
        bucket_key, user_id, mode, username, username_lower, avatar_url,
        country_code, statistics_json, raw_user_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(bucket_key) DO UPDATE SET
        username = excluded.username,
        username_lower = excluded.username_lower,
        avatar_url = excluded.avatar_url,
        country_code = excluded.country_code,
        statistics_json = excluded.statistics_json,
        raw_user_json = excluded.raw_user_json,
        updated_at = excluded.updated_at`
    )
    .run(
      key,
      String(user.id),
      mode,
      user.username,
      lower(user.username),
      user.avatar_url || null,
      user.country_code || null,
      stringify(user.statistics || null),
      stringify(user),
      now
    );
  return key;
}

function insertScore(bucket, user, mode, score, now, countNew) {
  const key = fallbackScoreKey(score);
  score.storage_key = key;

  const existing = ensureDb()
    .prepare("SELECT score_json FROM scores WHERE bucket_key = ? AND score_key = ?")
    .get(bucket, key);
  const existingScore = parseJson(existing?.score_json, null);

  if (existingScore) {
    if (!score.pp && existingScore.pp) {
      score.pp = existingScore.pp;
      score.pp_source = existingScore.pp_source || score.pp_source || null;
      score.calculated_pp = existingScore.calculated_pp || score.calculated_pp || null;
      score.original_pp = existingScore.original_pp || score.original_pp || null;
      score.pp_algorithm = existingScore.pp_algorithm || score.pp_algorithm || null;
    }

    if (!score.beatmap?.local_osu_path && existingScore.beatmap?.local_osu_path) {
      score.beatmap ||= {};
      score.beatmap.local_osu_path = existingScore.beatmap.local_osu_path;
    }
  }

  ensureDb()
    .prepare(
      `INSERT INTO scores (
        bucket_key, score_key, user_id, username, username_lower, mode, client,
        local_source, external_source, pp_source, pp, calculated_pp,
        beatmap_id, beatmap_checksum, beatmapset_id, mods_key, accuracy,
        miss_count, max_combo, score_value, rank, passed, ranked_status,
        created_at, ended_at, score_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(bucket_key, score_key) DO UPDATE SET
        client = excluded.client,
        local_source = excluded.local_source,
        external_source = excluded.external_source,
        pp_source = excluded.pp_source,
        pp = excluded.pp,
        calculated_pp = excluded.calculated_pp,
        beatmap_id = excluded.beatmap_id,
        beatmap_checksum = excluded.beatmap_checksum,
        beatmapset_id = excluded.beatmapset_id,
        mods_key = excluded.mods_key,
        accuracy = excluded.accuracy,
        miss_count = excluded.miss_count,
        max_combo = excluded.max_combo,
        score_value = excluded.score_value,
        rank = excluded.rank,
        passed = excluded.passed,
        ranked_status = excluded.ranked_status,
        created_at = excluded.created_at,
        ended_at = excluded.ended_at,
        score_json = excluded.score_json,
        updated_at = excluded.updated_at`
    )
    .run(
      bucket,
      key,
      String(user.id),
      user.username,
      lower(user.username),
      mode,
      score.client || null,
      score.local_source || null,
      score.external_source || null,
      score.pp_source || null,
      numberOrNull(score.pp),
      numberOrNull(score.calculated_pp),
      beatmapId(score) === null ? null : String(beatmapId(score)),
      beatmapChecksum(score),
      beatmapsetId(score) === null ? null : String(beatmapsetId(score)),
      modsKey(score),
      numberOrNull(score.accuracy),
      numberOrNull(missCount(score)),
      numberOrNull(score.max_combo),
      numberOrNull(score.score),
      score.rank || null,
      boolInt(score.passed !== false),
      rankedStatus(score),
      score.created_at || null,
      score.ended_at || null,
      stringify(score),
      now
    );

  return countNew && !existing ? 1 : 0;
}

function rowsToScores(rows) {
  return rows.map((row) => parseJson(row.score_json, {})).filter((score) => score && score.id);
}

function getScoresForBucket(bucket) {
  const rows = ensureDb()
    .prepare("SELECT score_json FROM scores WHERE bucket_key = ?")
    .all(bucket);
  return rowsToScores(rows);
}

function migrateLegacyHistory() {
  if (getMeta("legacy_history_migrated") === "1" || !existsSync(legacyHistoryPath)) return;

  const raw = readFileSync(legacyHistoryPath, "utf8");
  const history = parseJson(raw, null);
  if (!history?.users) {
    setMeta("legacy_history_migrated", "1");
    return;
  }

  const now = new Date().toISOString();
  const database = ensureDb();
  database.exec("BEGIN");
  try {
    for (const bucket of Object.values(history.users)) {
      if (!bucket?.user?.id || !bucket?.mode) continue;
      const user = {
        id: bucket.user.id,
        username: bucket.user.username,
        avatar_url: bucket.user.avatar_url,
        country_code: bucket.user.country_code,
      };
      const key = upsertUser(user, bucket.mode, now);
      for (const [scoreKey, score] of Object.entries(bucket.scores || {})) {
        if (!score || typeof score !== "object") continue;
        score.storage_key ||= scoreKey;
        insertScore(key, user, bucket.mode, score, now, false);
      }
    }
    setMeta("legacy_history_migrated", "1");
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function getStoredUserByName(username, mode) {
  const row = ensureDb()
    .prepare(
      `SELECT * FROM users
       WHERE username_lower = ? AND mode = ?
       ORDER BY updated_at DESC
       LIMIT 1`
    )
    .get(lower(username), mode);

  if (!row) return null;
  const rawUser = parseJson(row.raw_user_json, {}) || {};
  return {
    bucketKey: row.bucket_key,
    user: {
      ...rawUser,
      id: row.user_id,
      username: row.username,
      avatar_url: row.avatar_url,
      country_code: row.country_code,
      statistics: parseJson(row.statistics_json, rawUser.statistics || {}),
    },
  };
}

export function upsertStoredScores(user, mode, scores) {
  const now = new Date().toISOString();
  const key = upsertUser(user, mode, now);
  let savedNow = 0;
  const database = ensureDb();

  database.exec("BEGIN");
  try {
    for (const score of scores) {
      if (!score || typeof score !== "object") continue;
      savedNow += insertScore(key, user, mode, score, now, true);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }

  const allScores = getScoresForBucket(key);
  return {
    savedNow,
    total: allScores.length,
    scores: allScores,
  };
}

export function updateStoredScores(user, mode, scores) {
  const now = new Date().toISOString();
  const key = upsertUser(user, mode, now);
  const database = ensureDb();

  database.exec("BEGIN");
  try {
    for (const score of scores) {
      if (!score || typeof score !== "object") continue;
      insertScore(key, user, mode, score, now, false);
    }
    database.exec("COMMIT");
  } catch (error) {
    database.exec("ROLLBACK");
    throw error;
  }
}

export function getScoreStoreStats() {
  const row = ensureDb().prepare("SELECT COUNT(*) AS count FROM scores").get();
  return {
    path: dbPath,
    totalScores: row?.count || 0,
  };
}
