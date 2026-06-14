"use server";

import webpush from "web-push";
import { createClient } from "@supabase/supabase-js";
import type { Period } from "@/lib/types";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

const configured = Boolean(url && anonKey && publicKey && privateKey);

if (configured) {
  webpush.setVapidDetails(
    "mailto:sergio@cl4.ai",
    publicKey as string,
    privateKey as string
  );
}

/** Server-side Supabase client (anon key; the table is open via RLS policies). */
function db() {
  return createClient(url as string, anonKey as string);
}

interface StoredSubscription {
  endpoint: string;
  subscription: webpush.PushSubscription;
  name: string | null;
}

/** Save (or refresh) a browser's push subscription. */
export async function subscribeUser(
  sub: webpush.PushSubscription,
  name: string
) {
  if (!configured) return { success: false };
  await db()
    .from("push_subscriptions")
    .upsert(
      { endpoint: sub.endpoint, subscription: sub, name },
      { onConflict: "endpoint" }
    );
  return { success: true };
}

/** Forget a subscription when the user turns notifications off. */
export async function unsubscribeUser(endpoint: string) {
  if (!configured) return { success: false };
  await db().from("push_subscriptions").delete().eq("endpoint", endpoint);
  return { success: true };
}

const PERIOD_LABEL: Record<Period, string> = {
  morning: "la mañana",
  afternoon: "la tarde",
};

function dayLabel(dateISO: string): string {
  // Anchor at midday so the date never slips across a timezone boundary.
  const d = new Date(`${dateISO}T12:00:00`);
  const s = new Intl.DateTimeFormat("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(d);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Fan out a push to everyone (except the person who just signed up) telling
 * them a new player joined a slot. Dead subscriptions are pruned automatically.
 */
export async function notifyNewSignup(payload: {
  signerName: string;
  dateISO: string;
  period: Period;
  matchTime: string;
}) {
  if (!configured) return { success: false };
  const client = db();

  const { count } = await client
    .from("signups")
    .select("*", { count: "exact", head: true })
    .eq("date", payload.dateISO)
    .eq("period", payload.period);

  const total = count ?? 0;
  const timePart =
    payload.matchTime && payload.matchTime !== "00:00"
      ? ` a las ${payload.matchTime}`
      : "";

  const body =
    `${dayLabel(payload.dateISO)} por ${PERIOD_LABEL[payload.period]}${timePart}` +
    ` · ${total} apuntad${total === 1 ? "o" : "os"}`;

  const notification = JSON.stringify({
    title: `🎾 ${payload.signerName} se ha apuntado`,
    body,
    url: "/",
    tag: `${payload.dateISO}-${payload.period}`,
  });

  const { data: subs } = await client
    .from("push_subscriptions")
    .select("endpoint, subscription, name");

  if (!subs) return { success: true, sent: 0 };

  const targets = (subs as StoredSubscription[]).filter(
    (s) => s.name !== payload.signerName
  );

  const dead: string[] = [];
  await Promise.all(
    targets.map(async (s) => {
      try {
        await webpush.sendNotification(s.subscription, notification);
      } catch (err: unknown) {
        const code =
          err && typeof err === "object" && "statusCode" in err
            ? (err as { statusCode: number }).statusCode
            : 0;
        // 404/410 mean the subscription is gone for good — clean it up.
        if (code === 404 || code === 410) dead.push(s.endpoint);
      }
    })
  );

  if (dead.length) {
    await client.from("push_subscriptions").delete().in("endpoint", dead);
  }

  return { success: true, sent: targets.length - dead.length };
}
