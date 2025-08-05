"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function OfflinePage() {
  const [isOnline, setIsOnline] = useState(false);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const checkOnlineStatus = () => {
      setIsOnline(navigator.onLine);
    };

    checkOnlineStatus();
    window.addEventListener("online", checkOnlineStatus);
    window.addEventListener("offline", checkOnlineStatus);

    return () => {
      window.removeEventListener("online", checkOnlineStatus);
      window.removeEventListener("offline", checkOnlineStatus);
    };
  }, []);

  const handleRetry = async () => {
    setRetrying(true);
    try {
      const response = await fetch("/api/health");
      if (response.ok) {
        window.location.reload();
      }
    } catch (error) {
      console.error("Still offline:", error);
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <WifiOff className="h-6 w-6" />
          </div>
          <CardTitle>You&apos;re offline</CardTitle>
          <CardDescription>Please check your internet connection and try again</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            <p>Some features may be limited while offline:</p>
            <ul className="mt-2 space-y-1">
              <li>Creating new invites</li>
              <li>Syncing with the network</li>
              <li>Real-time updates</li>
            </ul>
          </div>

          <div className="flex flex-col space-y-2">
            <Button onClick={handleRetry} disabled={retrying} className="w-full">
              {retrying ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking connection...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try again
                </>
              )}
            </Button>

            <Button variant="outline" asChild className="w-full">
              <Link href="/">
                <Home className="mr-2 h-4 w-4" />
                Go to homepage
              </Link>
            </Button>
          </div>

          {isOnline && (
            <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">
              ✓ Connection restored! You can now use all features.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
