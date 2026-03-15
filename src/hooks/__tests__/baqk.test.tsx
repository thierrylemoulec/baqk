import { act, renderHook } from "@testing-library/react";
import React, { useState, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaqkContext } from "../../context/baqk-context.js";
import type { BaqkContextValue, RouterAdapter } from "../../core/types.js";
import { createMemoryStorage } from "../../storage/memory-storage.js";
import { useBaqk } from "../baqk.js";
import { useTrailClick } from "../trail-click.js";

function createMockRouter(initialPath = "/products"): RouterAdapter & {
	historyState: Record<string, unknown>;
	currentPath: string;
} {
	const mock = {
		currentPath: initialPath,
		historyState: {} as Record<string, unknown>,
		getCurrentPath: () => mock.currentPath,
		navigate: vi.fn((path: string, _options?: { replace?: boolean }) => {
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
		it("useTrailClick pushes trail entry, goBack returns to previous page", () => {
			const { result } = renderHook(
				() => ({
					baqk: useBaqk(),
					trailClick: useTrailClick("Products"),
				}),
				{ wrapper },
			);

			// Simulate a left-click that pushes a trail entry
			act(() => {
				result.current.trailClick({
					button: 0,
					defaultPrevented: false,
					metaKey: false,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
				} as React.MouseEvent);
				// Simulate navigation (the link would do this)
				router.currentPath = "/products/42";
				router.historyState = {};
			});

			// On the detail page — trail points back
			const { result: target } = renderHook(() => useBaqk(), { wrapper });
			expect(target.current.previousEntry).not.toBeNull();
			expect(target.current.previousEntry?.path).toBe("/products");
			expect(target.current.previousEntry?.label).toBe("Products");

			// Go back
			act(() => target.current.goBack());
			expect(router.currentPath).toBe("/products");
			expect(router.navigate).toHaveBeenLastCalledWith("/products", {
				replace: true,
			});
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
			const { result } = renderHook(
				() => ({
					baqk: useBaqk(),
					trailClick: useTrailClick(),
				}),
				{ wrapper },
			);
			act(() => {
				result.current.baqk.saveState({
					filters: { category: "shoes" },
				});
				result.current.trailClick({
					button: 0,
					defaultPrevented: false,
					metaKey: false,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
				} as React.MouseEvent);
				router.currentPath = "/products/42";
				router.historyState = {};
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
			const { result } = renderHook(
				() => ({
					baqk: useBaqk(),
					trailClick: useTrailClick(),
				}),
				{ wrapper },
			);
			act(() => {
				result.current.trailClick({
					button: 0,
					defaultPrevented: false,
					metaKey: false,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
				} as React.MouseEvent);
				router.currentPath = "/next";
				router.historyState = {};
			});

			// Fresh page with no prior state
			const { result: page2 } = renderHook(() => useBaqk(), { wrapper });
			expect(page2.current.wasRestored).toBe(false);
			expect(page2.current.restoredState).toBeNull();
		});

		it("restoredState is usable in useState initializer on first render", () => {
			const { result } = renderHook(
				() => ({
					baqk: useBaqk(),
					trailClick: useTrailClick(),
				}),
				{ wrapper },
			);
			act(() => {
				result.current.baqk.saveState({ page: 3 });
				result.current.trailClick({
					button: 0,
					defaultPrevented: false,
					metaKey: false,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
				} as React.MouseEvent);
				router.currentPath = "/detail";
				router.historyState = {};
			});
			const { result: detail } = renderHook(() => useBaqk(), {
				wrapper,
			});
			act(() => detail.current.goBack());

			// useState initializer runs exactly once, during the first render.
			// If restoredState were set via an effect (async), it would be null
			// at initializer time and page would be stuck at the default of 1.
			const { result: page } = renderHook(
				() => {
					const { restoredState } = useBaqk<{ page: number }>();
					const [p] = useState(() => restoredState?.page ?? 1);
					return p;
				},
				{ wrapper },
			);

			expect(page.current).toBe(3);
		});

		it("restoredState is available on first render without re-rendering", () => {
			const { result } = renderHook(
				() => ({
					baqk: useBaqk(),
					trailClick: useTrailClick(),
				}),
				{ wrapper },
			);
			act(() => {
				result.current.baqk.saveState({ x: 1 });
				result.current.trailClick({
					button: 0,
					defaultPrevented: false,
					metaKey: false,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
				} as React.MouseEvent);
				router.currentPath = "/next";
				router.historyState = {};
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
			const { result } = renderHook(
				() => ({
					baqk: useBaqk(),
					trailClick: useTrailClick(),
				}),
				{ wrapper },
			);
			act(() => {
				result.current.baqk.saveState({ v: 1 });
				result.current.baqk.saveState({ v: 2 });
				result.current.trailClick({
					button: 0,
					defaultPrevented: false,
					metaKey: false,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
				} as React.MouseEvent);
				router.currentPath = "/next";
				router.historyState = {};
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
			const { result } = renderHook(
				() => ({
					baqk: useBaqk(),
					trailClick: useTrailClick(),
				}),
				{ wrapper },
			);
			act(() => {
				result.current.trailClick({
					button: 0,
					defaultPrevented: false,
					metaKey: false,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
				} as React.MouseEvent);
				router.currentPath = "/detail";
				router.historyState = {};
			});

			const { result: detail } = renderHook(() => useBaqk(), {
				wrapper,
			});
			act(() => detail.current.goBack());

			renderHook(() => useBaqk(), { wrapper });
			expect(window.scrollTo).toHaveBeenCalledWith(0, 340);
		});

		it("does not save or restore scroll when autoSaveScroll is false", () => {
			// useTrailClick always saves scroll, so we test that useBaqk
			// with autoSaveScroll:false does NOT restore it
			const { result } = renderHook(
				() => ({
					baqk: useBaqk({ autoSaveScroll: false }),
					trailClick: useTrailClick(),
				}),
				{ wrapper },
			);
			act(() => {
				result.current.trailClick({
					button: 0,
					defaultPrevented: false,
					metaKey: false,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
				} as React.MouseEvent);
				router.currentPath = "/detail";
				router.historyState = {};
			});

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
			const { result } = renderHook(
				() => ({
					baqk: useBaqk(),
					trailClick: useTrailClick(),
				}),
				{ wrapper: wrapperA },
			);
			act(() => {
				result.current.trailClick({
					button: 0,
					defaultPrevented: false,
					metaKey: false,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
				} as React.MouseEvent);
				router.currentPath = "/secret";
				router.historyState = {};
			});

			const wrapperB = createWrapper({
				router,
				storage,
				sessionKey: "user-b",
			});
			const { result: userB } = renderHook(() => useBaqk(), {
				wrapper: wrapperB,
			});
			expect(userB.current.previousEntry).toBeNull();
		});

		it("clear removes all trail entries", () => {
			const { result } = renderHook(
				() => ({
					baqk: useBaqk(),
					trailClick: useTrailClick(),
				}),
				{ wrapper },
			);
			act(() => {
				result.current.trailClick({
					button: 0,
					defaultPrevented: false,
					metaKey: false,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
				} as React.MouseEvent);
				router.currentPath = "/a";
				router.historyState = {};
			});

			const { result: page2 } = renderHook(() => useBaqk(), { wrapper });
			expect(page2.current.previousEntry).not.toBeNull();

			act(() => page2.current.clear());

			const { result: after } = renderHook(() => useBaqk(), { wrapper });
			expect(after.current.previousEntry).toBeNull();
		});

		it("clear prevents state restoration for cleared entries", () => {
			const { result } = renderHook(
				() => ({
					baqk: useBaqk(),
					trailClick: useTrailClick(),
				}),
				{ wrapper },
			);
			act(() => {
				result.current.baqk.saveState({ x: 1 });
				result.current.trailClick({
					button: 0,
					defaultPrevented: false,
					metaKey: false,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
				} as React.MouseEvent);
				router.currentPath = "/next";
				router.historyState = {};
			});

			const { result: page2 } = renderHook(() => useBaqk(), { wrapper });
			act(() => page2.current.clear());
			act(() => page2.current.goBack());

			expect(router.currentPath).toBe("/next");
		});

		it("clear removes scroll saved for the current page", () => {
			Object.defineProperty(window, "scrollY", {
				value: 275,
				writable: true,
				configurable: true,
			});
			vi.spyOn(window, "scrollTo").mockImplementation(() => {});
			vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
				cb(0);
				return 0;
			});

			const { result } = renderHook(
				() => ({
					baqk: useBaqk(),
					trailClick: useTrailClick(),
				}),
				{ wrapper },
			);
			act(() => {
				result.current.trailClick({
					button: 0,
					defaultPrevented: false,
					metaKey: false,
					ctrlKey: false,
					shiftKey: false,
					altKey: false,
				} as React.MouseEvent);
				router.currentPath = "/detail";
				router.historyState = {};
			});

			const { result: detail } = renderHook(() => useBaqk(), { wrapper });
			act(() => {
				detail.current.clear();
				detail.current.goBack("/products");
			});

			renderHook(() => useBaqk(), { wrapper });
			expect(window.scrollTo).not.toHaveBeenCalled();
		});
	});
});
