import { useCallback, useRef } from "react";
import { useBaqkContext } from "../context/baqk-context.js";
import { ensureNavId } from "../core/ensure-nav-id.js";
import { saveScroll } from "../core/scroll-manager.js";
import { pushTrail } from "../core/trail-manager.js";
import type { TrailEntry } from "../core/types.js";

function findAnchor(e: React.MouseEvent): HTMLAnchorElement | null {
	let node = e.target as Element | null;
	const boundary = e.currentTarget as Element;
	while (node && node !== boundary) {
		if (node instanceof HTMLAnchorElement) return node;
		node = node.parentElement;
	}
	return boundary instanceof HTMLAnchorElement ? boundary : null;
}

function shouldTrackAnchorClick(anchor: HTMLAnchorElement): boolean {
	const target = anchor.getAttribute("target");
	if (target && target.toLowerCase() !== "_self") {
		return false;
	}

	if (anchor.hasAttribute("download")) {
		return false;
	}

	const href = anchor.getAttribute("href");
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
			if (e.button !== 0) return;
			if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

			const anchor = findAnchor(e);
			if (!anchor || !shouldTrackAnchorClick(anchor)) return;

			// In direct mode (handler on an <a>), respect defaultPrevented — the
			// handler itself decided to cancel.  In delegation mode, routers call
			// preventDefault() as normal operation and findAnchor guarantees the
			// target is inside the anchor, so we cannot distinguish router-managed
			// prevention from genuine cancellation — we allow the push.
			if (e.defaultPrevented && e.currentTarget instanceof HTMLAnchorElement)
				return;

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
