/* «Косметичка Team» on the web (admin website): Web Push for staff.
   Served next to index.html (/admin/sw.js, scope /admin/); paths follow the scope, so a preview build
   under another base path works too. No fetch handler: nothing is cached here. */

const BASE = new URL(self.registration.scope).pathname.replace(/\/$/, ""); // "/admin"

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

/** in-app path ("/order/42") → URL inside the scope; anything else → the app's start page */
function appUrl(path) {
  const p = typeof path === "string" && /^\/[A-Za-z0-9/_\-?=&.%]*$/.test(path) && !path.startsWith("//") ? path : "/";
  return BASE + p;
}

self.addEventListener("push", (e) => {
  let d = {};
  try {
    d = e.data ? e.data.json() : {};
  } catch {
    d = { title: "Косметичка Team", body: e.data ? e.data.text() : "" };
  }
  // the server sends `path` (in-app) and `link` (/admin/...); prefer the path so the base URL is ours
  let path = d.path;
  if (!path && typeof d.link === "string" && d.link.startsWith("/admin/")) path = d.link.slice("/admin".length);
  e.waitUntil(
    self.registration.showNotification(d.title || "Косметичка Team", {
      body: d.body || "",
      icon: BASE + "/assets/pwa/icon-192.png",
      badge: BASE + "/assets/pwa/icon-192.png",
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { path: path || "/" },
    })
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const path = (e.notification.data && e.notification.data.path) || "/";
  const url = appUrl(path);
  e.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const scope = self.registration.scope;
      const win = list.find((c) => c.url.startsWith(scope));
      if (win) {
        await win.focus().catch(() => {});
        // the open app navigates itself (no reload); see src/webPush.ts
        win.postMessage({ t: "open", path });
        return;
      }
      await self.clients.openWindow(url);
    })()
  );
});

// the browser replaced the subscription: register the new one with the site
self.addEventListener("pushsubscriptionchange", (e) => {
  e.waitUntil(
    (async () => {
      const opts = e.oldSubscription && e.oldSubscription.options;
      const sub = e.newSubscription || (opts ? await self.registration.pushManager.subscribe(opts) : null);
      if (!sub) return;
      await fetch("/api/team/web-push/subscribe", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sub.toJSON()),
      }).catch(() => {});
    })()
  );
});
