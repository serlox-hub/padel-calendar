/**
 * Shared web-push plumbing used by both the Server Actions (`app/actions.ts`)
 * and the daily reminder cron (`app/api/cron/reminders/route.ts`).
 *
 * VAPID is configured once here. Everything no-ops when env vars are missing,
 * keeping the project's graceful-degradation contract.
 */
import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import type { Period } from "@/lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

/** True only when all four push-related env vars are present. */
export const pushConfigured = Boolean(url && anonKey && publicKey && privateKey);

if (pushConfigured) {
  webpush.setVapidDetails(
    "mailto:sergio@cl4.ai",
    publicKey as string,
    privateKey as string
  );
}

/** Server-side Supabase client (anon key; the table is open via RLS policies). */
export function db() {
  return createClient(url as string, anonKey as string);
}

export interface StoredSubscription {
  endpoint: string;
  subscription: webpush.PushSubscription;
  name: string | null;
}

export const PERIOD_LABEL: Record<Period, string> = {
  morning: "la mañana",
  afternoon: "la tarde",
};

/** "Domingo 21 de junio" — anchored at midday so the date never slips a TZ. */
export function dayLabel(dateISO: string): string {
  const d = new Date(`${dateISO}T12:00:00`);
  const s = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Send one JSON payload to many subscriptions in parallel. Subscriptions the
 * push service reports as gone (404/410) are pruned. Returns how many landed.
 */
export async function fanOut(
  subs: StoredSubscription[],
  payload: string
): Promise<number> {
  const dead: string[] = [];
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, payload);
      } catch (err: unknown) {
        const code =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : 0;
        if (code === 404 || code === 410) dead.push(s.endpoint);
      }
    })
  );

  if (dead.length) {
    await db().from("push_subscriptions").delete().in("endpoint", dead);
  }

  return subs.length - dead.length;
}
