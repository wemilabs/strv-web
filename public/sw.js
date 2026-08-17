// Service Worker for Push Notifications

self.addEventListener("push", event => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = {
      title: "Starva.shop",
      body: event.data.text(),
    };
  }

  const options = {
    body: data.body,
    icon: "/starva-dot-shop-512x512.png",
    badge: "/starva-dot-shop-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
    },
    actions: data.actions || [],
    tag: data.tag || "default",
    renotify: true,
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click
self.addEventListener("notificationclick", event => {
  event.notification.close();

  const url = event.notification.data?.url || "/";

  // Handle action buttons
  if (event.action === "renew") {
    event.waitUntil(clients.openWindow("/usage/billing"));
    return;
  }

  // Focus existing tab or open new one
  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(clientList => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        return clients.openWindow(url);
      }),
  );
});

// Handle notification close
self.addEventListener("notificationclose", _event => {
  // Can track dismissed notifications here if needed
});

// Service worker install
self.addEventListener("install", _event => {
  self.skipWaiting();
});

// Service worker activate
self.addEventListener("activate", event => {
  event.waitUntil(clients.claim());
});
