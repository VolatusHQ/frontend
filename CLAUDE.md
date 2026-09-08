@AGENTS.md

# This app has two surfaces

`app/` is the marketing page at `/`. `app/app/` is the application at `/app`. They share
tokens and nothing else — no components, no stylesheet, no layout.

| | `/` | `/app` |
|---|---|---|
| Styles | `globals.css`, hand-written | `app/app.css`, Tailwind utilities + shadcn |
| Spec | `../../DESIGN.md` §14 | `../../DESIGN.md` **§15** |
| Sections | content-height, one column | viewport-filling, main + sticky rail |
| Reveals | every block via `<Reveal>` | none — data must be visible immediately |
| Live numbers | none | many, and each must be attributable |

**Read `DESIGN.md` §15 before touching anything under `app/app/`.**

## Three things that will bite

1. **Tailwind's preflight is deliberately not imported.** `app/app/app.css` pulls only
   `theme.css` and `utilities.css`. Importing preflight would reset the landing page, which
   shares the same document. The cost is that the user-agent's own form styling survives, so
   `app.css` re-adds a button/input reset — and that reset lives in `@layer base`.

2. **Layer order is load-bearing.** Unlayered CSS beats every layered rule regardless of
   specificity, so an unlayered `.vx button { background: none }` silently overrides
   `bg-pink` and every other utility. App chrome goes in `@layer components`, resets in
   `@layer base`. Never add unlayered element rules to `app.css`.

3. **Font tokens are two-tier, on purpose.** `fonts.ts` generates `--font-newsreader`,
   `--font-hanken` and `--font-martian`; `tokens.css` maps those to `--font-display`,
   `--font-ui`, `--font-mono`. They must not share names. When they did, each token
   referenced itself, which is invalid at computed-value time, and the entire site rendered
   in Times New Roman without erroring. Fixed 2026-09-02 — do not "simplify" it back.

## Before calling frontend work done

Run **`../../FRONTEND_VERIFIER.md`**. Screenshot every route at three widths, open each
image, and answer its checks in writing. A check answered from the code does not count.
