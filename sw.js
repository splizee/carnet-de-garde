/* Carnet de garde — service worker (genere par build_app.py) */
var VERSION = 'e551d5fecde0';
var CACHE = 'carnet-' + VERSION;
var SHELL = ['./', './index.html', './manifest.webmanifest',
             './apple-touch-icon.png', './icon-192.png', './icon-512.png', './plumbs.enc.json', './topos/05a2bda54b.json', './topos/06d751cb85.json', './topos/1699a04f68.json', './topos/27b70bee2b.json', './topos/409fcb40af.json', './topos/410e69e3b7.json', './topos/417908794f.json', './topos/5562f2ae5b.json', './topos/a01b8318fa.json', './topos/a7cb2e1738.json', './topos/liste.json'];

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){
    return c.addAll(SHELL);
  }));
});

self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){
      if(k !== CACHE) return caches.delete(k);
    }));
  }).then(function(){ return self.clients.claim(); }));
});

self.addEventListener('message', function(e){
  if(e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

/* Reseau d'abord (2,5 s), cache ensuite : en ligne on a toujours la derniere
   version du carnet ; hors ligne (sous-sol, box de soins) on garde la derniere lue. */
self.addEventListener('fetch', function(e){
  if(e.request.method !== 'GET') return;
  if(new URL(e.request.url).origin !== self.location.origin) return;

  e.respondWith(
    new Promise(function(resolve){
      var done = false;
      var timer = setTimeout(function(){
        if(done) return;
        caches.match(e.request).then(function(hit){ if(hit && !done){ done = true; resolve(hit); } });
      }, 2500);

      fetch(e.request).then(function(res){
        clearTimeout(timer);
        var copy = res.clone();
        caches.open(CACHE).then(function(c){ c.put(e.request, copy); });
        if(!done){ done = true; resolve(res); }
      }).catch(function(){
        clearTimeout(timer);
        caches.match(e.request).then(function(hit){
          if(done) return;
          done = true;
          resolve(hit || caches.match('./index.html').then(function(f){
            return f || new Response('Hors ligne', {status:503});
          }));
        });
      });
    })
  );
});
