/* service worker da folha de coleta de pontos (GGC/SES-CE) — versão 202610201024
   Os arquivos da folha: rede primeiro (4 s, sempre conferindo a versão), guardando a cópia;
   sem rede, a cópia guardada.
   Pedidos a outros endereços (mapas, IBGE-PPP, receptor do Drive) passam direto. */
const CACHE = 'folha-202610201024';
const ARQS = ['./', './index.html', './planejador.html', './manifest.webmanifest', './icone-192.png', './icone-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQS)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(L => Promise.all(L.filter(k => k !== CACHE).map(k => caches.delete(k))))
  .then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try {
      // 'no-cache': sempre confere com o servidor (resposta curta quando nada mudou), sem esperar o cache de 10 min do Pages
      const rede = await Promise.race([fetch(r, {cache: 'no-cache'}), new Promise((_, n) => setTimeout(() => n(new Error('lenta')), 4000))]);
      if (rede && rede.ok) c.put(r, rede.clone());
      return rede;
    } catch (err){
      return (await c.match(r, {ignoreSearch: true})) || (await c.match('./index.html')) || Response.error();
    }
  })());
});
