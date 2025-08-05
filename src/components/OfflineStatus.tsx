"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useOffline } from "@/hooks/useOffline";
import { RefreshCw, WifiOff, Wifi } from "lucide-react";
import { useEffect, useState } from "react";

export function OfflineStatus() {
  const { isOnline, isOffline, queueSize, syncOfflineQueue, clearOfflineQueue } = useOffline();
  const [showDetails, setShowDetails] = useState(false);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queueSize > 0) {
      const timer = setTimeout(() => {
        syncOfflineQueue();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, queueSize, syncOfflineQueue]);

  if (!isOffline && queueSize === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-background border rounded-lg shadow-lg p-4 max-w-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {isOffline ? (
              <WifiOff className="h-4 w-4 text-red-500" />
            ) : (
              <Wifi className="h-4 w-4 text-green-500" />
            )}
            <span className="text-sm font-medium">{isOffline ? "Offline" : "Online"}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
            {showDetails ? "Hide" : "Details"}
          </Button>
        </div>

        {queueSize > 0 && (
          <div className="mb-2">
            <Badge variant="secondary" className="text-xs">
              {queueSize} pending action{queueSize !== 1 ? "s" : ""}
            </Badge>
          </div>
        )}

        {showDetails && (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>
              {isOffline
                ? "You're currently offline. Actions will be queued and synced when you're back online."
                : "You're online. Pending actions will be synced automatically."}
            </p>

            {queueSize > 0 && (
              <div className="space-y-2">
                <div className="flex space-x-2">
                  <Button size="sm" onClick={syncOfflineQueue} className="flex-1">
                    <RefreshCw className="mr-1 h-3 w-3" />
                    Sync Now
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={clearOfflineQueue}
                    className="flex-1"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
