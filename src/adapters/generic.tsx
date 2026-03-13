import { type ReactNode, useCallback, useMemo, useRef } from "react";
import { BaqkContext } from "../context/baqk-context.js";
import type { RouterAdapter, StorageAdapter } from "../core/types.js";
import { createSessionStorage } from "../storage/session-storage.js";
import { useHistoryState } from "../utils/browser.js";
import { generateNavId } from "../utils/id.js";

export interface GenericBaqkAdapterProps {
	children: ReactNode;
	sessionKey?: string;
	storage?: StorageAdapter;
	navigate: (path: string, options?: { replace?: boolean }) => void;
	getCurrentPath: () => string;
}

export function BaqkAdapter({
	children,
	sessionKey,
	storage,
	navigate,
	getCurrentPath,
}: GenericBaqkAdapterProps) {
	const fallbackKeyRef = useRef<string | null>(null);

	const resolvedSessionKey = useMemo(() => {
		if (sessionKey) return sessionKey;
		if (!fallbackKeyRef.current) {
			fallbackKeyRef.current = generateNavId();
		}
		return fallbackKeyRef.current;
	}, [sessionKey]);

	const resolvedStorage = useMemo(
		() => storage ?? createSessionStorage(),
		[storage],
	);

	const nav = useCallback(
		(path: string, options?: { replace?: boolean }) => {
			navigate(path, options);
		},
		[navigate],
	);

	const { getHistoryState, replaceHistoryState } = useHistoryState();

	const router: RouterAdapter = useMemo(
		() => ({
			getCurrentPath,
			navigate: nav,
			getHistoryState,
			replaceHistoryState,
		}),
		[getCurrentPath, nav, getHistoryState, replaceHistoryState],
	);

	const contextValue = useMemo(
		() => ({
			router,
			storage: resolvedStorage,
			sessionKey: resolvedSessionKey,
		}),
		[router, resolvedStorage, resolvedSessionKey],
	);

	return (
		<BaqkContext.Provider value={contextValue}>{children}</BaqkContext.Provider>
	);
}

BaqkAdapter.displayName = "BaqkAdapter";
