const CACHE_NAME = "refunite-network-v1";
const STATIC_CACHE_NAME = "refunite-static-v1";

// Files to cache for offline use
const STATIC_FILES = ["/", "/offline", "/manifest.json", "/logo.svg"];

// API routes that can be cached
const CACHEABLE_APIS = ["/api/health", "/api/metrics"];

// Install event - cache static files
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_FILES);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// Fetch event - handle offline requests
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static file requests
  if (request.method === "GET") {
    event.respondWith(handleStaticRequest(request));
    return;
  }
});

async function handleApiRequest(request) {
  const url = new URL(request.url);

  // For cacheable APIs, try cache first, then network
  if (CACHEABLE_APIS.includes(url.pathname)) {
    try {
      // Try network first
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        // Cache the response
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, networkResponse.clone());
        return networkResponse;
      }
    } catch (error) {
      console.log("Network failed, trying cache");
    }

    // Try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
  }

  // For non-cacheable APIs, try network, fallback to offline response
  try {
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Return offline response for API calls
    return new Response(
      JSON.stringify({
        error: "Offline mode",
        message: "This action will be synced when you're back online",
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function handleStaticRequest(request) {
  // Try cache first for static files
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // Try network
  try {
    const response = await fetch(request);
    if (response.ok) {
      // Cache successful responses
      const cache = await caches.open(STATIC_CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Return offline page for navigation requests
    if (request.destination === "document") {
      return caches.match("/offline");
    }

    // Return empty response for other failed requests
    return new Response("", { status: 404 });
  }
}

// Background sync for offline queue
self.addEventListener("sync", (event) => {
  if (event.tag === "background-sync") {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  try {
    // This would typically communicate with the main thread
    // to process the offline queue
    console.log("Background sync triggered");
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

// Push notification handling
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New notification",
    icon: "/logo.svg",
    badge: "/logo.svg",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: "explore",
        title: "View",
        icon: "/logo.svg",
      },
      {
        action: "close",
        title: "Close",
        icon: "/logo.svg",
      },
    ],
  };

  event.waitUntil(self.registration.showNotification("Refunite Network", options));
});

// Notification click handling
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  if (event.action === "explore") {
    event.waitUntil(clients.openWindow("/"));
  }
});
