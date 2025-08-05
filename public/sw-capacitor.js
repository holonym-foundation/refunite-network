const CACHE_NAME = "refunite-network-capacitor-v1";
const STATIC_CACHE_NAME = "refunite-static-capacitor-v1";

// Files to cache for offline use in Capacitor
const STATIC_FILES = ["/", "/offline", "/manifest.json", "/logo.svg", "/sw.js", "/sw-capacitor.js"];

// API routes that can be cached
const CACHEABLE_APIS = ["/api/health", "/api/metrics"];

// Capacitor-specific cache strategy
const CAPACITOR_CACHE_STRATEGY = "cache-first";

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

// Fetch event - handle offline requests for Capacitor
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

  // For cacheable APIs, use cache-first strategy in Capacitor
  if (CACHEABLE_APIS.includes(url.pathname)) {
    try {
      // Try cache first for Capacitor
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        return cachedResponse;
      }

      // Try network
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

    // Try cache as fallback
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
        capacitor: true,
      }),
      {
        status: 503,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

async function handleStaticRequest(request) {
  // For Capacitor, always try cache first
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
    console.log("Background sync triggered for Capacitor");
  } catch (error) {
    console.error("Background sync failed:", error);
  }
}

// Push notification handling for Capacitor
self.addEventListener("push", (event) => {
  const options = {
    body: event.data ? event.data.text() : "New notification",
    icon: "/logo.svg",
    badge: "/logo.svg",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
      capacitor: true,
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

// Capacitor-specific message handling
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CAPACITOR_READY") {
    console.log("Capacitor environment detected");
  }
});
