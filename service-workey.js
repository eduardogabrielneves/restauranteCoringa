// Define um nome e uma versão para o cache
const CACHE_NAME = 'restaurante-coringa-cache-v1';

// Lista de ficheiros essenciais para o funcionamento offline
const urlsToCache = [
  '/',
  '/index.html',
  '/style.css',
  '/script.js',
  '/images/icon-192.png',
  '/images/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Poppins:wght@600&family=Roboto:wght@400;500;700&display=swap'
];

// Evento de Instalação: Ocorre quando o service worker é instalado pela primeira vez
self.addEventListener('install', event => {
  console.log('Service Worker: Instalando...');
  // Pede ao navegador para esperar até que o cache seja preenchido
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Cache aberto, a adicionar ficheiros essenciais.');
        return cache.addAll(urlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Falha ao adicionar ficheiros ao cache', error);
      })
  );
});

// Evento de Fetch: Interceta todos os pedidos de rede da página
self.addEventListener('fetch', event => {
  event.respondWith(
    // Tenta encontrar o recurso no cache primeiro
    caches.match(event.request)
      .then(response => {
        // Se o recurso estiver no cache, retorna-o
        if (response) {
          return response;
        }
        // Se não estiver no cache, vai à rede para o buscar
        return fetch(event.request);
      })
  );
});
