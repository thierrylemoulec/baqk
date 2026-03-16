import { useCallback, useEffect, useRef } from "react";
import { useBaqkContext } from "../context/baqk-context.js";
import { HISTORY_STATE_KEY } from "../core/constants.js";
import { ensureNavId } from "../core/ensure-nav-id.js";
import { restoreScroll } from "../core/scroll-manager.js";
import { removeScroll } from "../core/scroll-manager.js";
import {
	removeState,
	restoreState as restoreStateFromStorage,
	saveState as saveStateToStorage,
} from "../core/state-manager.js";
import {
	clearTrail,
	peekTrail,
	popTrail,
} from "../core/trail-manager.js";
import type { BaqkOptions, BaqkResult } from "../core/types.js";

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
	const previousEntry = peekTrail(storage, sessionKey);

	// --- Callbacks ---
	const saveState = useCallback(
		(state: T) => {
			saveStateToStorage(storage, sessionKey, navId, state);
		},
		[storage, sessionKey, navId],
	);

	const goBack = useCallback(
		(overrideFallback?: string) => {
			const currentPath = router.getCurrentPath();
			let entry = popTrail(storage, sessionKey);
			// Skip stale entries that point to the current URL
			while (entry && entry.path === currentPath) {
				entry = popTrail(storage, sessionKey);
			}
			if (entry) {
				router.navigate(entry.path, { replace: true });
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

	const clear = useCallback(() => {
		removeState(storage, sessionKey, navId);
		removeScroll(storage, sessionKey, navId);
		clearTrail(storage, sessionKey);
	}, [storage, sessionKey, navId]);

	return {
		goBack,
		previousEntry,
		saveState,
		restoredState,
		wasRestored,
		clear,
	};
}
