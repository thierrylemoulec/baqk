import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
	type BaqkAdapterProps,
	createBaqkAdapter,
} from "../context/create-adapter.js";
import type { RouterAdapter } from "../core/types.js";

function useNextRouterAdapter(): RouterAdapter {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	const getCurrentPath = useCallback(() => {
		const search = searchParams.toString();
		return search ? `${pathname}?${search}` : pathname;
	}, [pathname, searchParams]);

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

export const BaqkAdapter: React.FC<BaqkAdapterProps> =
	createBaqkAdapter(useNextRouterAdapter);

export type { BaqkAdapterProps };
