# Scenario 01 — Vite SPA, realistic

## What this is

A plausible small application, not an isolating fixture. "Readwell" is a reading app
built the way a person would build one today: Vite, React, TypeScript and Tailwind,
with the libraries Lovable's older documented stack used.

- **Routes** with React Router DOM: `/`, `/posts`, `/posts/:postId` (the dynamic
  segment), `/contact`, `/about`, and a catch-all not-found page.
- **A shared layout** with navigation (`src/components/Layout.tsx`).
- **A form with client-side validation**: the contact form, validated with zod,
  including a date that may not be in the past (`src/lib/contactSchema.ts`).
- **A data layer** fetching from JSONPlaceholder, a public read-only API that needs no
  key, through TanStack Query, with loading and error states
  (`src/lib/api.ts`, `src/hooks/usePosts.ts`, `src/components/StatusMessage.tsx`).
- **Ordinary dependencies**: `date-fns` and `lucide-react`.
- **Nineteen files**, fifteen of them under `src/` in `components/`, `hooks/`, `lib/` and
  `pages/` — small enough to read, large enough that a wholesale rewrite would be
  visible in the diff.

No secrets, no `.env`, nothing private. No lockfile, for the same reason the fixtures
have none: how a platform resolves dependencies is part of what is being tested.

## What it probes

**The headline claim.** stackfit's most important sentence will be that a Vite project
imports into Lovable cleanly. So far that rests on `01-vite-react-spa`, a single
component. A false "works" costs a trust tool far more than a false "breaks", so the
happy path needs checking at realistic scale before it is published.

**React Router DOM against Lovable's TanStack scaffold.** Lovable's own template
(`5081cd0`, see `fixtures/evidence/lovable-template-5081cd0.txt`) is TanStack Start with
file routes. React Router DOM matches Lovable's older documented stack. Whether an app
built that way still imports cleanly is untested.

**The dev server it lands on.** Lovable's dev server runs whatever `scripts.dev` said
when it started and is not restarted when an import arrives. For fixture 02 that meant
a Vite server that could not serve a Next.js project. This project _is_ Vite, and Vite
restarts itself when its config file changes, so the already-running server may well
pick it up. That is a prediction, not an observation.

**It did not.** On 2026-09-12 the running server still held the scaffold's config and
returned HTTP 500 — by the agent's `curl` output — until Lovable's agent restarted it. The prediction stands here as the
record of what was expected.

**Fix build, on a codebase big enough to show what it touches.** The scripts are what
`npm create vite` produces: `dev`, `build`, `preview`. There is deliberately no
`build:dev`, as in most projects not made by Lovable, so expect the "Build unsuccessful"
card that `01-vite-react-spa` saw. Pressing Fix build here answers the open question of
what it changes. On nineteen files, anything beyond adding a script will be visible.

**Fix build was not pressed on 2026-09-12**: no card appeared. Lovable's agent, asked why
the preview had not been built, added `build:dev` and `src/vite-env.d.ts` unasked and
changed nothing else. What Fix build does here is still open.

**Deep links.** `/posts/3` loaded directly, not by navigating, needs the server's
single-page fallback. `vite preview` provides it locally; Lovable's preview and its
published site are untested.

## What to look for

Each page renders text that neither Lovable's scaffold nor another page does, so a
glance tells you whether the preview is serving this project:

| Page            | Look for                                                                                                     |
| --------------- | ------------------------------------------------------------------------------------------------------------ |
| `/`             | "Short reads, worth your time." and three post cards                                                         |
| `/posts`        | "All posts", twelve cards, and "Updated … ago"                                                               |
| `/posts/3`      | the post's title, "By …" with an author name, and a list of comments                                         |
| `/contact`      | "Contact us"; submitting it empty should show four field errors (the date defaults to today, which is valid) |
| `/about`        | "About Readwell"                                                                                             |
| `/no-such-page` | "Readwell could not find that page" — **not** Lovable's scaffold's own "Page not found"                      |

Record the wall-clock time of everything you see, with its time zone, so it can be
placed against Lovable's commits: see "The attribution window" in
`fixtures/OBSERVATION-LOG.md`. Then export Lovable's commits on top of the scenario into
`fixtures/evidence/`, as for the fixtures.

## Verified locally

On 2026-09-12: `npm install`, then `npm run build` (`tsc --noEmit && vite build`)
passed, and `vite preview` served `/`, `/posts/3`, `/contact` and `/no-such-page` with
the single-page fallback. It has not been clicked through in a browser.

## What our rules predict

| Platform | Prediction | Findings                                                                 |
| -------- | ---------- | ------------------------------------------------------------------------ |
| Lovable  | risky      | Warning: `lovable-expects-scaffold-scripts`, for the missing `build:dev` |
| Bolt     | works      | Nothing it cannot run                                                    |
| Replit   | works      | Nothing it cannot run                                                    |
| v0       | works      | Nothing it cannot run                                                    |
| Base44   | works      | Nothing it cannot run                                                    |

## Observed

<!-- Fill this in by hand after running the scenario through each platform.
     Record what happened, not what you expected, with wall-clock times.
     Then add a row to ../../fixtures/OBSERVATION-LOG.md. -->

| Platform | Date and time                                | Preview served this app?                                                                    | Every route renders?                         | Build error?                                        | Notes                                                                                                                                                    |
| -------- | -------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lovable  | 2026-09-12, mid-afternoon UTC+3, approximate | embedded: yes, after a dev server restart; standalone: no, "Preview has not been built yet" | yes, in the embedded preview, with real data | no card; by the agent's account TS2882 under `tsgo` | The agent restarted the dev server unprompted, and added `build:dev` and `src/vite-env.d.ts` unasked. Standalone preview still to re-check. See the log. |
| Bolt     |                                              |                                                                                             |                                              |                                                     |                                                                                                                                                          |
| Replit   |                                              |                                                                                             |                                              |                                                     |                                                                                                                                                          |
| v0       |                                              |                                                                                             |                                              |                                                     |                                                                                                                                                          |
| Base44   |                                              |                                                                                             |                                              |                                                     |                                                                                                                                                          |
