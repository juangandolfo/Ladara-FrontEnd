import { Injectable } from '@angular/core';

/**
 * Thin wrapper around `localStorage` with consistent error handling.
 *
 * Browsers can throw when accessing storage (private browsing mode, quota
 * exceeded, disabled storage, etc). Centralizing the try/catch here means
 * every caller gets the same safe fallback behavior instead of duplicating
 * try/catch blocks (or forgetting them).
 */
@Injectable({
  providedIn: 'root'
})
export class BrowserStorageService {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error(`Unable to read "${key}" from storage`, error);
      return null;
    }
  }

  setItem(key: string, value: string): boolean {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`Unable to write "${key}" to storage`, error);
      return false;
    }
  }

  removeItem(key: string): boolean {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error(`Unable to remove "${key}" from storage`, error);
      return false;
    }
  }
}
