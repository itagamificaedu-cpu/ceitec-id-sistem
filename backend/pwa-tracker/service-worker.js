// Service Worker — CEITEC Mobile Tracker
// Permite rastreamento em segundo plano via Background Sync

const CACHE_NAME = 'ceitec-tracker-v1';
const SYNC_TAG = 'tracker-sync';

// Instala e faz cache dos arquivos do app
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/pwa/tracker/', '/pwa/tracker/index.html'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

// Serve arquivos do cache quando offline
self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('/api/mobile-tracker/localizar')) return; // não cacheia envios GPS
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Background Sync — envia localizações pendentes quando volta a internet
self.addEventListener('sync', (e) => {
  if (e.tag === SYNC_TAG) {
    e.waitUntil(enviarPendentes());
  }
});

async function enviarPendentes() {
  const db = await abrirIndexedDB();
  const tx = db.transaction('pendentes', 'readwrite');
  const store = tx.objectStore('pendentes');
  const todos = await toPromise(store.getAll());

  for (const item of todos) {
    try {
      const resp = await fetch('/api/mobile-tracker/localizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (resp.ok) {
        await toPromise(tx.objectStore('pendentes').delete(item.id));
      }
    } catch (_) {
      // Permanece na fila para próxima tentativa
    }
  }
}

function abrirIndexedDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ceitec-tracker', 1);
    req.onupgradeneeded = e => e.target.result.createObjectStore('pendentes', { keyPath: 'id', autoIncrement: true });
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

function toPromise(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = e => resolve(e.target.result);
    req.onerror = e => reject(e.target.error);
  });
}

// Recebe mensagem da página principal para registrar sync
self.addEventListener('message', (e) => {
  if (e.data?.tipo === 'registrar-sync') {
    self.registration.sync.register(SYNC_TAG).catch(() => {});
  }
});
