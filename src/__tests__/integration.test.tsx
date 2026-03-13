import { act, renderHook } from "@testing-library/react";
import type React from "react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaqkContext } from "../context/baqk-context.js";
import type { RouterAdapter } from "../core/types.js";
import { useBaqk } from "../hooks/baqk.js";
import { createMemoryStorage } from "../storage/memory-storage.js";

function createMockRouter(initialPath: string): RouterAdapter & {
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

describe("Navigation flows", () => {
	let storage: ReturnType<typeof createMemoryStorage>;
	let router: ReturnType<typeof createMockRouter>;
	let wrapper: ({ children }: { children: ReactNode }) => React.JSX.Element;
	const sessionKey = "integration";

	beforeEach(() => {
		storage = createMemoryStorage();
		router = createMockRouter("/products?cat=shoes");
		wrapper = ({ children }: { children: ReactNode }) => (
			<BaqkContext.Provider value={{ router, storage, sessionKey }}>
				{children}
			</BaqkContext.Provider>
		);
		Object.defineProperty(window, "scrollY", {
			value: 0,
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

	it("Path A: filtered listing → detail → back restores state and scroll", () => {
		Object.defineProperty(window, "scrollY", { value: 340 });

		// 1. On filtered listing — save state and navigate to detail
		const { result: listing } = renderHook(() => useBaqk(), { wrapper });
		act(() => {
			listing.current.saveState({
				filters: { category: "shoes", sort: "price" },
			});
			listing.current.navigateWithTrail("/products/42", {
				label: "Products",
			});
		});
		expect(router.currentPath).toBe("/products/42");

		// 2. On detail — trail points back with label
		const { result: detail } = renderHook(
			() => useBaqk({ fallbackPath: "/products" }),
			{ wrapper },
		);
		expect(detail.current.hasTrail).toBe(true);
		expect(detail.current.previousEntry?.label).toBe("Products");

		// 3. Go back
		act(() => detail.current.goBack());
		expect(router.currentPath).toBe("/products?cat=shoes");

		// 4. Back on listing — state restored synchronously, scroll restored via effect
		const { result: restored } = renderHook(() => useBaqk(), { wrapper });

		expect(restored.current.restoredState).toEqual({
			filters: { category: "shoes", sort: "price" },
		});
		expect(restored.current.wasRestored).toBe(true);
		expect(window.scrollTo).toHaveBeenCalledWith(0, 340);
	});

	it("Path B: direct URL entry → back uses fallback, no state restored", () => {
		router.currentPath = "/products/42";

		const { result } = renderHook(
			() => useBaqk({ fallbackPath: "/products" }),
			{ wrapper },
		);

		expect(result.current.hasTrail).toBe(false);
		expect(result.current.wasRestored).toBe(false);
		expect(result.current.restoredState).toBeNull();

		act(() => result.current.goBack());
		expect(router.currentPath).toBe("/products");
	});

	it("Path C: listing → detail → reviews → back → back restores each level", () => {
		// 1. Listing
		const { result: listing } = renderHook(() => useBaqk(), { wrapper });
		act(() => {
			listing.current.saveState({ filters: { category: "shoes" } });
			listing.current.navigateWithTrail("/products/42", {
				label: "Products",
			});
		});

		// 2. Detail — save state and go deeper
		const { result: detail } = renderHook(() => useBaqk(), { wrapper });
		act(() => {
			detail.current.saveState({ selectedTab: "specs" });
			detail.current.navigateWithTrail("/products/42/reviews", {
				label: "Product #42",
			});
		});

		// 3. Reviews — trail has 2 entries
		const { result: reviews } = renderHook(
			() => useBaqk({ fallbackPath: "/products" }),
			{ wrapper },
		);
		expect(reviews.current.trail).toHaveLength(2);
		expect(reviews.current.previousEntry?.label).toBe("Product #42");

		// 4. Back to detail — detail state restored
		act(() => reviews.current.goBack());
		expect(router.currentPath).toBe("/products/42");

		const { result: backDetail } = renderHook(() => useBaqk(), {
			wrapper,
		});
		expect(backDetail.current.restoredState).toEqual({
			selectedTab: "specs",
		});
		expect(backDetail.current.trail).toHaveLength(1);

		// 5. Back to listing — listing state restored
		act(() => backDetail.current.goBack());
		expect(router.currentPath).toBe("/products?cat=shoes");

		const { result: backListing } = renderHook(() => useBaqk(), {
			wrapper,
		});
		expect(backListing.current.restoredState).toEqual({
			filters: { category: "shoes" },
		});
	});

	it("session key change makes previous user's state invisible", () => {
		const wrapperA = ({ children }: { children: ReactNode }) => (
			<BaqkContext.Provider value={{ router, storage, sessionKey: "user-a" }}>
				{children}
			</BaqkContext.Provider>
		);
		const { result: userA } = renderHook(() => useBaqk(), {
			wrapper: wrapperA,
		});
		act(() => {
			userA.current.saveState({ secret: "data" });
			userA.current.navigateWithTrail("/page2");
		});

		const wrapperB = ({ children }: { children: ReactNode }) => (
			<BaqkContext.Provider value={{ router, storage, sessionKey: "user-b" }}>
				{children}
			</BaqkContext.Provider>
		);
		const { result: userB } = renderHook(() => useBaqk(), {
			wrapper: wrapperB,
		});

		expect(userB.current.hasTrail).toBe(false);
		expect(userB.current.wasRestored).toBe(false);
		expect(userB.current.restoredState).toBeNull();
	});
});
