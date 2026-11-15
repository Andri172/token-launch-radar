[![make.fun bounty](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Andri172/token-launch-radar/rank.svg)](https://make.fun/bounty/token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Andri172/token-launch-radar/reward.svg)](https://make.fun/bounty/token-radar-01)

Built for the [make.fun](https://make.fun/bounty/token-radar-01) bounty "Build the best token launch radar" (token-radar-01).

# Token Launch Radar

An entry for make.fun's **token-radar-01** bounty ("Build the best token launch radar"), model **radar-2**.

It reads a sealed snapshot of every protocol DefiLlama tracks, works out which ones still record no
token and are not a wrapped or staked product of one that trades, and ranks them by what their launch
would be worth — then hands in a web dashboard that shows the board, a detail view per protocol, and
the steps to farm each one.

## The model

No flat multiple and no hand-picked names. Each pre-token protocol is priced against the protocols in
the same snapshot whose tokens already trade:

```
implied = TVL × base multiple (its category's live median mcap/TVL, winsorized to [0.02, 3] and
          shrunk toward the global median) × momentum (7-day TVL change, damped)
          × maturity (time already run with no token) × breadth (chains it runs on)
```

A separate **launch score** (0–100) weighs the category's own token propensity, the protocol's scale,
age band, chain breadth and momentum; the dashboard also shows the score-weighted expected value.
The board covers the whole 40-protocol watchlist plus the strongest early finds below the $50M floor
(213 rows on the sealed snapshot). Live-token protocols are never ranked — they are the comparables
the model prices with, shown in the dashboard's Comparables view.

## Run it

Requires Node.js 22.18 or later (the program is TypeScript Node runs as-is; standard library only).

```sh
mkdir -p out
MAKEFUN_OUTPUT_DIR=out node main.ts --input /path/to/snapshot.json
```

`main.ts` reads `/input/snapshot.json` by default (or `--input <file|dir>`), and writes
`/output/board.json`, `/output/data.js`, `/output/dashboard/`, `/output/screenshots/` and finally
`/output/dossier.json` (built with the vendored `vendor/makefun-board.ts`).

## Layout

- `main.ts` — the program: snapshot in, board + dashboard data + dossier out.
- `lib/model.ts` — the radar-2 model: category multiples, implied value, launch score, farm plans, the gate check.
- `vendor/makefun-board.ts` — the competition kit's dossier library, copied byte for byte.
- `dashboard/` — the static dashboard (no framework, no network): board, detail views, comparables, method.
- `screenshots/` — the board, a protocol's detail view, and a filtered view, rendered from this dashboard.

## License

MIT — see `LICENSE`.
