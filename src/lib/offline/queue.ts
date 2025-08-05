export interface OfflineQueueItem {
  id: string;
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retries: number;
}

export interface OfflineQueueConfig {
  maxRetries?: number;
  retryDelay?: number;
  maxQueueSize?: number;
}

class OfflineQueue {
  private queue: OfflineQueueItem[] = [];
  private config: Required<OfflineQueueConfig>;
  private storageKey = "offline_queue";

  constructor(config: OfflineQueueConfig = {}) {
    this.config = {
      maxRetries: config.maxRetries ?? 3,
      retryDelay: config.retryDelay ?? 5000,
      maxQueueSize: config.maxQueueSize ?? 100,
    };
    this.loadQueue();
  }

  private loadQueue(): void {
    if (typeof window === "undefined") return;

    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error("Failed to load offline queue:", error);
      this.queue = [];
    }
  }

  private saveQueue(): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error("Failed to save offline queue:", error);
    }
  }

  add(url: string, method: string, body?: any, headers?: Record<string, string>): string {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const item: OfflineQueueItem = {
      id,
      url,
      method,
      body,
      headers,
      timestamp: Date.now(),
      retries: 0,
    };

    // Remove oldest items if queue is full
    if (this.queue.length >= this.config.maxQueueSize) {
      this.queue.shift();
    }

    this.queue.push(item);
    this.saveQueue();
    return id;
  }

  remove(id: string): boolean {
    const index = this.queue.findIndex((item) => item.id === id);
    if (index > -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
      return true;
    }
    return false;
  }

  getAll(): OfflineQueueItem[] {
    return [...this.queue];
  }

  clear(): void {
    this.queue = [];
    this.saveQueue();
  }

  async processQueue(): Promise<void> {
    if (this.queue.length === 0) return;

    const itemsToProcess = [...this.queue];

    for (const item of itemsToProcess) {
      try {
        const response = await fetch(item.url, {
          method: item.method,
          headers: {
            "Content-Type": "application/json",
            ...item.headers,
          },
          body: item.body ? JSON.stringify(item.body) : undefined,
        });

        if (response.ok) {
          this.remove(item.id);
        } else {
          item.retries++;
          if (item.retries >= this.config.maxRetries) {
            this.remove(item.id);
          }
        }
      } catch (error) {
        console.error(`Failed to process offline queue item ${item.id}:`, error);
        item.retries++;
        if (item.retries >= this.config.maxRetries) {
          this.remove(item.id);
        }
      }
    }

    this.saveQueue();
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

export const offlineQueue = new OfflineQueue();
