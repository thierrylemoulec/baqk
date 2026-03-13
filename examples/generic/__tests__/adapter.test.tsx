import { act, renderHook } from "@testing-library/react";
import { BaqkAdapter, useBaqk } from "baqk";
import React, { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("Generic adapter", () => {
	let currentPath: string;
	const navigateFn = vi.fn((path: string) => {
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

		expect(result.current.hasTrail).toBe(false);
		expect(result.current.restoredState).toBeNull();
	});

	it("navigateWithTrail calls the provided navigate function", () => {
		const wrapper = createWrapper();
		const { result } = renderHook(() => useBaqk(), { wrapper });

		act(() => {
			result.current.navigateWithTrail("/products/42", {
				label: "Products",
			});
		});

		expect(navigateFn).toHaveBeenCalledWith("/products/42");

		// Render a new hook instance to read updated trail from storage
		const { result: target } = renderHook(() => useBaqk(), { wrapper });
		expect(target.current.hasTrail).toBe(true);
		expect(target.current.previousEntry?.path).toBe("/products");
		expect(target.current.previousEntry?.label).toBe("Products");
	});

	it("goBack calls navigate with previous path", () => {
		const wrapper = createWrapper();
		const { result } = renderHook(() => useBaqk(), { wrapper });

		act(() => {
			result.current.navigateWithTrail("/products/42");
		});

		const { result: detail } = renderHook(() => useBaqk(), { wrapper });
		act(() => {
			detail.current.goBack();
		});

		expect(navigateFn).toHaveBeenLastCalledWith("/products");

		const { result: after } = renderHook(() => useBaqk(), { wrapper });
		expect(after.current.hasTrail).toBe(false);
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

		expect(navigateFn).toHaveBeenCalledWith("/home");
	});
});
