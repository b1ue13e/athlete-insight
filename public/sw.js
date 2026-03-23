/**
 * Athlete Insight - Service Worker
 * 
 * 提供离线缓存能力，支持场边弱网/无网环境
 */

const CACHE_NAME = 'athlete-insight-v1';

// 需要缓存的核心资源
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/analysis/new/mobile',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// 安装 - 缓存核心资源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// 激活 - 清理旧缓存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// 拦截请求 - 优先网络，失败回退缓存
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // 跳过非 GET 请求
  if (request.method !== 'GET') return;
  
  // 跳过 API 请求（让 API 走正常网络）
  if (request.url.includes('/api/')) return;
  
  // 跳过外部资源
  if (!request.url.startsWith(self.location.origin)) return;
  
  event.respondWith(
    fetch(request)
      .then((response) => {
        // 网络成功，更新缓存
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // 网络失败，尝试缓存
        return caches.match(request).then((cached) => {
          if (cached) return cached;
          
          // 如果是导航请求，返回离线页面
          if (request.mode === 'navigate') {
            return caches.match('/offline');
          }
          
          return new Response('Offline', { status: 503 });
        });
      })
  );
});

// 后台同步 - 离线提交的数据稍后同步
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reports') {
    event.waitUntil(syncPendingReports());
  }
});

// 同步待提交的报表
async function syncPendingReports() {
  // 从 IndexedDB 读取待同步数据
  // 这里简化处理，实际项目中使用 idb 等库
  const clients = await self.clients.matchAll();
  clients.forEach((client) => {
    client.postMessage({ type: 'SYNC_COMPLETE' });
  });
}
