/* Web Push for the website (src/webPush.ts). No caching: push and notification taps only. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch (_) {
    d = { body: e.data ? e.data.text() : "" };
  }
  const link = typeof d.link === "string" && /^\/(?!\/)/.test(d.link) ? d.link : "/notifications";
  e.waitUntil(
    Promise.all([
      self.registration.showNotification(d.title || "Косметичка", {
        body: d.body || "",
        icon: "/assets/pwa/icon-192.png",
        badge: "/assets/pwa/badge-96.png",
        data: { link },
        tag: d.tag || undefined,
        renotify: !!d.tag,
      }),
      // an open site refreshes its bell at once
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((list) => list.forEach((c) => c.postMessage({ type: "push" }))),
    ])
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const link = (e.notification.data && e.notification.data.link) || "/notifications";
  const url = new URL(link, self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const own = list.filter((c) => new URL(c.url).origin === self.location.origin);
      const c = own.find((w) => w.focused) || own[0];
      if (c) {
        // the open app navigates itself (no reload); focus first, then tell it where to go
        return c.focus().then((w) => (w || c).postMessage({ type: "open", link }));
      }
      return self.clients.openWindow(url);
    })
  );
});
