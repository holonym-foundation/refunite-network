import { offlineQueue } from "./queue";
import { offlineStorage } from "./storage";

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  offline?: boolean;
  queued?: boolean;
}

export interface ApiOptions {
  cache?: boolean;
  cacheTTL?: number;
  offline?: boolean;
  retry?: boolean;
}

class OfflineApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = "") {
    this.baseUrl = baseUrl;
  }

  private async isOnline(): Promise<boolean> {
    if (typeof window === "undefined") return true;

    // Check if we're in a Capacitor environment
    const isCapacitor = typeof window !== "undefined" && (window as any).Capacitor;

    try {
      // Try to fetch a small resource to check connectivity
      const response = await fetch("/api/health", {
        method: "HEAD",
        cache: "no-cache",
      });
      return response.ok;
    } catch {
      // In Capacitor, we might be offline but still have cached content
      if (isCapacitor) {
        // Check if we have any cached data to determine if we're truly offline
        const cachedData = offlineStorage.getAll();
        return Object.keys(cachedData).length > 0;
      }
      return false;
    }
  }

  private async makeRequest<T>(
    url: string,
    options: RequestInit = {},
    apiOptions: ApiOptions = {}
  ): Promise<ApiResponse<T>> {
    const fullUrl = `${this.baseUrl}${url}`;
    const isOnline = await this.isOnline();

    // If offline and offline mode is enabled, queue the request
    if (!isOnline && apiOptions.offline !== false) {
      const queueId = offlineQueue.add(
        fullUrl,
        options.method || "GET",
        options.body,
        options.headers as Record<string, string>
      );

      return {
        offline: true,
        queued: true,
        data: { queueId } as T,
      };
    }

    // If online, make the actual request
    if (isOnline) {
      try {
        const response = await fetch(fullUrl, {
          ...options,
          headers: {
            "Content-Type": "application/json",
            ...options.headers,
          },
        });

        const data = await response.json();

        // Cache the response if caching is enabled
        if (apiOptions.cache && response.ok) {
          offlineStorage.cacheResponse(fullUrl, data, apiOptions.cacheTTL);
        }

        return { data };
      } catch (error) {
        console.error("API request failed:", error);

        // If retry is enabled and we're offline, queue the request
        if (apiOptions.retry !== false) {
          const queueId = offlineQueue.add(
            fullUrl,
            options.method || "GET",
            options.body,
            options.headers as Record<string, string>
          );

          return {
            offline: true,
            queued: true,
            data: { queueId } as T,
          };
        }

        return { error: "Request failed" };
      }
    }

    // If offline and no offline mode, return cached data if available
    if (apiOptions.cache) {
      const cached = offlineStorage.getCachedResponse(fullUrl);
      if (cached) {
        return { data: cached, offline: true };
      }
    }

    return { error: "No internet connection and no cached data available" };
  }

  async get<T>(url: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { method: "GET" }, options);
  }

  async post<T>(url: string, data?: any, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      url,
      {
        method: "POST",
        body: data ? JSON.stringify(data) : undefined,
      },
      options
    );
  }

  async put<T>(url: string, data?: any, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(
      url,
      {
        method: "PUT",
        body: data ? JSON.stringify(data) : undefined,
      },
      options
    );
  }

  async delete<T>(url: string, options: ApiOptions = {}): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(url, { method: "DELETE" }, options);
  }

  // Process offline queue when online
  async processOfflineQueue(): Promise<void> {
    if (await this.isOnline()) {
      await offlineQueue.processQueue();
    }
  }

  // Get queue status
  getQueueStatus(): { size: number; items: any[] } {
    return {
      size: offlineQueue.getQueueSize(),
      items: offlineQueue.getAll(),
    };
  }

  // Clear offline queue
  clearQueue(): void {
    offlineQueue.clear();
  }
}

export const offlineApi = new OfflineApiClient();
