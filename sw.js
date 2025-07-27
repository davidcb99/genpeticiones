// Service Worker para GenPeticiones
// Versión del cache - cambiar cuando actualices la app
const CACHE_NAME = 'genpeticiones-v1.0.0';
const STATIC_CACHE = 'genpeticiones-static-v1';
const DYNAMIC_CACHE = 'genpeticiones-dynamic-v1';

// Archivos que se cachearán inmediatamente
const STATIC_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// URLs externas que se cachearán dinámicamente
const EXTERNAL_RESOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/hammer.js/2.0.8/hammer.min.js'
];

// Instalación del Service Worker
self.addEventListener('install', function(event) {
  console.log('🔧 Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(function(cache) {
        console.log('📦 Service Worker: Cacheando archivos estáticos');
        return cache.addAll(STATIC_FILES);
      })
      .then(function() {
        console.log('✅ Service Worker: Instalación completada');
        return self.skipWaiting(); // Activar inmediatamente
      })
      .catch(function(error) {
        console.error('❌ Service Worker: Error en instalación:', error);
      })
  );
});

// Activación del Service Worker
self.addEventListener('activate', function(event) {
  console.log('🚀 Service Worker: Activando...');
  
  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            // Eliminar caches antiguos
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('🗑️ Service Worker: Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(function() {
        console.log('✅ Service Worker: Activación completada');
        return self.clients.claim(); // Tomar control inmediatamente
      })
  );
});

// Interceptar peticiones de red
self.addEventListener('fetch', function(event) {
  const requestUrl = new URL(event.request.url);
  
  // Solo manejar peticiones GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  // Estrategia: Cache First para archivos estáticos
  if (STATIC_FILES.some(file => event.request.url.includes(file))) {
    event.respondWith(
      caches.match(event.request)
        .then(function(response) {
          if (response) {
            console.log('📦 Service Worker: Sirviendo desde cache:', event.request.url);
            return response;
          }
          
          console.log('🌐 Service Worker: Descargando:', event.request.url);
          return fetch(event.request)
            .then(function(response) {
              // Cachear la respuesta para futuras peticiones
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(STATIC_CACHE)
                  .then(function(cache) {
                    cache.put(event.request, responseClone);
                  });
              }
              return response;
            });
        })
    );
    return;
  }
  
  // Estrategia: Network First para recursos externos (CDN)
  if (EXTERNAL_RESOURCES.some(url => event.request.url.includes(url))) {
    event.respondWith(
      fetch(event.request)
        .then(function(response) {
          console.log('🌐 Service Worker: CDN descargado:', event.request.url);
          
          // Cachear para uso offline
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(DYNAMIC_CACHE)
              .then(function(cache) {
                cache.put(event.request, responseClone);
              });
          }
          return response;
        })
        .catch(function() {
          console.log('📦 Service Worker: CDN offline, usando cache:', event.request.url);
          return caches.match(event.request);
        })
    );
    return;
  }
  
  // Para otras peticiones, intentar red primero, luego cache
  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        return response;
      })
      .catch(function() {
        return caches.match(event.request);
      })
  );
});

// Manejar mensajes desde la aplicación
self.addEventListener('message', function(event) {
  console.log('💬 Service Worker: Mensaje recibido:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      version: CACHE_NAME,
      status: 'active'
    });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    }).then(function() {
      event.ports[0].postMessage({
        success: true,
        message: 'Cache limpiado correctamente'
      });
    });
  }
});

// Manejar actualizaciones en segundo plano
self.addEventListener('sync', function(event) {
  console.log('🔄 Service Worker: Sincronización en segundo plano');
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Aquí podrías sincronizar datos pendientes
      console.log('📊 Service Worker: Sincronizando datos...')
    );
  }
});

// Manejar notificaciones push (para futuras implementaciones)
self.addEventListener('push', function(event) {
  console.log('🔔 Service Worker: Notificación push recibida');
  
  const options = {
    body: event.data ? event.data.text() : 'Nueva actualización disponible',
    icon: './icon-192.png',
    badge: './icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Abrir App',
        icon: './icon-96.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: './icon-96.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('GenPeticiones', options)
  );
});

// Manejar clics en notificaciones
self.addEventListener('notificationclick', function(event) {
  console.log('👆 Service Worker: Clic en notificación');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('./')
    );
  }
});

console.log('🚀 Service Worker: GenPeticiones cargado correctamente');