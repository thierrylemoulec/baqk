import { act, renderHook } from "@testing-library/react";
import React, { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaqkContext } from "../../context/baqk-context.js";
import type { BaqkContextValue, RouterAdapter } from "../../core/types.js";
import { createMemoryStorage } from "../../storage/memory-storage.js";
import { useBaqk } from "../baqk.js";

function createMockRouter(initialPath = "/products"): RouterAdapter & {
	historyState: Record<string, unknown>;
	currentPath: string;
} {
	const mock = {
		currentPath: initialPath,
		historyState: {} as Record<string, unknown>,
		getCurrentPath: () => mock.currentPath,
		navigate: vi.fn((path: string) => {
			mock.currentPath = path;
			mock.historyState = {};
		}),
		getHistoryState: () => mock.historyState,
		replaceHistoryState: (patch: Record<string, unknown>) => {
			mock.historyState = { ...mock.historyState, ...patch };
		},
	};
	return mock;
}

function createWrapper(ctx: BaqkContextValue) {
	return function Wrapper({ children }: { children: ReactNode }) {
		return <BaqkContext.Provider value={ctx}>{children}</BaqkContext.Provider>;
	};
}

describe("useBaqk", () => {
	let storage: ReturnType<typeof createMemoryStorage>;
	let router: ReturnType<typeof createMockRouter>;
	let wrapper: ReturnType<typeof createWrapper>;
	const sessionKey = "test";

	beforeEach(() => {
		storage = createMemoryStorage();
		router = createMockRouter();
		wrapper = createWrapper({ router, storage, sessionKey });
	});

	it("throws when used outside provider", () => {
		expect(() => renderHook(() => useBaqk())).toThrow("[baqk]");
	});

	describe("navigation", () => {
		it("navigateWithTrail moves to new path and records current page on trail", () => {
			const { result } = renderHook(() => useBaqk(), { wrapper });

			act(() => {
				result.current.navigateWithTrail("/products/42", {
					label: "Products",
				});
			});

			expect(router.currentPath).toBe("/products/42");

			const { result: target } = renderHook(() => useBaqk(), { wrapper });
			expect(target.current.hasTrail).toBe(true);
			expect(target.current.previousEntry?.path).toBe("/products");
			expect(target.current.previousEntry?.label).toBe("Products");
		});

		it("goBack returns to previous page when trail has entries", () => {
			const { result } = renderHook(() => useBaqk(), { wrapper });
			act(() => result.current.navigateWithTrail("/products/42"));

			const { result: detail } = renderHook(() => useBaqk(), { wrapper });
			act(() => detail.current.goBack());

			expect(router.currentPath).toBe("/products");
		});

		it("goBack navigates to fallback when trail is empty", () => {
			const { result } = renderHook(() => useBaqk({ fallbackPath: "/home" }), {
				wrapper,
			});

			act(() => result.current.goBack());

			expect(router.currentPath).toBe("/home");
		});

		it("goBack prefers inline fallback over options fallback", () => {
			const { result } = renderHook(() => useBaqk({ fallbackPath: "/home" }), {
				wrapper,
			});

			act(() => result.current.goBack("/override"));

			expect(router.currentPath).toBe("/override");
		});

		it("goBack does nothing when trail is empty and no fallback provided", () => {
			const { result } = renderHook(() => useBaqk(), { wrapper });

			act(() => result.current.goBack());

			expect(router.currentPath).toBe("/products");
		});
	});

	describe("state preservation", () => {
		it("restoredState contains saved state after navigating back", () => {
			const { result: listing } = renderHook(() => useBaqk(), {
				wrapper,
			});
			act(() => {
				listing.current.saveState({
					filters: { category: "shoes" },
				});
				listing.current.navigateWithTrail("/products/42");
			});

			const { result: detail } = renderHook(() => useBaqk(), {
				wrapper,
			});
			act(() => detail.current.goBack());

			// restoredState is available synchronously on first render — no effect needed
			const { result: restored } = renderHook(() => useBaqk(), {
				wrapper,
			});
			expect(restored.current.restoredState).toEqual({
				filters: { category: "shoes" },
			});
			expect(restored.current.wasRestored).toBe(true);
		});

		it("wasRestored is false when no state exists for this page", () => {
			const { result: page1 } = renderHook(() => useBaqk(), { wrapper });
			act(() => page1.current.navigateWithTrail("/next"));

			// Fresh page with no prior state
			const { result: page2 } = renderHook(() => useBaqk(), { wrapper });
			expect(page2.current.wasRestored).toBe(false);
			expect(page2.current.restoredState).toBeNull();
		});

		it("navigateWithTrail saves inline state for current page", () => {
			const { result: page1 } = renderHook(() => useBaqk(), { wrapper });
			act(() => {
				page1.current.navigateWithTrail("/next", {
					state: { sort: "price" },
				});
			});

			const { result: page2 } = renderHook(() => useBaqk(), { wrapper });
			act(() => page2.current.goBack());

			const { result: restored } = renderHook(() => useBaqk(), {
				wrapper,
			});
			expect(restored.current.restoredState).toEqual({ sort: "price" });
		});

		it("restoreState returns previously saved state", () => {
			const { result } = renderHook(() => useBaqk<{ x: number }>(), {
				wrapper,
			});

			act(() => result.current.saveState({ x: 42 }));

			expect(result.current.restoreState()).toEqual({ x: 42 });
		});

		it("restoredState is usable in useState initializer on first render", () => {
			const { result: listing } = renderHook(() => useBaqk(), {
				wrapper,
			});
			act(() => {
				listing.current.saveState({ page: 3 });
				listing.current.navigateWithTrail("/detail");
			});
			const { result: detail } = renderHook(() => useBaqk(), {
				wrapper,
			});
			act(() => detail.current.goBack());

			// useState initializer runs exactly once, during the first render.
			// If restoredState were set via an effect (async), it would be null
			// at initializer time and page would be stuck at the default of 1.
			const { result } = renderHook(
				() => {
					const { restoredState } = useBaqk<{ page: number }>();
					const [page] = useState(() => restoredState?.page ?? 1);
					return page;
				},
				{ wrapper },
			);

			expect(result.current).toBe(3);
		});

		it("restoredState is available on first render without re-rendering", () => {
			const { result: listing } = renderHook(() => useBaqk(), {
				wrapper,
			});
			act(() => {
				listing.current.saveState({ x: 1 });
				listing.current.navigateWithTrail("/next");
			});
			const { result: page2 } = renderHook(() => useBaqk(), {
				wrapper,
			});
			act(() => page2.current.goBack());

			// Track every render's restoredState value
			const renders: Array<unknown> = [];
			renderHook(
				() => {
					const baqk = useBaqk();
					renders.push(baqk.restoredState);
					return baqk;
				},
				{ wrapper },
			);

			// Single render, value present immediately — no effect-driven update
			expect(renders).toHaveLength(1);
			expect(renders[0]).toEqual({ x: 1 });
		});

		it("last saveState before navigating is the one restored", () => {
			const { result } = renderHook(() => useBaqk(), { wrapper });
			act(() => {
				result.current.saveState({ v: 1 });
				result.current.saveState({ v: 2 });
				result.current.navigateWithTrail("/next");
			});

			const { result: page2 } = renderHook(() => useBaqk(), {
				wrapper,
			});
			act(() => page2.current.goBack());

			const { result: restored } = renderHook(() => useBaqk(), {
				wrapper,
			});
			expect(restored.current.restoredState).toEqual({ v: 2 });
		});
	});

	describe("scroll restoration", () => {
		beforeEach(() => {
			Object.defineProperty(window, "scrollY", {
				value: 340,
				writable: true,
				configurable: true,
			});
			vi.spyOn(window, "scrollTo").mockImplementation(() => {});
			vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
				cb(0);
				return 0;
			});
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("saves and restores scroll position during back navigation", () => {
			const { result: listing } = renderHook(() => useBaqk(), {
				wrapper,
			});
			act(() => listing.current.navigateWithTrail("/detail"));

			const { result: detail } = renderHook(() => useBaqk(), {
				wrapper,
			});
			act(() => detail.current.goBack());

			renderHook(() => useBaqk(), { wrapper });
			expect(window.scrollTo).toHaveBeenCalledWith(0, 340);
		});

		it("does not save or restore scroll when autoSaveScroll is false", () => {
			const { result: listing } = renderHook(
				() => useBaqk({ autoSaveScroll: false }),
				{ wrapper },
			);
			act(() => listing.current.navigateWithTrail("/detail"));

			const { result: detail } = renderHook(() => useBaqk(), {
				wrapper,
			});
			act(() => detail.current.goBack());

			renderHook(() => useBaqk({ autoSaveScroll: false }), { wrapper });
			expect(window.scrollTo).not.toHaveBeenCalled();
		});
	});

	describe("isolation and cleanup", () => {
		it("trails are isolated between different session keys", () => {
			const wrapperA = createWrapper({
				router,
				storage,
				sessionKey: "user-a",
			});
			const { result: userA } = renderHook(() => useBaqk(), {
				wrapper: wrapperA,
			});
			act(() => userA.current.navigateWithTrail("/secret"));

			const wrapperB = createWrapper({
				router,
				storage,
				sessionKey: "user-b",
			});
			const { result: userB } = renderHook(() => useBaqk(), {
				wrapper: wrapperB,
			});
			expect(userB.current.hasTrail).toBe(false);
		});

		it("clearAll removes all trail entries", () => {
			const { result } = renderHook(() => useBaqk(), { wrapper });
			act(() => result.current.navigateWithTrail("/a"));

			const { result: page2 } = renderHook(() => useBaqk(), { wrapper });
			expect(page2.current.hasTrail).toBe(true);

			act(() => page2.current.clearAll());

			const { result: after } = renderHook(() => useBaqk(), { wrapper });
			expect(after.current.hasTrail).toBe(false);
		});

		it("clearAll prevents state restoration for cleared entries", () => {
			const { result: page1 } = renderHook(() => useBaqk(), { wrapper });
			act(() => {
				page1.current.saveState({ x: 1 });
				page1.current.navigateWithTrail("/next");
			});

			const { result: page2 } = renderHook(() => useBaqk(), { wrapper });
			act(() => page2.current.clearAll());
			act(() => page2.current.goBack());

			expect(router.currentPath).toBe("/next");
		});
	});
});
