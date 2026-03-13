"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
	type BaqkAdapterProps,
	createBaqkAdapter,
} from "../context/create-adapter.js";
import type { RouterAdapter } from "../core/types.js";
import { useCurrentPath, useHistoryState } from "../utils/browser.js";

function useNextRouterAdapter(): RouterAdapter {
	const router = useRouter();
	const getCurrentPath = useCurrentPath();
	const { getHistoryState, replaceHistoryState } = useHistoryState();

	const nav = useCallback(
		(path: string, options?: { replace?: boolean }) => {
			if (options?.replace) {
				router.replace(path);
			} else {
				router.push(path);
			}
		},
		[router],
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

export const BaqkAdapter: React.FC<BaqkAdapterProps> =
	createBaqkAdapter(useNextRouterAdapter);

export type { BaqkAdapterProps };
