# Security Notes

This beta is intended to run locally.

Do not commit:

- `.env`
- `data/`
- `node_modules/`
- `*.log`
- exported replays or local osu! databases

The app stores configuration in `.env` on the user's own machine. The app reads local osu! paths configured by the user and stores collected scores in `data/scores.sqlite`.

Before publishing, run:

```powershell
git status --ignored
rg -n "OSU_CLIENT_SECRET=.*[^= ]|OSU_CLIENT_ID=.*[0-9]|client_secret|<dein_osu_name>" .
```

The search should only find placeholder names or documentation, not real credentials or private user data.
