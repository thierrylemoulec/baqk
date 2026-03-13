import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import {
	type BaqkAdapterProps,
	createBaqkAdapter,
} from "../context/create-adapter.js";
import type { RouterAdapter } from "../core/types.js";
import { useCurrentPath, useHistoryState } from "../utils/browser.js";

function useReactRouterAdapter(): RouterAdapter {
	const navigate = useNavigate();
	const getCurrentPath = useCurrentPath();
	const { getHistoryState, replaceHistoryState } = useHistoryState();

	const nav = useCallback(
		(path: string, options?: { replace?: boolean }) => {
			navigate(path, { replace: options?.replace });
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
	useReactRouterAdapter,
);

export type { BaqkAdapterProps };
