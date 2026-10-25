# Three Strand Labs · the office

A cosy live office view of the Three Strand Labs team: James (Boss) and the Grok Bot team, Profiterole, Madeleine,
Crackers, Popelini, Cookies and Financier. Each bot has a name tag, role, colour and a
coarse status (working / chatting in the group / idle / **status unknown**), a short
one-line activity and when it was last active (in SGT). 2D canvas by default, 3D (three.js) one click away.

**Live (public, coarse status only): https://threestrandlabs.github.io/three-strand-office/**

## Avatars

Each person's avatar (`assets/avatars/`, see its README) shows in their name tag in the 2D and 3D office and on their status card,
with a thin Soy ring so light circles stay visible. James has a desk like everyone else; on a break he uses the shared chill zone.

## Break wing: private rooms + chill zone

To the right of the meeting room and pantry there's a break wing (`public/wing.js`, 2D and 3D):

- **Six small private rooms**, one per bot, with a name plate over each door, a floor tinted in the bot's colour and a personal touch:
  Profiterole (sofa + "Q4 plan" whiteboard), Madeleine (drawing desk + moodboard + beanbag), Crackers (monitor, keyboard + beanbag),
  Popelini (brand swatch board, posters + armchair), Cookies (ring light, phone tripod, cord backdrop + beanbag), Financier (armchair, ledger + plants).
- **Chill zone** (shared): TV + couch with a games console, snack bar (popcorn, chips, kaya toast, teh tarik), board-game table, record player + speaker, "CHILL ZONE" sign.
- **Who goes where:** *On a break* (idle) bots go to their own room (~85%) or the chill zone (~15%). Nobody else enters a private room.
  *Unknown* bots keep wandering the shared spaces with a grey "?". *Working / chatting* bots stay at their desks.


The 3D view is rebuilt with `npm install && npm run build` (esbuild + three.js, dev-only, local).

## Run it

```bash
./start.sh            # background server on http://localhost:4646 (loopback only)
./stop.sh
PORT=5000 ./start.sh  # another port
```

Node 18+, no `npm install`, no network calls, no sign-ups. S$0.

## Public copy on GitHub Pages

The same page is published as a static site from `docs/` on the `main` branch:
https://threestrandlabs.github.io/three-strand-office/

- In the static copy (`<html data-mode="static">`) the page reads `docs/status.json` and
  `docs/team.json` and re-fetches the status every 2 minutes. There is no server.
- `docs/status.json` holds **only** each bot's name, a coarse status
  (`working` / `chatting` / `on a break` / `unknown`) and an `updatedAt` time. No check-in notes,
  last-active times, sources, paths or ids are published.

```bash
./scripts/publish-status.sh            # regenerate docs/status.json; commit + push only if a status changed
./scripts/publish-status.sh --dry-run  # show what would be published
node scripts/build-site.js             # rebuild docs/ after changing the page or renderers (then commit + push)
```

`publish-status.sh` uses the same providers as the local server (`src/status.js`), validates the
output against a whitelist before writing it, and is safe to run on a schedule (it takes a lock and
does nothing when nothing changed). `updatedAt` is the time of the last published change.

## Where the status comes from (and how live it is)

Status is pluggable: `src/status.js` asks each provider in `src/providers/` in turn.

| Provider | What it knows | Live? |
|---|---|---|
| `checkins` | a bot (or James) writes `status/checkins/<Name>.json` with `working` / `chatting` / `idle` + a ≤60-char note | as live as the check-ins; they **expire after 30 min** |
| `box-traces` | newest *modification time* of files in `/home/box/agent-data/agents/<bot>/` (matched by `profile.json` name) | "last trace on this computer", never a state |

Check in from any bot's shell:

```bash
node scripts/checkin.js Crackers working "Building the office side app"
node scripts/checkin.js Madeleine chatting
node scripts/checkin.js Cookies idle
```

If no provider has a fresh state, the bot shows as **status unknown** (wandering with a grey "?").
We never invent activity. Why: Grok Bot keeps each bot's conversations on its servers, not on
this computer (the local stores have no transcript entries), and there is no local activity log
to watch. The office only knows what is reported to it.

To plug in a better source later (e.g. an official activity feed), add a provider file with
`read(member, now) -> { source, state, activity, lastActiveAt } | null` and list it in `PROVIDERS`.

## Privacy

Only coarse status: never message contents, chat text, attachments, settings or credentials.
The traces provider reads `profile.json` names and file mtimes only. The server answers
loopback (`localhost`) requests only and refuses other Host headers.

## Credits

- Office renderer (2D canvas + 3D three.js), page layout and server pattern: adapted from
  [Charonyuu/whatsmyagentdoing](https://github.com/Charonyuu/whatsmyagentdoing), MIT licence
  (see `LICENSE`, copyright the original author). Changes: Three Strand Labs palette, per-bot
  shirt colours, an "unknown" state, no self-update or scene downloads.
- 3D characters and furniture: [Kenney](https://kenney.nl) Mini Characters and Furniture Kit, CC0
  (`assets/kenney/`).
- Idea of showing Grok Bot teammates in the office: [tim164863-hue/grokbot-office](https://github.com/tim164863-hue/grokbot-office).
  It has no licence file, so none of its code is used here. We only read it to see how it got
  status: it's a static page that polls a `sessions.json` snapshot pushed to the repo.
- Cord logo and palette: Three Strand Labs brand (Pandan, Sambal, Soy, Coconut, Kaya).
