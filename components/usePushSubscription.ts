"use client";

import { useEffect, useState } from "react";
import { subscribeUser, unsubscribeUser } from "@/app/actions";

export type PushState =
  | "loading" // still figuring out support/permission
  | "unsupported" // browser has no push at all
  | "needs-install" // iOS: must add to home screen first
  | "default" // can ask — not subscribed yet
  | "subscribed" // active
  | "denied"; // user blocked it in the browser

/** Convert the base64url VAPID public key into the Uint8Array the browser wants. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Owns everything about this browser's push subscription so the bell button
 * and the welcome prompt can share one source of truth.
 */
export function usePushSubscription(name: string) {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setState("unsupported");
      return;
    }

    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    if (isIOS && !isStandalone) {
      setState("needs-install");
      return;
    }

    if (Notification.permission === "denied") {
      setState("denied");
      return;
    }

    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setState(sub ? "subscribed" : "default"))
      .catch(() => setState("default"));
  }, []);

  async function subscribe(): Promise<boolean> {
    if (busy) return false;
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        return false;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string
        ) as BufferSource,
      });
      await subscribeUser(JSON.parse(JSON.stringify(sub)), name);
      setState("subscribed");
      return true;
    } catch {
      setState("default");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function unsubscribe() {
    if (busy) return;
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await unsubscribeUser(sub.endpoint);
      }
      setState("default");
    } finally {
      setBusy(false);
    }
  }

  // Keep the stored name in sync if the user renames themselves while
  // subscribed — otherwise the "don't notify the signer" filter breaks.
  useEffect(() => {
    if (state !== "subscribed" || !name) return;
    let cancelled = false;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        if (sub && !cancelled) {
          subscribeUser(JSON.parse(JSON.stringify(sub)), name);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [name, state]);

  return { state, busy, subscribe, unsubscribe };
}
