import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useCallback, useMemo } from "react";
import {
	type BaqkAdapterProps,
	createBaqkAdapter,
} from "../context/create-adapter.js";
import type { RouterAdapter } from "../core/types.js";

function useTanStackRouterAdapter(): RouterAdapter {
	const navigate = useNavigate();
	const routerState = useRouterState({
		select: (s) => ({
			pathname: s.location.pathname,
			search: s.location.searchStr,
		}),
	});

	const getCurrentPath = useCallback(
		() =>
			routerState.search
				? `${routerState.pathname}?${routerState.search}`
				: routerState.pathname,
		[routerState.pathname, routerState.search],
	);

	const nav = useCallback(
		(path: string, options?: { replace?: boolean }) => {
			navigate({ to: path, replace: options?.replace });
		},
		[navigate],
	);

	const getHistoryState = useCallback((): Record<string, unknown> | null => {
		return (window.history.state as Record<string, unknown>) ?? null;
	}, []);

	const replaceHistoryState = useCallback((patch: Record<string, unknown>) => {
		window.history.replaceState({ ...window.history.state, ...patch }, "");
	}, []);

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
