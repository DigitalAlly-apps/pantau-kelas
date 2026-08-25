/// <reference lib="webworker" />

import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching';
import { CacheFirst } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';
import { registerRoute } from 'workbox-routing';

declare let self: ServiceWorkerGlobalScope;

cleanupOutdatedCaches();
precacheAndRoute(self.__WB_MANIFEST);

registerRoute(
  ({ url }) => url.origin === 'https://fonts.googleapis.com',
  new CacheFirst({
    cacheName: 'google-fonts-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 })],
  }),
);

self.addEventListener('push', (event) => {
  const payload = event.data?.json() as { title?: string; body?: string; url?: string } | undefined;
  event.waitUntil(self.registration.showNotification(payload?.title || 'Pengingat Jurnal Guru', {
    body: payload?.body || 'Ada pemanggilan yang perlu ditindaklanjuti.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: { url: payload?.url || '/' },
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
