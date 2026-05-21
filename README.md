# osu! Mod Score Finder Beta

Local beta for an osu! score website. The app reads score data from your local osu! installation, the official osu!api, and optionally pp.huismetbenen. Found results are stored locally in `data/scores.sqlite`, so scores can still be viewed later even when they are no longer easy to reach online.

The tool is built for players who want to inspect mod-specific passes, compare tries on the same map, and understand progress beyond the normal osu! profile pages.

## Privacy

- `.env` contains Client ID, Client Secret, and local paths. This file is not committed.
- `data/` contains local score databases and is not committed.
- `node_modules/` and log files are not committed.
- Local osu! files are read, but not copied into this project.
- The beta is designed as a local-first tool. Your API credentials and local score history stay on your PC.

Before a GitHub upload, check with:

```bash
git status --ignored
```

In the output, `.env`, `data/`, `node_modules/`, and `*.log` must not appear as files to be committed.

## Setup

1. Run `setup-beta.bat`.
2. Select the missing install steps. Already installed items are shown but grayed out.
3. Enter `Client ID`, `Client Secret`, `osu! stable folder`, `osu!lazer folder`, and the local port.
4. Save.
5. Start the app with `start-beta.bat`.

You can create the osu! OAuth application here:

https://osu.ppy.sh/home/account/edit

Callback URL:

```text
http://localhost:5173/callback
```

Manual start:

```bash
npm install
npm start
```

Then open:

```text
http://127.0.0.1:5173
```

## Main features

- Search players by osu! name.
- Read osu!stable and osu!lazer scores separately.
- Filter mods, including lazer mods such as `CL`, `DA`, `RA`, and `AL`.
- Switch the UI language between English and German.
- Store found scores locally in SQLite.
- Show PP from osu!api, pp.huismetbenen, or local recalculation with `rosu-pp-js`.
- Optionally keep only the best try per map difficulty.
- Show PP rank windows such as `1` to `100`.
- Improvement view for last try, last hour, or today.
- Calendar view with played days, day details, and a PP range filter.
- Map detail view with all stored tries on the same difficulty.
- RP beta view for Relative Performance scoring.

## RP: Relative Performance

RP is an experimental score layer that tries to answer a different question than PP.

PP asks:

```text
How mechanically valuable is this score according to the current osu! performance system?
```

RP asks:

```text
How strong was this pass relative to the map, the leaderboard, and the known fail pressure of the map?
```

The RP view intentionally collapses the normal filter panel. It does not use the mod/date/rank filters above the page. In this beta, RP uses fixed rules so the numbers are easier to compare.

### RP System A: Estimate

This is the baseline system. It works with the score data that is already stored locally.

It uses:

- player combo
- map max combo, when available
- score accuracy
- miss count
- star rating
- pass/play ratio, when available

The app first creates a platform-independent internal score named `S_rp`.

```text
S_rp = (player_combo / map_max_combo * 70000)
     + (accuracy_percent / 100 * 30000)
```

This avoids comparing stable ScoreV1 directly with lazer ScoreV2. A perfect full-combo score reaches `100000` internal points.

When map or leaderboard data is missing, the estimate stays visible, but the confidence score goes down.

### RP System B: API anchor

This system adds online context from the official osu!api.

It tries to fetch:

- beatmap metadata
- `max_combo`
- `passcount`
- `playcount`
- `failtimes`
- modded difficulty attributes
- top scores on that beatmap leaderboard

The leaderboard anchor is calculated like this:

If at least 50 matching leaderboard scores are available:

```text
S_rp_avg50 = average S_rp of the top 50 leaderboard scores
```

If fewer than 50 matching leaderboard scores are available:

```text
S_rp_avg50 = S_rp of rank 1 * 0.75
```

If no usable leaderboard anchor is available, RP falls back to a local estimate and lowers confidence.

The map factor is:

```text
M_map = star_rating * (1 + (1 - success_rate))
```

Where:

```text
success_rate = passcount / playcount
```

The app protects the formula from unstable easy-map values by clamping the logarithmic part internally.

For scores inside a full top 50 leaderboard, RP uses a direct top-50 reward:

```text
RP = 95 + ((50 - rank) / 49) * 5
```

Rank 50 receives `95 RP`; rank 1 receives `100 RP`.

For all other scores:

```text
RP_pre = (S_rp_player / S_rp_avg50) * 95 * log10(M_map)
```

Then the estimated spike penalty is subtracted.

### RP System C: Replay exact status

This beta does not claim exact replay-based spike penalties yet.

The app does, however, show whether a score is a candidate for future replay-exact RP:

- `online replay available`: osu! says an online replay exists for this score.
- `local replay available`: the score came from a local `.osr` replay source.
- `no replay`: no replay is attached to this stored score.

Why this matters:

The normal score API tells us the result:

```text
98.20% acc, 1 miss, 170x combo
```

But RP wants to know where the mistake happened:

```text
Was the miss in the hardest spike of the map, or at an easy random point?
```

That requires replay-frame decoding. `.osr` replay data contains timing, cursor position, and key states. Once a decoder is added, the app can compare the replay frames against the `.osu` beatmap file and estimate real combo-break timestamps much more accurately.

Until then, replay-exact RP is shown as status only. Scores without replay data still get an estimate, but not a perfect spike analysis.

### Spike penalty in the current beta

The current beta uses an estimated penalty:

- normal misses count as combo breaks
- a likely slider break can be estimated when the score has no miss but a clearly broken combo
- osu! `failtimes` are used as a rough map pressure profile when available

This is useful, but not perfect. `failtimes` are not a complete global miss histogram for every mod combination. They are only a rough public signal from osu! beatmap data.

### Confidence badges

Every RP result includes a confidence value.

High confidence usually means:

- beatmap data was available
- max combo was available
- leaderboard anchor was available
- failtimes or map pressure data were available
- replay data exists or the score is otherwise well-supported

Lower confidence usually means:

- missing beatmap ID
- missing leaderboard data
- no failtimes
- no replay
- fallback values were needed

The RP number should always be read together with the confidence badge.

## Known limitations

- osu! does not expose complete old score history for every player.
- osu! does not expose exact miss or slider-break timestamps through the normal score API.
- osu! `failtimes` are not mod-specific global miss histograms.
- Online replay downloads are only useful when a replay exists and the app has a decoder for it.
- The current RP beta is strongest as a comparison and research tool, not as an official ranking replacement.

## Deutsch

Diese Beta ist ein lokales osu!-Score-Tool. Sie liest Daten aus deiner lokalen osu!-Installation, der offiziellen osu!api und optional pp.huismetbenen. Gefundene Scores werden lokal in `data/scores.sqlite` gespeichert.

Der neue RP-Bereich steht fuer `Relative Performance`. RP bewertet nicht nur, wie viel PP ein Score hat, sondern wie stark der Pass relativ zur Map, zum Leaderboard und zu den bekannten Fehlerdaten wirkt.

Die RP-Berechnung ist bewusst mehrstufig:

- **Estimate:** lokale Score-Daten, Combo, Accuracy, Misses und Map-Schwierigkeit.
- **API-Anker:** osu!api-Mapdaten, Top-Score-Anker, Failtimes und modifizierte Difficulty-Attribute.
- **Replay Exact Status:** zeigt, ob ein Score spaeter fuer exakte Replay-Auswertung geeignet ist.

Wichtig: Exakte Miss- und Sliderbreak-Zeitpunkte sind nicht als fertige oeffentliche API-Daten verfuegbar. Dafuer muss ein Replay dekodiert und mit der `.osu` Map-Datei verglichen werden. Diese Beta zeigt deshalb klar an, ob ein Wert geschaetzt oder gut gestuetzt ist.
