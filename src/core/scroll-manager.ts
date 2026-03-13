import { STORAGE_PREFIX } from "./constants.js";
import type { StorageAdapter } from "./types.js";

function scrollKey(sessionKey: string, navId: string): string {
	return `${STORAGE_PREFIX}:${sessionKey}:scroll:${navId}`;
}

export function saveScroll(
	storage: StorageAdapter,
	sessionKey: string,
	navId: string,
): void {
	const scrollY = window.scrollY;
	storage.setItem(scrollKey(sessionKey, navId), String(scrollY));
}

export function restoreScroll(
	storage: StorageAdapter,
	sessionKey: string,
	navId: string,
): void {
	const raw = storage.getItem(scrollKey(sessionKey, navId));
	if (raw === null) return;
	const scrollY = Number.parseInt(raw, 10);
	if (Number.isNaN(scrollY)) return;
	// Use rAF to ensure DOM has rendered before scrolling
	requestAnimationFrame(() => {
		window.scrollTo(0, scrollY);
	});
}

export function removeScroll(
	storage: StorageAdapter,
	sessionKey: string,
	navId: string,
): void {
	storage.removeItem(scrollKey(sessionKey, navId));
}
