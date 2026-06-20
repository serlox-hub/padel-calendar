<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project: "No puedo, tengo pádel"

A padel calendar for a group of friends. **No login** — users just type a
display name (kept in `localStorage`). They sign up for a morning or afternoon
slot each day; the first to join sets the match time. Shared state lives in
Supabase and updates in **real time**; optional **web push** notifies the group
when someone joins.

Full product/setup docs: see `README.md`. This file is the working brief for
whoever (human or agent) edits the code next.

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript** (Turbopack)
- **Tailwind CSS v4** (config-less; `app/globals.css` with `@import "tailwindcss"`)
- **Supabase** — Postgres + Realtime, accessed with the public **anon key**
- **web-push** + VAPID + `public/sw.js` service worker (push notifications)
- **PWA** via `app/manifest.ts` (installable; required for push on iOS)

## Architecture (where things live)

- `components/Calendar.tsx` — the brain. Client component: loads signups for the
  visible week, subscribes to realtime, holds the week offset, owns the
  create/join/leave/edit-time actions, and renders the grid + slot-detail modal.
- `components/SlotCell.tsx` — compact cell in the weekly grid (time + stacked
  initial avatars). Tap → opens the detail.
- `components/SlotCard.tsx` — slot detail (players grouped into courts of 4,
  time `<select>` every 30 min, create/join/leave/edit-time buttons).
- `components/NameGate.tsx` — set/change name (reused for first entry and edit).
- `components/{PushPrompt,PushToggle}.tsx` + `usePushSubscription.ts` — push UI
  and the hook that registers `/sw.js` and stores the subscription.
- `app/actions.ts` — **Server Actions** for push: `subscribeUser`,
  `unsubscribeUser`, `notifyNewSignup`. The actual web-push plumbing (VAPID
  setup, the `fanOut` sender that prunes dead 404/410 subs, label helpers) lives
  in `lib/push.ts` and is shared with the cron.
- `app/api/cron/reminders/route.ts` — **daily reminder cron.** Notifies every
  player who has a match *tomorrow* (whole next Madrid day) — "Mañana tienes
  partido". Triggered once a day by `vercel.json`'s cron; **stateless** (no
  "reminded" flag), which is only safe *because* it runs once a day — don't make
  it more frequent without adding dedupe. Guarded by `CRON_SECRET` (Vercel sends
  it as a Bearer header). Same deep-link payload shape as `notifyNewSignup`.
- **Notification deep-links.** `notifyNewSignup` puts the slot's `date`/`period`
  in the push payload + a `/?date=&period=` url. `public/sw.js` `notificationclick`
  either focuses an open tab and `postMessage`s `{type:"open-slot",date,period}`
  (no reload) or opens the deep-link url when closed. `Calendar` reads the query
  params on cold open (then strips them via `replaceState`) and listens for the
  SW message when warm — both call `openSlotByDate`, which switches week via
  `weekOffsetBetween` and opens the slot modal.
- `lib/` — `supabase.ts` (client), `push.ts` (server web-push plumbing, shared
  by actions + cron), `dates.ts` (week math, **local time**), `avatar.ts`
  (deterministic initials+colour), `types.ts`.
- `supabase/schema.sql` — tables, RLS, realtime. Idempotent; re-runnable.

Data model is documented in `README.md`. Two tables: `signups`,
`push_subscriptions`. One morning + one afternoon slot per day, so "one match
per period" is structural, not enforced in code.

## Conventions

- **Spanish UI.** All user-facing copy is in Spanish; code/comments in English.
- **Tailwind utility classes only.** No CSS modules. Mobile-first (the audience
  uses phones). Accessibility matters: minimum text ~14px, avoid low-contrast
  greys (use `slate-600/700`, not `400`), tap targets ~44px, never rely on
  colour alone to convey state.
- **No auth by design.** RLS policies are intentionally open. Identity = the
  free-text `name`. Don't add auth unless asked.
- **Dates are local, never UTC.** Use `toISODate`/helpers in `lib/dates.ts`;
  building ISO strings from UTC shifts the day. Push code anchors at midday for
  the same reason.
- **Graceful degradation.** `lib/supabase.ts` and `app/actions.ts` check for env
  vars and no-op when missing (show setup help / hide push). Keep that.
- **Realtime + refetch.** After a mutation, code refetches as a fallback in case
  realtime is off. Keep mutations going through `Calendar`'s `run()` helper.
  Mobile browsers suspend the realtime socket while backgrounded, so `Calendar`
  also refetches on `visibilitychange`/`focus` (e.g. when opened from a push) —
  don't remove that, it's why data isn't stale after returning to the app.

## Dev workflow

```bash
npm run dev      # local dev (http://localhost:3000)
npm run build    # MUST pass before considering work done (type-checks too)
npm run lint     # eslint
```

- **Always run `npm run build` after changes** — it type-checks and catches the
  cross-file `null` narrowing / RSC boundary errors this project is prone to.
- Env vars: 5 total (2 Supabase, 2 VAPID, `CRON_SECRET`). `NEXT_PUBLIC_*` are
  inlined at build; `VAPID_PRIVATE_KEY` and `CRON_SECRET` are server-only.
  `next.config.ts` has `allowedDevOrigins` for tunnel/LAN testing — dev only.
- **Testing on a phone from WSL2:** the WSL NAT IP isn't reachable from the LAN,
  and `networkingMode=mirrored` needs Windows 11 (this machine is Windows 10).
  Use a tunnel: `npx --yes cloudflared tunnel --url http://localhost:3000`.

## Definition of done (READ THIS)

When you finish building or changing something, before wrapping up:

1. `npm run build` passes clean (types + lint).
2. **Update the docs to match.** This is required, not optional:
   - `README.md` — features, setup steps, env vars, **the Estructura tree**, and
     the data-model tables if the schema changed.
   - `AGENTS.md` (this file) — architecture, conventions, or workflow if they
     changed.
   - `supabase/schema.sql` — if you touched the DB. Keep it idempotent.
   - `.env.local.example` — if you added/removed an env var.
3. If you added a file, make sure it appears in the README structure tree.
4. Keep the `nextjs-agent-rules` block above intact (it's tool-managed).

Stale docs are treated as a bug. Leave the repo so the next session can pick it
up cold from `README.md` + this file.
