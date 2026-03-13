import { useCallback } from "react";

const isBrowser = typeof window !== "undefined";

export function useHistoryState() {
	const getHistoryState = useCallback((): Record<string, unknown> | null => {
		if (!isBrowser) return null;
		return (window.history.state as Record<string, unknown>) ?? null;
	}, []);

	const replaceHistoryState = useCallback((patch: Record<string, unknown>) => {
		if (!isBrowser) return;
		window.history.replaceState({ ...window.history.state, ...patch }, "");
	}, []);

	return { getHistoryState, replaceHistoryState };
}

export function useCurrentPath() {
	return useCallback(
		() => (isBrowser ? window.location.pathname + window.location.search : "/"),
		[],
	);
}
