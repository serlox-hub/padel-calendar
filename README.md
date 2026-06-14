# 🎾 No puedo, tengo pádel

Calendario sencillo para organizar partidos de pádel con un grupo de amigos.
Sin login: entras, pones tu nombre y te apuntas al hueco de la **mañana** o de la
**tarde** de cada día. Vista semanal navegable, en tiempo real y con
notificaciones push opcionales.

## Reglas

- Hay **2 huecos por día**: 🌅 mañana y 🌇 tarde (un partido por turno).
- El **primero que se apunta** crea el partido y **fija la hora** (selector cada 30 min).
- Los demás solo pulsan **Apuntarme**. Pueden **borrarse** o **cambiar la hora**.
- **Sin límite de gente**: un partido necesita 4, pero la reserva puede tener
  4, 6, 8… (varias pistas). En el detalle se agrupan por pista de 4.
- Tu **nombre se recuerda** en el navegador.
- Los cambios aparecen **en tiempo real** para todos.
- Cuando **pasa la hora** del partido: si no se llegó a 4 se marca
  **Cancelado**; con 4 o más, **Jugado**. Al pasar la hora se bloquean las
  acciones (apuntarse, crear, cambiar hora).
- **Notificaciones push** opcionales: cuando alguien se apunta, el resto recibe
  un aviso (aunque tengan la app cerrada).

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4**
- **Supabase** (Postgres + Realtime) — datos compartidos, sin login (RLS abierta)
- **Web Push** (`web-push` + VAPID + service worker) — avisos a los jugadores
- **PWA** (manifest) — instalable en el móvil; requisito para push en iOS

## Puesta en marcha

1. **Crea un proyecto gratis** en [supabase.com](https://supabase.com).
2. En el **SQL Editor**, pega y ejecuta [`supabase/schema.sql`](supabase/schema.sql)
   (crea las tablas `signups` y `push_subscriptions`, RLS y realtime; es
   idempotente, se puede re-ejecutar).
3. **Genera las claves VAPID** para push (una vez):
   ```bash
   npx web-push generate-vapid-keys
   ```
4. Copia las claves a `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```
   Rellena:
   - `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Supabase → *Project Settings → API*)
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY` (del paso 3)
5. Arranca en local:
   ```bash
   npm install
   npm run dev
   ```
   Abre http://localhost:3000.

> La app degrada con gracia: sin claves de Supabase muestra una pantalla de
> ayuda; sin claves VAPID simplemente no ofrece notificaciones.

## Desplegar (gratis) en Vercel

1. Sube el repo a GitHub e impórtalo en [vercel.com](https://vercel.com)
   (o usa `npx vercel`).
2. Añade **las 4 variables** de entorno en *Settings → Environment Variables*
   (las mismas del `.env.local`).
3. Deploy. Cada push a `main` redespliega solo.

> ⚠️ Las `NEXT_PUBLIC_*` se **incrustan al compilar**: deben existir en Vercel
> **antes** del build. `VAPID_PRIVATE_KEY` es de servidor (no se expone al
> cliente) y la usan las Server Actions de `app/actions.ts`.

## Estructura

```
app/
  layout.tsx        metadata, idioma, theme-color
  page.tsx          renderiza <Calendar/>
  manifest.ts       PWA manifest (instalable; necesario para push en iOS)
  actions.ts        Server Actions de push (suscribir, desuscribir, notificar)
  icon.svg          icono de la PWA / notificaciones
components/
  Calendar.tsx      orquesta todo: carga, realtime, acciones, semanas, modal
  SlotCell.tsx      celda compacta de un turno en la rejilla (avatares apilados)
  SlotCard.tsx      detalle de un turno (jugadores por pista, crear/editar/apuntarse)
  NameGate.tsx      pantalla/modal para poner o cambiar el nombre
  PushPrompt.tsx    aviso para activar notificaciones
  PushToggle.tsx    interruptor de notificaciones
  usePushSubscription.ts  hook: registra el service worker y gestiona la suscripción
lib/
  supabase.ts       cliente de Supabase (cliente, con anon key)
  dates.ts          utilidades de fechas / semanas (en hora local, no UTC)
  periods.ts        metadatos de mañana/tarde (label, icon, colores) — fuente única
  players.ts        helpers de jugador (isSameName, courtsFor)
  slots.ts          estado del turno (upcoming/played/cancelled) según hora + nº
  avatar.ts         iniciales + color determinista por nombre
  types.ts          tipos compartidos
public/
  sw.js             service worker (muestra las notificaciones push)
supabase/
  schema.sql        tablas + RLS + realtime (idempotente)
```

## Modelo de datos

Dos tablas. Como solo existe un hueco de mañana y uno de tarde por día, la regla
de "un partido por turno" se cumple sola.

**`signups`** — un apunte = una persona en un turno.

| columna      | tipo        | nota                        |
| ------------ | ----------- | --------------------------- |
| `id`         | uuid        |                             |
| `date`       | date        | día del partido             |
| `period`     | text        | `morning` \| `afternoon`    |
| `name`       | text        | nombre libre del jugador    |
| `match_time` | text        | `HH:MM`, lo fija el primero |
| `created_at` | timestamptz |                             |

Índice único `(date, period, lower(name))`: nadie se apunta dos veces al mismo turno.

**`push_subscriptions`** — un navegador/dispositivo que activó notificaciones.

| columna        | tipo        | nota                                   |
| -------------- | ----------- | -------------------------------------- |
| `endpoint`     | text (PK)   | "buzón" único del push service         |
| `subscription` | jsonb       | PushSubscription completa              |
| `name`         | text        | quién se suscribió (para no avisarse)  |
| `created_at`   | timestamptz |                                        |

> Sin login: ambas tablas tienen RLS **abierta** vía la anon key. Es un grupo de
> amigos sin datos sensibles. Si hiciera falta endurecerlo, ver AGENTS.md.
