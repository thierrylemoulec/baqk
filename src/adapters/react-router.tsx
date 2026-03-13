import { useCallback, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";
import {
	type BaqkAdapterProps,
	createBaqkAdapter,
} from "../context/create-adapter.js";
import type { RouterAdapter } from "../core/types.js";

function useReactRouterAdapter(): RouterAdapter {
	const navigate = useNavigate();
	const location = useLocation();

	const getCurrentPath = useCallback(
		() => location.pathname + location.search,
		[location.pathname, location.search],
	);

	const nav = useCallback(
		(path: string, options?: { replace?: boolean }) => {
			navigate(path, { replace: options?.replace });
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
	useReactRouterAdapter,
);

export type { BaqkAdapterProps };
