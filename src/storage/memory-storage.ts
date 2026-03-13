import type { StorageAdapter } from "../core/types.js";

export function createMemoryStorage(): StorageAdapter {
	const store = new Map<string, string>();
	return {
		getItem(key: string): string | null {
			return store.get(key) ?? null;
		},
		setItem(key: string, value: string): void {
			store.set(key, value);
		},
		removeItem(key: string): void {
			store.delete(key);
		},
		clear(): void {
			store.clear();
		},
	};
}
