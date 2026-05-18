// Service Worker — CEITEC Mobile Tracker
// Permite rastreamento em segundo plano via Background Sync

const CACHE_NAME = 'ceitec-tracker-v2';
const SYNC_TAG = 'tracker-sync';
// IMPORTANTE: usa /node-api/ (Node.js), não /api/ (Django)
const API_GPS = '/node-api/mobile-tracker/localizar';

// Instala e faz cache dos arquivos estáticos do PWA
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      cache.addAll(['/pwa/tracker/', '/pwa/tracker/index.html'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // Limpa caches antigos
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Intercepta apenas GETs de arquivos estáticos do PWA
// NÃO intercepta POSTs (GPS), chamadas de API ou qualquer coisa fora do /pwa/tracker/
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Deixa passar: métodos não-GET (POST, PUT, DELETE...)
  if (e.request.method !== 'GET') return;

  // Deixa passar: chamadas de API (node-api, api)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/node-api/')) return;

  // Apenas arquivos do PWA em cache
  if (!url.pathname.startsWith('/pwa/tracker')) return;

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

// Background Sync — envia localizações pendentes quando reconectar
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
      const resp = await fetch(API_GPS, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item),
      });
      if (resp.ok) {
        const del = db.transaction('pendentes', 'readwrite').objectStore('pendentes').delete(item.id);
        await toPromise(del);
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

// Recebe mensagem da página para registrar sync quando ficar offline
self.addEventListener('message', (e) => {
  if (e.data?.tipo === 'registrar-sync') {
    self.registration.sync.register(SYNC_TAG).catch(() => {});
  }
});
