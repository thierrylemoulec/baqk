import { useCallback, useEffect, useRef } from "react";
import { useBaqkContext } from "../context/baqk-context.js";
import { HISTORY_STATE_KEY } from "../core/constants.js";
import { restoreScroll, saveScroll } from "../core/scroll-manager.js";
import { removeScroll } from "../core/scroll-manager.js";
import {
	removeState,
	restoreState as restoreStateFromStorage,
	saveState as saveStateToStorage,
} from "../core/state-manager.js";
import {
	clearTrail,
	getTrail,
	peekTrail,
	popTrail,
	pushTrail,
} from "../core/trail-manager.js";
import type { BaqkOptions, BaqkResult, TrailEntry } from "../core/types.js";
import { generateNavId } from "../utils/id.js";

function ensureNavId(router: {
	getHistoryState(): Record<string, unknown> | null;
	replaceHistoryState(patch: Record<string, unknown>): void;
}): string {
	const state = router.getHistoryState();
	if (state && typeof state[HISTORY_STATE_KEY] === "string") {
		return state[HISTORY_STATE_KEY];
	}
	const navId = generateNavId();
	router.replaceHistoryState({ [HISTORY_STATE_KEY]: navId });
	return navId;
}

export function useBaqk<
	T extends Record<string, unknown> = Record<string, unknown>,
>(options: BaqkOptions = {}): BaqkResult<T> {
	const { fallbackPath, autoSaveScroll = true } = options;
	const { router, storage, sessionKey } = useBaqkContext();

	// --- Initialization (lazy ref, no effect) ---
	// https://react.dev/reference/react/useRef#avoiding-recreating-the-ref-contents
	const initRef = useRef<{
		navId: string;
		restoredState: T | null;
	} | null>(null);
	if (initRef.current === null) {
		if (typeof window === "undefined") {
			initRef.current = { navId: "", restoredState: null };
		} else {
			const navId = ensureNavId(router);
			const restoredState = restoreStateFromStorage<T>(
				storage,
				sessionKey,
				navId,
			);
			initRef.current = { navId, restoredState };
		}
	}

	const { navId, restoredState } = initRef.current;
	const wasRestored = restoredState !== null;

	// --- Scroll restoration (the only effect — needs the DOM) ---
	// restoreScroll is a no-op when no scroll data exists for this navId
	const scrollRestoredRef = useRef(false);
	useEffect(() => {
		if (scrollRestoredRef.current || !autoSaveScroll) return;
		scrollRestoredRef.current = true;
		restoreScroll(storage, sessionKey, navId);
	}, [autoSaveScroll, storage, sessionKey, navId]);

	// --- Computed values (read during render, no state needed) ---
	const trail = getTrail(storage, sessionKey);
	const previousEntry = peekTrail(storage, sessionKey);
	const hasTrail = trail.length > 0;

	// --- Callbacks ---
	const saveState = useCallback(
		(state: T) => {
			saveStateToStorage(storage, sessionKey, navId, state);
		},
		[storage, sessionKey, navId],
	);

	const restoreState = useCallback((): T | null => {
		return restoreStateFromStorage<T>(storage, sessionKey, navId);
	}, [storage, sessionKey, navId]);

	const navigateWithTrail = useCallback(
		(path: string, opts?: { label?: string; state?: T }) => {
			if (autoSaveScroll) {
				saveScroll(storage, sessionKey, navId);
			}

			if (opts?.state) {
				saveStateToStorage(storage, sessionKey, navId, opts.state);
			}

			const entry: TrailEntry = {
				path: router.getCurrentPath(),
				navId,
				label: opts?.label,
				timestamp: Date.now(),
			};
			pushTrail(storage, sessionKey, entry);

			router.navigate(path);
		},
		[router, storage, sessionKey, navId, autoSaveScroll],
	);

	const goBack = useCallback(
		(overrideFallback?: string) => {
			const entry = popTrail(storage, sessionKey);
			if (entry) {
				router.navigate(entry.path, { replace: true });
				// Stamp the new history entry with the original navId
				// so the target page's auto-restore finds its saved state
				router.replaceHistoryState({
					[HISTORY_STATE_KEY]: entry.navId,
				});
			} else {
				const target = overrideFallback ?? fallbackPath;
				if (target) {
					router.navigate(target);
				}
			}
		},
		[router, storage, sessionKey, fallbackPath],
	);

	const clearAll = useCallback(() => {
		removeState(storage, sessionKey, navId);
		removeScroll(storage, sessionKey, navId);
		clearTrail(storage, sessionKey);
	}, [storage, sessionKey, navId]);

	return {
		goBack,
		hasTrail,
		previousEntry,
		trail,
		saveState,
		restoreState,
		restoredState,
		wasRestored,
		navigateWithTrail,
		clearAll,
	};
}
