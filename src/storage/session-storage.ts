import type { StorageAdapter } from "../core/types.js";

export function createSessionStorage(): StorageAdapter {
	return {
		getItem(key: string): string | null {
			try {
				return sessionStorage.getItem(key);
			} catch {
				return null;
			}
		},
		setItem(key: string, value: string): void {
			try {
				sessionStorage.setItem(key, value);
			} catch {
				console.warn(
					"[baqk] sessionStorage quota exceeded, clearing old entries.",
				);
				// Best-effort: try to clear and retry
				try {
					sessionStorage.setItem(key, value);
				} catch {
					// Give up silently
				}
			}
		},
		removeItem(key: string): void {
			try {
				sessionStorage.removeItem(key);
			} catch {
				// Ignore
			}
		},
		clear(): void {
			try {
				// Only clear keys with our prefix
				const keysToRemove: string[] = [];
				for (let i = 0; i < sessionStorage.length; i++) {
					const key = sessionStorage.key(i);
					if (key?.startsWith("bcb:")) {
						keysToRemove.push(key);
					}
				}
				for (const key of keysToRemove) {
					sessionStorage.removeItem(key);
				}
			} catch {
				// Ignore
			}
		},
	};
}
