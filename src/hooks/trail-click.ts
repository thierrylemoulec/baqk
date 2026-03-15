import { useCallback, useRef } from "react";
import { useBaqkContext } from "../context/baqk-context.js";
import { ensureNavId } from "../core/ensure-nav-id.js";
import { saveScroll } from "../core/scroll-manager.js";
import { pushTrail } from "../core/trail-manager.js";
import type { TrailEntry } from "../core/types.js";

function shouldTrackAnchorClick(e: React.MouseEvent): boolean {
	const { currentTarget } = e;
	if (!(currentTarget instanceof HTMLAnchorElement)) {
		return true;
	}

	const target = currentTarget.getAttribute("target");
	if (target && target.toLowerCase() !== "_self") {
		return false;
	}

	if (currentTarget.hasAttribute("download")) {
		return false;
	}

	const href = currentTarget.getAttribute("href");
	if (!href) {
		return false;
	}

	try {
		const url = new URL(href, window.location.href);
		if (url.protocol !== "http:" && url.protocol !== "https:") {
			return false;
		}
		if (url.origin !== window.location.origin) {
			return false;
		}
		if (
			url.pathname === window.location.pathname &&
			url.search === window.location.search
		) {
			return false;
		}
	} catch {
		return false;
	}

	return true;
}

export function useTrailClick(
	label?: string,
): (e?: React.MouseEvent) => void {
	const { router, storage, sessionKey } = useBaqkContext();

	const navIdRef = useRef<string | null>(null);
	if (navIdRef.current === null && typeof window !== "undefined") {
		navIdRef.current = ensureNavId(router);
	}

	return useCallback(
		(e?: React.MouseEvent) => {
			if (!e) return;
			if (e.defaultPrevented) return;
			if (e.button !== 0) return;
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
			if (!shouldTrackAnchorClick(e)) return;

			const navId = navIdRef.current;
			if (!navId) return;

			saveScroll(storage, sessionKey, navId);

			const entry: TrailEntry = {
				path: router.getCurrentPath(),
				navId,
				label,
				timestamp: Date.now(),
			};
			pushTrail(storage, sessionKey, entry);
		},
		[router, storage, sessionKey, label],
	);
}
