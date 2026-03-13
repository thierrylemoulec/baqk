import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import {
	type BaqkAdapterProps,
	createBaqkAdapter,
} from "../context/create-adapter.js";
import type { RouterAdapter } from "../core/types.js";
import { useCurrentPath, useHistoryState } from "../utils/browser.js";

function useTanStackRouterAdapter(): RouterAdapter {
	const navigate = useNavigate();
	// Subscribe to router state so the adapter re-renders on navigation.
	// getCurrentPath reads window.location directly for shallow-URL compat.
	useRouterState({ select: (s) => s.location.pathname });

	const getCurrentPath = useCurrentPath();
	const { getHistoryState, replaceHistoryState } = useHistoryState();

	const nav = useCallback(
		(path: string, options?: { replace?: boolean }) => {
			navigate({ to: path, replace: options?.replace });
		},
		[navigate],
	);

	return useMemo(
		() => ({
			getCurrentPath,
			navigate: nav,
			getHistoryState,
			replaceHistoryState,
		}),
		[getCurrentPath, nav, getHistoryState, replaceHistoryState],
	);
}

export const BaqkAdapter: React.FC<BaqkAdapterProps> = createBaqkAdapter(
	useTanStackRouterAdapter,
);

export type { BaqkAdapterProps };
