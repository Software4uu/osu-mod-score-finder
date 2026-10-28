export function scoreMisses(score) {
  return Number(score.statistics?.miss ?? score.statistics?.count_miss ?? 0);
}

export function fullComboState(score) {
  if (score.passed === false || score.rank === "F" || scoreMisses(score) > 0) return false;
  const flags = score.client === "stable"
    ? [score.legacy_perfect, score.perfect, score.is_perfect_combo]
    : [score.is_perfect_combo, score.perfect, score.legacy_perfect];
  for (const flag of flags) {
    if (typeof flag === "boolean") return flag;
  }
  const maxCombo = Number(score.beatmap?.max_combo);
  const combo = Number(score.max_combo);
  if (maxCombo > 0 && Number.isFinite(combo) && combo > 0) return combo >= maxCombo;
  // Zero misses cannot confirm an FC: the score may contain sliderbreaks.
  return null;
}

export function parseScoreFilters(params) {
  const bound = (key) => {
    const value = params.get(key);
    if (value === null || value.trim() === "") return null;
    const number = Number(value);
    if (!Number.isSafeInteger(number) || number < 0) {
      const error = new Error("Miss- und Combo-Grenzen muessen ganze Zahlen ab 0 sein.");
      error.status = 400;
      throw error;
    }
    return number;
  };
  let missMin = bound("missMin");
  let missMax = bound("missMax");
  let comboMin = bound("comboMin");
  let comboMax = bound("comboMax");
  if (comboMin !== null && comboMax !== null && comboMin > comboMax) [comboMin, comboMax] = [comboMax, comboMin];
  if (missMin !== null && missMax !== null && missMin > missMax) [missMin, missMax] = [missMax, missMin];
  const grade = String(params.get("grade") || "all").toUpperCase();
  const combo = params.get("combo") || "all";
  return {
    grade: ["SS", "S", "A", "B", "C", "D"].includes(grade) ? grade : "all",
    combo: ["fc", "notFc"].includes(combo) ? combo : "all",
    missMin,
    missMax,
    comboMin,
    comboMax,
  };
}

export function matchesScoreFilters(score, filters) {
  const rank = String(score.rank || "").toUpperCase();
  const grade = ["X", "XH", "SSH", "SS"].includes(rank) ? "SS" : rank === "SH" ? "S" : rank;
  if (filters.grade !== "all" && grade !== filters.grade) return false;
  const misses = scoreMisses(score);
  if (filters.comboMin != null || filters.comboMax != null) {
    const combo = score.max_combo;
    if (combo == null || combo === "" || !Number.isFinite(Number(combo))) return false;
    if (filters.comboMin != null && Number(combo) < filters.comboMin) return false;
    if (filters.comboMax != null && Number(combo) > filters.comboMax) return false;
  }
  if (filters.missMin !== null && misses < filters.missMin) return false;
  if (filters.missMax !== null && misses > filters.missMax) return false;
  if (filters.combo !== "all") {
    const fc = fullComboState(score);
    if (fc === null || fc !== (filters.combo === "fc")) return false;
  }
  return true;
}
