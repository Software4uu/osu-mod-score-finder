import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { copyFile, mkdir, mkdtemp, rm } from "node:fs/promises";
import net from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

test("search applies grade/combo/miss filters before limits and preserves profile Top 200", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "osu-filter-test-"));
  let child;
  try {
    for (const name of ["package.json", "server.js", "scoreFilters.js", "scoreStore.js", "localImport.js", "ppCalculator.js"]) {
      await copyFile(new URL(`../${name}`, import.meta.url), path.join(directory, name));
    }
    await mkdir(path.join(directory, "data"));
    const { upsertStoredScores } = await import(pathToFileURL(path.join(directory, "scoreStore.js")));
    const user = { id: "filter-test", username: "FilterTest" };
    const score = (id, pp, rank, miss, flags = {}) => ({
      id, pp, pp_source: "osu-api", rank, statistics: { miss }, passed: true, max_combo: id * 100,
      score: 1000000, accuracy: 0.96, normalized_mods: [], mods: [], client: "stable",
      beatmap_id: id, beatmap: { id, status: "ranked", mode: "osu" },
      beatmapset: { artist: "Test", title: `Score ${id}` },
      ended_at: "2026-09-28T12:00:00Z", ...flags,
    });
    const scores = [
      score(1, 400, "S", 0, { perfect: true }),
      score(2, 390, "SH", 0, { perfect: false }),
      score(3, 380, "XH", 0, { is_perfect_combo: true }),
      score(4, 370, "A", 3),
      score(5, 360, "A", 7),
      score(6, 350, "A", 10),
      score(7, 340, "A", 0),
      ...Array.from({ length: 200 }, (_, i) => score(i + 100, 300 - i, "B", 1)),
      score(9001, 10, "D", 20, { beatmap_id: 9000, beatmap: { id: 9000, status: "ranked", mode: "osu" }, max_combo: 1000 }),
      score(9002, 5, "D", 20, { beatmap_id: 9000, beatmap: { id: 9000, status: "ranked", mode: "osu" }, max_combo: 2000 }),
    ];
    upsertStoredScores(user, "osu", scores);
    upsertStoredScores(user, "osu", [{ ...scores[0], perfect: null }]);
    const listener = net.createServer();
    listener.listen(0, "127.0.0.1");
    await once(listener, "listening");
    const port = listener.address().port;
    await new Promise(resolve => listener.close(resolve));
    child = spawn(process.execPath, ["--no-warnings", "server.js"], {
      cwd: directory, windowsHide: true, stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PORT: String(port), OSU_CLIENT_ID: "", OSU_CLIENT_SECRET: "", OSU_STABLE_DIR: path.join(directory, "missing-stable"), OSU_LAZER_DIR: path.join(directory, "missing-lazer") },
    });
    await Promise.race([
      once(child.stdout, "data"),
      once(child, "exit").then(([code]) => { throw new Error(`Test server exited: ${code}`); }),
    ]);
    const query = async (options, endpoint = "search") => {
      const params = new URLSearchParams({ username: "FilterTest", mode: "osu", useApiV2: "0", includeHuis: "0", recalculatePp: "0", rankMode: "none", limit: "2", sort: "missesDesc", ...options });
      const response = await fetch(`http://127.0.0.1:${port}/api/${endpoint}?${params}`);
      const data = await response.json();
      assert.equal(response.status, 200, data.error);
      return data;
    };
    const a = await query({ grade: "A", missMin: "3", missMax: "10" });
    assert.deepEqual(a.scores.map(s => s.id), [6, 5]);
    assert.deepEqual(a.passScores.map(s => s.id), [6, 5, 4]);
    assert.equal(a.profileTopScores.length, 200);
    assert.equal(a.profileTopScores[0].id, 1);
    assert.equal(a.profileTopScores[0].matches_search_filters, false);
    assert.deepEqual(a.profileTopScores.filter(s => s.matches_search_filters).map(s => s.id), [4, 5, 6]);
    assert.deepEqual((await query({ grade: "A", sort: "missesAsc" })).scores.map(s => s.id), [7, 4]);
    assert.deepEqual((await query({ grade: "S" })).scores.map(s => s.id), [1, 2]);
    assert.deepEqual((await query({ grade: "SS" })).scores.map(s => s.id), [3]);
    assert.deepEqual((await query({ combo: "fc" })).scores.map(s => s.id), [1, 3]);
    assert.deepEqual((await query({ combo: "notFc", missMax: "0" })).scores.map(s => s.id), [2]);
    assert.equal((await query({ combo: "fc", missMin: "1" })).scores.length, 0);
    const calendar = await query({ grade: "A", missMin: "7", month: "2026-09" }, "backfill-month");
    assert.equal(calendar.calendar.days[0].count, 2);
    const combos = await query({ comboMin: "400", comboMax: "600" });
    assert.deepEqual(combos.scores.map(s => s.id), [6, 5]);
    assert.deepEqual(combos.passScores.map(s => s.id), [6, 5, 4]);
    assert.deepEqual(combos.profileTopScores.filter(s => s.matches_search_filters).map(s => s.id), [4, 5, 6]);
    assert.deepEqual((await query({ combo: "fc", comboMin: "200" })).scores.map(s => s.id), [3]);
    const comboCalendar = await query({ comboMin: "400", comboMax: "600", month: "2026-09" }, "backfill-month");
    assert.equal(comboCalendar.calendar.days[0].count, 3);
    assert.deepEqual((await query({ comboMin: "400", comboMax: "600", sort: "comboDesc" })).scores.map(s => s.id), [6, 5]);
    assert.deepEqual((await query({ comboMin: "400", comboMax: "600", sort: "comboAsc" })).scores.map(s => s.id), [4, 5]);
    assert.deepEqual((await query({ grade: "D", bestMode: "combo" })).scores.map(s => s.id), [9002]);
    assert.deepEqual((await query({ grade: "D", bestMode: "pp" })).scores.map(s => s.id), [9001]);
    assert.deepEqual((await query({ grade: "D", bestMode: "combo", comboMax: "1500" })).scores.map(s => s.id), [9001]);
  } finally {
    if (child && child.exitCode === null) {
      const stopped = once(child, "exit");
      child.kill();
      await stopped;
    }
    // node:sqlite keeps the test database open until this test process exits on Windows.
    assert.equal(path.dirname(path.resolve(directory)), path.resolve(tmpdir()));
    assert.ok(path.basename(directory).startsWith("osu-filter-test-"));
    await rm(directory, { recursive: true, force: true, maxRetries: 1 }).catch(() => {});
  }
});
