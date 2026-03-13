import { STORAGE_PREFIX } from "../core/constants.js";
import type { StorageAdapter } from "../core/types.js";

function removeBaqkKeys(): void {
	const keysToRemove: string[] = [];
	for (let i = 0; i < sessionStorage.length; i++) {
		const key = sessionStorage.key(i);
		if (key?.startsWith(`${STORAGE_PREFIX}:`)) {
			keysToRemove.push(key);
		}
	}
	for (const key of keysToRemove) {
		sessionStorage.removeItem(key);
	}
}

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
					"[baqk] sessionStorage quota exceeded, clearing baqk entries and retrying once.",
				);
				try {
					removeBaqkKeys();
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
				removeBaqkKeys();
			} catch {
				// Ignore
			}
		},
	};
}
