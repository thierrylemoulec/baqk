import { deserialize, serialize } from "../utils/serialize.js";
import { STORAGE_PREFIX } from "./constants.js";
import type { StorageAdapter } from "./types.js";

function stateKey(sessionKey: string, navId: string): string {
	return `${STORAGE_PREFIX}:${sessionKey}:state:${navId}`;
}

export function saveState<T>(
	storage: StorageAdapter,
	sessionKey: string,
	navId: string,
	state: T,
): void {
	const json = serialize(state);
	if (json !== null) {
		storage.setItem(stateKey(sessionKey, navId), json);
	}
}

export function restoreState<T>(
	storage: StorageAdapter,
	sessionKey: string,
	navId: string,
): T | null {
	const raw = storage.getItem(stateKey(sessionKey, navId));
	if (!raw) return null;
	return deserialize<T>(raw);
}

export function removeState(
	storage: StorageAdapter,
	sessionKey: string,
	navId: string,
): void {
	storage.removeItem(stateKey(sessionKey, navId));
}
