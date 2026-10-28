import assert from "node:assert/strict";
import test from "node:test";
import { fullComboState, matchesScoreFilters, parseScoreFilters } from "../scoreFilters.js";

const filters = (query = "") => parseScoreFilters(new URLSearchParams(query));
const score = (miss = 0, extra = {}) => ({ rank: "A", passed: true, statistics: { miss }, ...extra });

test("achieved combo range is inclusive and independent of FC", () => {
  const check = (combo, query) => matchesScoreFilters(score(0, { max_combo: combo }), filters(query));
  assert.equal(check(200, "comboMin=200&comboMax=300"), true);
  assert.equal(check(300, "comboMin=200&comboMax=300"), true);
  assert.equal(check(199, "comboMin=200"), false);
  assert.equal(check(301, "comboMax=300"), false);
  assert.equal(check(0, "comboMax=0"), true);
  assert.equal(check(undefined, "comboMin=0"), false);
  assert.equal(check(null, "comboMax=300"), false);
  assert.equal(check(undefined, ""), true);
  assert.deepEqual(filters("comboMin=300&comboMax=200"), filters("comboMin=200&comboMax=300"));
  assert.equal(matchesScoreFilters(score(0, { max_combo: 250, perfect: true }), filters("combo=fc&comboMin=200")), true);
  for (const value of ["-1", "1.5", "NaN", "Infinity"]) {
    assert.throws(() => filters(`comboMin=${value}`), { status: 400 });
  }
});

test("miss boundaries are inclusive, open-ended, and accept zero", () => {
  assert.equal(matchesScoreFilters(score(0), filters("missMax=0")), true);
  assert.equal(matchesScoreFilters(score(1), filters("missMax=0")), false);
  assert.equal(matchesScoreFilters(score(3), filters("missMin=3&missMax=7")), true);
  assert.equal(matchesScoreFilters(score(7), filters("missMin=3&missMax=7")), true);
  assert.equal(matchesScoreFilters(score(8), filters("missMin=3&missMax=7")), false);
  assert.equal(matchesScoreFilters(score(100), filters("missMin=5")), true);
  assert.deepEqual(filters("missMin=7&missMax=3"), filters("missMin=3&missMax=7"));
  assert.equal(matchesScoreFilters(score(0, { statistics: { count_miss: "4" } }), filters("missMin=4&missMax=4")), true);
  for (const value of ["-1", "1.5", "NaN", "Infinity", "999999999999999999999"]) {
    assert.throws(() => filters(`missMin=${value}`), { status: 400 });
  }
});

test("S and SS include silver variants but not other grades", () => {
  for (const rank of ["S", "SH"]) assert.equal(matchesScoreFilters(score(0, { rank }), filters("grade=S")), true);
  for (const rank of ["X", "XH", "SS", "SSH"]) {
    assert.equal(matchesScoreFilters(score(0, { rank }), filters("grade=SS")), true);
    assert.equal(matchesScoreFilters(score(0, { rank }), filters("grade=S")), false);
  }
  assert.equal(matchesScoreFilters(score(), filters("grade=A")), true);
  assert.equal(matchesScoreFilters(score(), filters("grade=S")), false);
});

test("FC distinguishes sliderbreaks and unknown combo from zero misses", () => {
  assert.equal(fullComboState(score(0, { perfect: true })), true);
  assert.equal(fullComboState(score(0, { perfect: false })), false);
  assert.equal(fullComboState(score(0, { is_perfect_combo: true })), true);
  assert.equal(fullComboState(score(0, { client: "stable", legacy_perfect: false, is_perfect_combo: true })), false);
  assert.equal(fullComboState(score(1, { perfect: true })), false);
  assert.equal(fullComboState(score(0, { passed: false, perfect: true })), false);
  assert.equal(fullComboState(score(0, { max_combo: 200, beatmap: { max_combo: 200 } })), true);
  assert.equal(fullComboState(score(0, { max_combo: 150, beatmap: { max_combo: 200 } })), false);
  assert.equal(fullComboState(score(0)), null);
  assert.equal(matchesScoreFilters(score(0), filters("combo=fc")), false);
  assert.equal(matchesScoreFilters(score(0), filters("combo=notFc")), false);
  assert.equal(matchesScoreFilters(score(0, { perfect: false }), filters("combo=notFc&missMax=0")), true);
  assert.equal(matchesScoreFilters(score(0, { perfect: true }), filters("combo=fc&grade=A&missMax=0")), true);
  assert.equal(matchesScoreFilters(score(1), filters("combo=fc&missMin=1")), false);
});
