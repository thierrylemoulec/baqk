import { type ReactNode, useMemo, useRef } from "react";
import type { RouterAdapter, StorageAdapter } from "../core/types.js";
import { createSessionStorage } from "../storage/session-storage.js";
import { generateNavId } from "../utils/id.js";
import { BaqkContext } from "./baqk-context.js";

export interface BaqkAdapterProps {
	children: ReactNode;
	sessionKey?: string;
	storage?: StorageAdapter;
}

type UseRouterHook = () => RouterAdapter;

export function createBaqkAdapter(useRouterHook: UseRouterHook) {
	function BaqkAdapterComponent({
		children,
		sessionKey,
		storage,
	}: BaqkAdapterProps) {
		const router = useRouterHook();
		const fallbackKeyRef = useRef<string | null>(null);

		const resolvedSessionKey = useMemo(() => {
			if (sessionKey) return sessionKey;
			// Generate a stable per-tab key for anonymous sessions
			if (!fallbackKeyRef.current) {
				fallbackKeyRef.current = generateNavId();
			}
			return fallbackKeyRef.current;
		}, [sessionKey]);

		const resolvedStorage = useMemo(
			() => storage ?? createSessionStorage(),
			[storage],
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
			<BaqkContext.Provider value={contextValue}>
				{children}
			</BaqkContext.Provider>
		);
	}

	BaqkAdapterComponent.displayName = "BaqkAdapter";
	return BaqkAdapterComponent;
}
