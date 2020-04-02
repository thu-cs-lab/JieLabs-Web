self.addEventListener('activate', e => {
  caches.keys().then(names => {
    for(const name of names) caches.delete(name);
    return self.registration.unregister();
  }).then(() => self.clients.matchAll()).then(clients => {
    for(const client of clients) client.navigate(client.url);
  });
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

