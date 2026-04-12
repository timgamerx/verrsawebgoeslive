'use client';

/**
 * localStorage wrapper matching the AsyncStorage API (React Native).
 * Imported as AsyncStorage in lib files on web.
 */
export const webStorage = {
  getItem: async (key: string): Promise<string | null> => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try { localStorage.setItem(key, value); } catch {}
  },
  removeItem: async (key: string): Promise<void> => {
    try { localStorage.removeItem(key); } catch {}
  },
  multiGet: async (keys: string[]): Promise<[string, string | null][]> => {
    return keys.map(k => [k, localStorage.getItem(k)]);
  },
  multiSet: async (pairs: [string, string][]): Promise<void> => {
    pairs.forEach(([k, v]) => localStorage.setItem(k, v));
  },
  multiRemove: async (keys: string[]): Promise<void> => {
    keys.forEach(k => localStorage.removeItem(k));
  },
  clear: async (): Promise<void> => {
    try { localStorage.clear(); } catch {}
  },
};
