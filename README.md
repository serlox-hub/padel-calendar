# 🎾 No puedo, tengo pádel

Calendario sencillo para organizar partidos de pádel. Sin login: entras, pones
tu nombre y te apuntas al hueco de la **mañana** o de la **tarde** de cada día.
Muestra la **semana en curso** y la **siguiente**.

## Reglas

- Hay **2 huecos por día**: 🌅 mañana y 🌇 tarde.
- El **primero que se apunta** crea el partido y **fija la hora** (en saltos de 30 min).
- Los demás solo pulsan **Apuntarme**. Pueden **borrarse** o **cambiar la hora**.
- **Sin límite de gente**: el contador muestra las pistas que se van llenando
  (4 = 1 pista, 8 = 2 pistas, 12 = 3…) y cuántos faltan para completar.
- Tu **nombre se recuerda** en el navegador.
- Los cambios aparecen **en tiempo real** para todos.

## Puesta en marcha

1. **Crea un proyecto gratis** en [supabase.com](https://supabase.com).
2. En el **SQL Editor**, pega y ejecuta el contenido de [`supabase/schema.sql`](supabase/schema.sql).
3. Copia tus claves (Supabase → *Project Settings → API*) a un `.env.local`:

   ```bash
   cp .env.local.example .env.local
   # edita NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY
   ```

4. Arranca en local:

   ```bash
   npm install
   npm run dev
   ```

   Abre http://localhost:3000.

## Desplegar (gratis) en Vercel

1. Sube el repo a GitHub e impórtalo en [vercel.com](https://vercel.com).
2. Añade las dos variables `NEXT_PUBLIC_SUPABASE_URL` y
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` en *Settings → Environment Variables*.
3. Deploy. (Las variables `NEXT_PUBLIC_*` se incrustan al compilar, así que
   deben estar configuradas **antes** del build.)

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript
- **Tailwind CSS v4**
- **Supabase** (Postgres + Realtime)

## Estructura

```
app/
  layout.tsx        metadata, idioma
  page.tsx          renderiza <Calendar/>
components/
  Calendar.tsx      lógica: carga, realtime, acciones, semanas
  SlotCard.tsx      tarjeta de un turno (mañana/tarde)
  NameGate.tsx      pantalla para poner el nombre
lib/
  supabase.ts       cliente de Supabase
  dates.ts          utilidades de fechas / semanas
  types.ts          tipos compartidos
supabase/
  schema.sql        tabla + RLS + realtime
```

## Modelo de datos

Una sola tabla `signups`. Como solo existe un hueco de mañana y uno de tarde por
día, la regla de "un partido por turno" se cumple sola.

| columna      | tipo        | nota                        |
| ------------ | ----------- | --------------------------- |
| `id`         | uuid        |                             |
| `date`       | date        | día del partido             |
| `period`     | text        | `morning` \| `afternoon`    |
| `name`       | text        | nombre libre del jugador    |
| `match_time` | text        | `HH:MM`, lo fija el primero |
| `created_at` | timestamptz |                             |
