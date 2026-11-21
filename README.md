# Vice Cover Studio v2

[![Make.fun](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/xeraaGH/gta6-cover-art-01-v2/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)
[![Reward](https://make.fun/badge/gta6-cover-art-01/xeraaGH/gta6-cover-art-01-v2/reward.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard)

Turn a photo + caption into GTA 6-style cover art. Open `app/index.html` in a browser (works offline) or run `node serve.ts` and open http://localhost:8080.

## What it does

- **4 layouts**: Poster (3 vertical panels), Grid (2×2), Hero (1 big + 2 small), Quad (2×2, 4 distinct photos), plus a Strip 4-panel vertical layout.
- **4 grades**: Sunset, Neon, Night Shift (dark blue-purple), None — applied to EVERY panel, plus per-panel grade controls.
- **Bold outlined title** stacked over the grid (dark band, outline, slight slant, shadow, auto-fit, 2-line wrap) with a script subtitle.
- **Stickers**: 5 vector stickers (palm, sun, star, bolt, seal) you can drag onto the cover.
- **Editor**: photo library (5 photos), click a panel to select it, drag to pan, zoom slider, drag-and-drop photos (library → panel, file → panel), caption text/position/size/colour.
- **Export**: full-size PNG in 1080×1080, 1080×1350, or 1920×1080, downloaded straight from the browser.

## Why v2

Entry #1 ("Vice Cover Studio") scored 0.703390 — it beat every weak/mid anchor but lost all 5 games to the strongest anchor. v2 fixes every repeated loss reason: a distinct photo in every panel (never the same photo twice in one cover), a grade on all panels, bold outlined stacked titles, a 4-panel layout + NIGHT SHIFT neon variant, an original poster design (no official-artwork composition), and a more polished editor (per-panel grade, stickers, drag-and-drop).

## Run it

```sh
node serve.ts   # then open http://localhost:8080
```

No build step, no network. All assets are local; the Anton and Pacifico fonts ship under `app/fonts/` under the SIL Open Font License.

Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty. Referral: https://make.fun/r/mk5wvbzz
