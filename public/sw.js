// Service worker for web push notifications.
// Lives in the browser independently of any open tab — the browser's push
// service wakes it up to show notifications even when the site is closed.

self.addEventListener("push", function (event) {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "🎾 Pádel", body: event.data.text() };
  }

  const options = {
    body: data.body,
    icon: data.icon || "/icon.svg",
    badge: "/icon.svg",
    vibrate: [100, 50, 100],
    tag: data.tag, // collapse repeats for the same slot
    data: { url: data.url || "/", date: data.date, period: data.period },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || "/";

  // Focus an already-open tab if there is one, otherwise open a new one.
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            // The app is already open: tell it to jump to the slot (no reload,
            // so the in-memory state and realtime socket survive).
            if (data.date && data.period) {
              client.postMessage({
                type: "open-slot",
                date: data.date,
                period: data.period,
              });
            }
            return client.focus();
          }
        }
        // Closed: open with the deep-link query params; the app reads them on load.
        if (clients.openWindow) return clients.openWindow(url);
      })
  );
});
