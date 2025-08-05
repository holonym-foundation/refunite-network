export interface OfflineData {
  key: string;
  value: any;
  timestamp: number;
  expiresAt?: number;
}

class OfflineStorage {
  private prefix = "offline_";

  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  set(key: string, value: any, ttl?: number): void {
    if (typeof window === "undefined") return;

    const data: OfflineData = {
      key,
      value,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
    };

    try {
      localStorage.setItem(this.getKey(key), JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save offline data:", error);
    }
  }

  get<T = any>(key: string): T | null {
    if (typeof window === "undefined") return null;

    try {
      const stored = localStorage.getItem(this.getKey(key));
      if (!stored) return null;

      const data: OfflineData = JSON.parse(stored);

      // Check if data has expired
      if (data.expiresAt && Date.now() > data.expiresAt) {
        this.remove(key);
        return null;
      }

      return data.value;
    } catch (error) {
      console.error("Failed to load offline data:", error);
      return null;
    }
  }

  remove(key: string): void {
    if (typeof window === "undefined") return;

    try {
      localStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error("Failed to remove offline data:", error);
    }
  }

  clear(): void {
    if (typeof window === "undefined") return;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.error("Failed to clear offline data:", error);
    }
  }

  getAll(): Record<string, any> {
    if (typeof window === "undefined") return {};

    const result: Record<string, any> = {};

    try {
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (key.startsWith(this.prefix)) {
          const originalKey = key.replace(this.prefix, "");
          const value = this.get(originalKey);
          if (value !== null) {
            result[originalKey] = value;
          }
        }
      });
    } catch (error) {
      console.error("Failed to get all offline data:", error);
    }

    return result;
  }

  // Cache API responses
  cacheResponse(url: string, response: any, ttl: number = 5 * 60 * 1000): void {
    const key = `api_${btoa(url)}`;
    this.set(key, response, ttl);
  }

  getCachedResponse(url: string): any {
    const key = `api_${btoa(url)}`;
    return this.get(key);
  }

  // Store user data for offline use
  setUserData(userId: string, data: any): void {
    const key = `user_${userId}`;
    this.set(key, data);
  }

  getUserData(userId: string): any {
    const key = `user_${userId}`;
    return this.get(key);
  }

  // Store form data for offline submission
  setFormData(formId: string, data: any): void {
    const key = `form_${formId}`;
    this.set(key, data);
  }

  getFormData(formId: string): any {
    const key = `form_${formId}`;
    return this.get(key);
  }
}

export const offlineStorage = new OfflineStorage();
