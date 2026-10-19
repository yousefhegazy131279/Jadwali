const CACHE = 'jadwali-v2-shell-2';
const STATIC = ['/offline.html','/logo.png','/manifest.json','/manifest.en.json'];
self.addEventListener('install',event=>{event.waitUntil(caches.open(CACHE).then(c=>c.addAll(STATIC)));self.skipWaiting()});
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('jadwali-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{
 if(self.location.hostname==='localhost'||self.location.hostname==='127.0.0.1')return;
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==self.location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/auth/'))return;
 if(event.request.mode==='navigate'){
  event.respondWith((async()=>{const cache=await caches.open(CACHE);const key=new Request(url.origin+url.pathname);try{const response=await fetch(event.request);if(response.ok&&!response.redirected&&url.pathname.startsWith('/dashboard')&&!url.pathname.includes('/admin'))await cache.put(key,response.clone());return response}catch{return await cache.match(key)||await cache.match('/offline.html')}})());return;
 }
 if(url.pathname.startsWith('/_next/static/')||STATIC.includes(url.pathname))event.respondWith((async()=>{const cache=await caches.open(CACHE);const cached=await cache.match(event.request);if(cached)return cached;const response=await fetch(event.request);if(response.ok)await cache.put(event.request,response.clone());return response})());
});
self.addEventListener('push',event=>{let data;try{data=event.data?.json()}catch{return}if(!data||typeof data.title!=='string')return;event.waitUntil(self.registration.showNotification(data.title,{body:String(data.body||''),icon:'/logo.png',badge:'/logo.png',tag:String(data.id||'jadwali-reminder'),data:{url:typeof data.url==='string'&&data.url.startsWith('/dashboard')?data.url:'/dashboard'}}))});
self.addEventListener('notificationclick',event=>{event.notification.close();const url=new URL(event.notification.data?.url||'/dashboard',self.location.origin).href;event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});for(const client of windows)if(client.url.startsWith(self.location.origin)){await client.navigate(url);return client.focus()}return self.clients.openWindow(url)})())});
