import { act, renderHook } from "@testing-library/react";
import { BaqkAdapter, useBaqk, useTrailClick } from "@thrylm/baqk";
import React, { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

function makeClickEvent(href = "/next"): React.MouseEvent {
	const anchor = document.createElement("a");
	anchor.setAttribute("href", href);
	return {
		button: 0,
		defaultPrevented: false,
		metaKey: false,
		ctrlKey: false,
		shiftKey: false,
		altKey: false,
		currentTarget: anchor,
		target: anchor,
	} as unknown as React.MouseEvent;
}

describe("Generic adapter", () => {
	let currentPath: string;
	const navigateFn = vi.fn((path: string, _options?: { replace?: boolean }) => {
		currentPath = path;
	});

	function createWrapper() {
		return function Wrapper({ children }: { children: ReactNode }) {
			return (
				<BaqkAdapter
					navigate={navigateFn}
					getCurrentPath={() => currentPath}
					sessionKey="test"
				>
					{children}
				</BaqkAdapter>
			);
		};
	}

	beforeEach(() => {
		currentPath = "/products";
		vi.clearAllMocks();
		sessionStorage.clear();
	});

	it("mounts with custom navigate and getCurrentPath", () => {
		const wrapper = createWrapper();
		const { result } = renderHook(() => useBaqk(), { wrapper });

		expect(result.current.previousEntry).toBeNull();
		expect(result.current.restoredState).toBeNull();
	});

	it("useTrailClick + goBack calls the provided navigate function", () => {
		const wrapper = createWrapper();
		const { result } = renderHook(
			() => ({
				baqk: useBaqk(),
				trailClick: useTrailClick("Products"),
			}),
			{ wrapper },
		);

		act(() => {
			result.current.trailClick(makeClickEvent());
			currentPath = "/products/42";
		});

		// Render a new hook instance to read updated trail from storage
		const { result: target } = renderHook(() => useBaqk(), { wrapper });
		expect(target.current.previousEntry).not.toBeNull();
		expect(target.current.previousEntry?.path).toBe("/products");
		expect(target.current.previousEntry?.label).toBe("Products");
	});

	it("goBack calls navigate with previous path", () => {
		const wrapper = createWrapper();
		const { result } = renderHook(
			() => ({
				baqk: useBaqk(),
				trailClick: useTrailClick(),
			}),
			{ wrapper },
		);

		act(() => {
			result.current.trailClick(makeClickEvent());
			currentPath = "/products/42";
		});

		const { result: detail } = renderHook(() => useBaqk(), { wrapper });
		act(() => {
			detail.current.goBack();
		});

		expect(navigateFn).toHaveBeenLastCalledWith("/products", {
			replace: true,
		});

		const { result: after } = renderHook(() => useBaqk(), { wrapper });
		expect(after.current.previousEntry).toBeNull();
	});

	it("goBack uses fallback when no trail exists", () => {
		const wrapper = createWrapper();
		const { result } = renderHook(
			() => useBaqk({ fallbackPath: "/home" }),
			{ wrapper },
		);

		act(() => {
			result.current.goBack();
		});

		expect(navigateFn).toHaveBeenCalledWith("/home", undefined);
	});
});
