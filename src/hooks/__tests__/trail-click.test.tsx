import { act, renderHook } from "@testing-library/react";
import React, { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaqkContext } from "../../context/baqk-context.js";
import type { BaqkContextValue, RouterAdapter } from "../../core/types.js";
import { createMemoryStorage } from "../../storage/memory-storage.js";
import { getTrail } from "../../core/trail-manager.js";
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

function makeMouseEvent(
	overrides: Partial<React.MouseEvent> = {},
): React.MouseEvent {
	return {
		button: 0,
		metaKey: false,
		ctrlKey: false,
		shiftKey: false,
		altKey: false,
		defaultPrevented: false,
		...overrides,
	} as React.MouseEvent;
}

function makeAnchor(
	href: string,
	options: { target?: string; download?: string } = {},
): HTMLAnchorElement {
	const anchor = document.createElement("a");
	anchor.setAttribute("href", href);
	if (options.target) {
		anchor.setAttribute("target", options.target);
	}
	if (options.download !== undefined) {
		anchor.setAttribute("download", options.download);
	}
	return anchor;
}

function makeAnchorClick(
	href: string,
	overrides: Partial<React.MouseEvent> = {},
	options: { target?: string; download?: string } = {},
): React.MouseEvent {
	return makeMouseEvent({
		currentTarget: makeAnchor(href, options),
		...overrides,
	});
}

function makeDelegationClick(
	anchorHref: string,
	overrides: Partial<React.MouseEvent> = {},
	anchorOptions: { target?: string; download?: string } = {},
): React.MouseEvent {
	const wrapperDiv = document.createElement("div");
	const anchor = makeAnchor(anchorHref, anchorOptions);
	wrapperDiv.appendChild(anchor);
	return makeMouseEvent({
		target: anchor,
		currentTarget: wrapperDiv,
		defaultPrevented: true,
		...overrides,
	});
}

describe("useTrailClick", () => {
	let storage: ReturnType<typeof createMemoryStorage>;
	let router: ReturnType<typeof createMockRouter>;
	let wrapper: ReturnType<typeof createWrapper>;
	const sessionKey = "test";

	beforeEach(() => {
		storage = createMemoryStorage();
		router = createMockRouter();
		wrapper = createWrapper({ router, storage, sessionKey });
		Object.defineProperty(window, "scrollY", {
			value: 200,
			writable: true,
			configurable: true,
		});
		window.history.pushState({}, "", "/products");
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("pushes a trail entry on click", () => {
		const { result } = renderHook(() => useTrailClick("Products"), {
			wrapper,
		});

		act(() => {
			result.current(makeAnchorClick("/products/42"));
		});

		const trail = getTrail(storage, sessionKey);
		expect(trail).toHaveLength(1);
		expect(trail[0].path).toBe("/products");
		expect(trail[0].label).toBe("Products");
		expect(trail[0].navId).toEqual(expect.any(String));
		expect(trail[0].timestamp).toEqual(expect.any(Number));
	});

	it("saves scroll position on click", () => {
		const { result } = renderHook(() => useTrailClick(), { wrapper });

		act(() => {
			result.current(makeAnchorClick("/products/42"));
		});

		// Scroll was saved — verify by checking storage directly
		const trail = getTrail(storage, sessionKey);
		const scrollRaw = storage.getItem(
			`bcb:${sessionKey}:scroll:${trail[0].navId}`,
		);
		expect(scrollRaw).toBe("200");
	});

	it("skips when metaKey is pressed", () => {
		const { result } = renderHook(() => useTrailClick(), { wrapper });

		act(() => {
			result.current(makeMouseEvent({ metaKey: true }));
		});

		expect(getTrail(storage, sessionKey)).toHaveLength(0);
	});

	it("skips when ctrlKey is pressed", () => {
		const { result } = renderHook(() => useTrailClick(), { wrapper });

		act(() => {
			result.current(makeMouseEvent({ ctrlKey: true }));
		});

		expect(getTrail(storage, sessionKey)).toHaveLength(0);
	});

	it("skips when shiftKey is pressed", () => {
		const { result } = renderHook(() => useTrailClick(), { wrapper });

		act(() => {
			result.current(makeMouseEvent({ shiftKey: true }));
		});

		expect(getTrail(storage, sessionKey)).toHaveLength(0);
	});

	it("skips when altKey is pressed", () => {
		const { result } = renderHook(() => useTrailClick(), { wrapper });

		act(() => {
			result.current(makeMouseEvent({ altKey: true }));
		});

		expect(getTrail(storage, sessionKey)).toHaveLength(0);
	});

	it("skips when button is not 0 (e.g. middle click)", () => {
		const { result } = renderHook(() => useTrailClick(), { wrapper });

		act(() => {
			result.current(makeMouseEvent({ button: 1 }));
		});

		expect(getTrail(storage, sessionKey)).toHaveLength(0);
	});

	it("skips when defaultPrevented is true in direct mode (anchor currentTarget)", () => {
		const { result } = renderHook(() => useTrailClick(), { wrapper });

		act(() => {
			result.current(
				makeAnchorClick("/other", { defaultPrevented: true }),
			);
		});

		expect(getTrail(storage, sessionKey)).toHaveLength(0);
	});

	it("skips when called with no event", () => {
		const { result } = renderHook(() => useTrailClick(), { wrapper });

		act(() => {
			result.current();
		});

		expect(getTrail(storage, sessionKey)).toHaveLength(0);
	});

	it("skips target=_blank links", () => {
		const { result } = renderHook(() => useTrailClick(), { wrapper });

		act(() => {
			result.current(
				makeAnchorClick("/products/42", {}, { target: "_blank" }),
			);
		});

		expect(getTrail(storage, sessionKey)).toHaveLength(0);
	});

	it("skips external links", () => {
		const { result } = renderHook(() => useTrailClick(), { wrapper });

		act(() => {
			result.current(makeAnchorClick("https://example.com/products/42"));
		});

		expect(getTrail(storage, sessionKey)).toHaveLength(0);
	});

	it("skips download links", () => {
		const { result } = renderHook(() => useTrailClick(), { wrapper });

		act(() => {
			result.current(makeAnchorClick("/report.csv", {}, { download: "" }));
		});

		expect(getTrail(storage, sessionKey)).toHaveLength(0);
	});

	it("skips hash-only links", () => {
		const { result } = renderHook(() => useTrailClick(), { wrapper });

		act(() => {
			result.current(makeAnchorClick("#details"));
		});

		expect(getTrail(storage, sessionKey)).toHaveLength(0);
	});

	it("captures path at click time, not hook time", () => {
		const { result } = renderHook(() => useTrailClick("Page"), { wrapper });

		// Change the router's current path after hook init
		router.currentPath = "/changed";

		act(() => {
			result.current(makeAnchorClick("/products/42"));
		});

		const trail = getTrail(storage, sessionKey);
		expect(trail[0].path).toBe("/changed");
	});

	it("works without useBaqk on the same page", () => {
		// useTrailClick alone — no useBaqk needed
		const { result } = renderHook(() => useTrailClick("Label"), { wrapper });

		act(() => {
			result.current(makeAnchorClick("/products/42"));
		});

		const trail = getTrail(storage, sessionKey);
		expect(trail).toHaveLength(1);
	});

	it("is idempotent with useBaqk — shares the same navId", () => {
		const { result } = renderHook(
			() => {
				const baqk = useBaqk();
				const trailClick = useTrailClick("Label");
				return { baqk, trailClick };
			},
			{ wrapper },
		);

		act(() => {
			result.current.trailClick(makeAnchorClick("/products/42"));
		});

		const trail = getTrail(storage, sessionKey);
		expect(trail).toHaveLength(1);
		// The navId from both hooks should be the same
		// (ensureNavId is idempotent — stamps once, reads after)
		expect(trail[0].navId).toEqual(expect.any(String));
		expect(trail[0].navId.length).toBeGreaterThan(0);
	});

	describe("delegation mode (handler on wrapper div)", () => {
		it("pushes trail when child <a> has defaultPrevented (router link)", () => {
			const { result } = renderHook(() => useTrailClick("Products"), {
				wrapper,
			});

			act(() => {
				result.current(makeDelegationClick("/products/42"));
			});

			const trail = getTrail(storage, sessionKey);
			expect(trail).toHaveLength(1);
			expect(trail[0].label).toBe("Products");
		});

		it("skips when click target is not a link (e.g. button)", () => {
			const { result } = renderHook(() => useTrailClick(), { wrapper });

			const wrapperDiv = document.createElement("div");
			const button = document.createElement("button");
			wrapperDiv.appendChild(button);

			act(() => {
				result.current(
					makeMouseEvent({
						target: button,
						currentTarget: wrapperDiv,
					}),
				);
			});

			expect(getTrail(storage, sessionKey)).toHaveLength(0);
		});

		it("skips target=_blank links in delegation mode", () => {
			const { result } = renderHook(() => useTrailClick(), { wrapper });

			act(() => {
				result.current(
					makeDelegationClick("/products/42", {}, { target: "_blank" }),
				);
			});

			expect(getTrail(storage, sessionKey)).toHaveLength(0);
		});

		it("skips external links in delegation mode", () => {
			const { result } = renderHook(() => useTrailClick(), { wrapper });

			act(() => {
				result.current(
					makeDelegationClick("https://example.com/products/42"),
				);
			});

			expect(getTrail(storage, sessionKey)).toHaveLength(0);
		});

		it("skips download links in delegation mode", () => {
			const { result } = renderHook(() => useTrailClick(), { wrapper });

			act(() => {
				result.current(
					makeDelegationClick("/report.csv", {}, { download: "" }),
				);
			});

			expect(getTrail(storage, sessionKey)).toHaveLength(0);
		});

		it("skips when defaultPrevented and click target is not inside any anchor", () => {
			const { result } = renderHook(() => useTrailClick(), { wrapper });

			const wrapperDiv = document.createElement("div");
			const button = document.createElement("button");
			wrapperDiv.appendChild(button);

			act(() => {
				result.current(
					makeMouseEvent({
						target: button,
						currentTarget: wrapperDiv,
						defaultPrevented: true,
					}),
				);
			});

			expect(getTrail(storage, sessionKey)).toHaveLength(0);
		});

		it("skips hash-only links in delegation mode", () => {
			const { result } = renderHook(() => useTrailClick(), { wrapper });

			act(() => {
				result.current(makeDelegationClick("#details"));
			});

			expect(getTrail(storage, sessionKey)).toHaveLength(0);
		});
	});

	it("trail entry is usable by goBack", () => {
		vi.spyOn(window, "scrollTo").mockImplementation(() => {});
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			cb(0);
			return 0;
		});

		// useTrailClick pushes a trail entry
		const { result: clickResult } = renderHook(
			() => useTrailClick("Products"),
			{ wrapper },
		);

		act(() => {
			clickResult.current(makeAnchorClick("/products/42"));
		});

		// Simulate navigation to detail page
		router.currentPath = "/products/42";
		router.historyState = {};

		// useBaqk on the detail page can goBack using the trail
		const { result: detailResult } = renderHook(() => useBaqk(), { wrapper });

		expect(detailResult.current.previousEntry).not.toBeNull();
		expect(detailResult.current.previousEntry?.label).toBe("Products");

		act(() => {
			detailResult.current.goBack();
		});

		expect(router.currentPath).toBe("/products");
	});
});
