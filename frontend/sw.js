// LINKA — Service Worker para Push Notifications
const CACHE_NAME = 'linka-v1';

self.addEventListener('install', (e) => {
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(clients.claim());
});

self.addEventListener('push', (e) => {
    let data = { titulo: 'Linka', corpo: '', url: '/' };

    if (e.data) {
        try {
            data = { ...data, ...e.data.json() };
        } catch (_) {
            data.corpo = e.data.text();
        }
    }

    const opcoes = {
        body: data.corpo,
        icon: '/frontend/assets/imagens/avatar.png',
        badge: '/frontend/assets/imagens/avatar.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'linka-notif',
        renotify: true,
        data: { url: data.url || '/' }
    };

    e.waitUntil(
        self.registration.showNotification(data.titulo, opcoes)
    );
});

self.addEventListener('notificationclick', (e) => {
    e.notification.close();

    const url = e.notification.data?.url || '/';

    e.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (const client of windowClients) {
                if (client.url.includes(url) && 'focus' in client) {
                    return client.focus();
                }
            }
            return clients.openWindow(url);
        })
    );
});
