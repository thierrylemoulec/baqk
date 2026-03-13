import { MAX_TRAIL_DEPTH, STORAGE_PREFIX } from "./constants.js";
import type { StorageAdapter, TrailEntry } from "./types.js";

function trailKey(sessionKey: string): string {
	return `${STORAGE_PREFIX}:${sessionKey}:trail`;
}

export function getTrail(
	storage: StorageAdapter,
	sessionKey: string,
): TrailEntry[] {
	const raw = storage.getItem(trailKey(sessionKey));
	if (!raw) return [];
	try {
		return JSON.parse(raw) as TrailEntry[];
	} catch {
		return [];
	}
}

export function pushTrail(
	storage: StorageAdapter,
	sessionKey: string,
	entry: TrailEntry,
): TrailEntry[] {
	const trail = getTrail(storage, sessionKey);
	trail.push(entry);
	// Evict oldest entries if over max depth
	while (trail.length > MAX_TRAIL_DEPTH) {
		const evicted = trail.shift();
		if (evicted) {
			// Clean up associated state
			storage.removeItem(
				`${STORAGE_PREFIX}:${sessionKey}:state:${evicted.navId}`,
			);
			storage.removeItem(
				`${STORAGE_PREFIX}:${sessionKey}:scroll:${evicted.navId}`,
			);
		}
	}
	storage.setItem(trailKey(sessionKey), JSON.stringify(trail));
	return trail;
}

export function popTrail(
	storage: StorageAdapter,
	sessionKey: string,
): TrailEntry | null {
	const trail = getTrail(storage, sessionKey);
	const entry = trail.pop() ?? null;
	storage.setItem(trailKey(sessionKey), JSON.stringify(trail));
	return entry;
}

export function peekTrail(
	storage: StorageAdapter,
	sessionKey: string,
): TrailEntry | null {
	const trail = getTrail(storage, sessionKey);
	return trail[trail.length - 1] ?? null;
}

export function clearTrail(storage: StorageAdapter, sessionKey: string): void {
	const trail = getTrail(storage, sessionKey);
	// Clean up all associated state
	for (const entry of trail) {
		storage.removeItem(`${STORAGE_PREFIX}:${sessionKey}:state:${entry.navId}`);
		storage.removeItem(`${STORAGE_PREFIX}:${sessionKey}:scroll:${entry.navId}`);
	}
	storage.removeItem(trailKey(sessionKey));
}
