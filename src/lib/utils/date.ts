/**
 * UTC timestamp utilities to ensure consistency across the application
 */

export const utcNow = (): Date => new Date(Date.now());

export const utcFromTimestamp = (timestamp: number): Date => new Date(timestamp);

export const utcAddSeconds = (seconds: number): Date => new Date(Date.now() + seconds * 1000);
