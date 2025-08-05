import { useEffect, useState } from "react";
import { offlineApi } from "@/lib/offline/api";

export interface OfflineStatus {
  isOnline: boolean;
  isOffline: boolean;
  queueSize: number;
  lastSync: Date | null;
}

export function useOffline() {
  const [status, setStatus] = useState<OfflineStatus>({
    isOnline: true,
    isOffline: false,
    queueSize: 0,
    lastSync: null,
  });

  useEffect(() => {
    // Check if we're in a Capacitor environment
    const isCapacitor = typeof window !== "undefined" && (window as any).Capacitor;
    const swPath = isCapacitor ? "/sw-capacitor.js" : "/sw.js";

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register(swPath)
        .then((registration) => {
          console.log(
            `Service Worker registered (${isCapacitor ? "Capacitor" : "Web"}):`,
            registration
          );
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error);
        });
    }

    // Check online status
    const updateOnlineStatus = () => {
      const isOnline = navigator.onLine;
      setStatus((prev) => ({
        ...prev,
        isOnline,
        isOffline: !isOnline,
      }));
    };

    // Update queue size
    const updateQueueSize = () => {
      const queueStatus = offlineApi.getQueueStatus();
      setStatus((prev) => ({
        ...prev,
        queueSize: queueStatus.size,
      }));
    };

    // Initial check
    updateOnlineStatus();
    updateQueueSize();

    // Listen for online/offline events
    window.addEventListener("online", updateOnlineStatus);
    window.addEventListener("offline", updateOnlineStatus);

    // Listen for storage changes (queue updates)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.includes("offline_queue")) {
        updateQueueSize();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    // Periodic queue size check
    const interval = setInterval(updateQueueSize, 5000);

    return () => {
      window.removeEventListener("online", updateOnlineStatus);
      window.removeEventListener("offline", updateOnlineStatus);
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  const syncOfflineQueue = async () => {
    try {
      await offlineApi.processOfflineQueue();
      setStatus((prev) => ({
        ...prev,
        lastSync: new Date(),
        queueSize: offlineApi.getQueueStatus().size,
      }));
    } catch (error) {
      console.error("Failed to sync offline queue:", error);
    }
  };

  const clearOfflineQueue = () => {
    offlineApi.clearQueue();
    setStatus((prev) => ({
      ...prev,
      queueSize: 0,
    }));
  };

  return {
    ...status,
    syncOfflineQueue,
    clearOfflineQueue,
  };
}
