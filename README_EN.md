# osu! Mod Score Finder Beta

Local beta for an osu! score website. The app reads score data only from the local osu! installation, from the official osu! API, and optionally from pp.huismetbenen, then stores found results locally in `data/scores.sqlite`.

For viewing, there are also:

- `README.html` for the browser
- `README.ipynb` as a notebook view

## Privacy

- `.env` contains Client ID, Client Secret, and local paths. This file is not committed.
- `data/` contains local score databases and is not committed.
- `node_modules/` and log files are not committed.
- Local osu! files are read, but not copied into this project.

Before a GitHub upload, check with:

```bash
git status --ignored
```

In the output, `.env`, `data/`, `node_modules/`, and `*.log` must not appear as files to be committed.

## Setup for users

1. Run `setup-beta.bat`.
2. In the window, check whether Node.js and project dependencies are available.
3. Missing items remain selectable, available items are grayed out.
4. Enter `Client ID`, `Client Secret`, `osu! stable folder`, and `osu!lazer folder`.
5. Save.
6. Then run `start-beta.bat`.

You can create the osu! OAuth data here:

https://osu.ppy.sh/home/account/edit

Callback URL:

```text
http://localhost:5173/callback
```

## What the app does

- Search for players by name
- Separately display stable and lazer score collections
- Filter mods, including osu!lazer mods such as `CL`, `DA`, `RA`, `AL`
- Switch the UI directly between German and English at the top right
- Store scores locally in SQLite so that not everything must always be reachable online later
- Show PP from API, pp.huismetbenen, or locally recalculated
- Optionally show only the best try for each map/difficulty
- Display PP rank windows such as `1b` to `5s`
- Improvement view for the latest try, the last hour, or today

## Start

Run:

```bash
./start-beta.bat
```

Or manually:

```bash
npm install
npm start
```

Then open:

http://localhost:5173
