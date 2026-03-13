import { act, renderHook } from "@testing-library/react";
import React, { type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock next/navigation before any imports that depend on it
const mocks = {
	push: vi.fn(),
	replace: vi.fn(),
	pathname: "/products",
	searchParams: new URLSearchParams(),
};

vi.mock("next/navigation", () => ({
	useRouter: () => ({ push: mocks.push, replace: mocks.replace }),
	usePathname: () => mocks.pathname,
	useSearchParams: () => mocks.searchParams,
}));

// Import after mock is set up (vitest hoists vi.mock automatically)
const { BaqkAdapter } = await import("baqk/adapters/next");
const { useBaqk } = await import("baqk");

function createWrapper() {
	return function Wrapper({ children }: { children: ReactNode }) {
		return <BaqkAdapter sessionKey="test">{children}</BaqkAdapter>;
	};
}

describe("Next.js adapter", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		sessionStorage.clear();
		mocks.pathname = "/products";
		mocks.searchParams = new URLSearchParams();
	});

	it("mounts without error and provides baqk context", () => {
		const wrapper = createWrapper();
		const { result } = renderHook(() => useBaqk(), { wrapper });

		expect(result.current.hasTrail).toBe(false);
		expect(result.current.restoredState).toBeNull();
	});

	it("navigateWithTrail calls router.push", () => {
		const wrapper = createWrapper();
		const { result } = renderHook(() => useBaqk(), { wrapper });

		act(() => {
			result.current.navigateWithTrail("/products/42", {
				label: "Products",
			});
		});

		expect(mocks.push).toHaveBeenCalledWith("/products/42");

		// Render a new hook instance to read updated trail from storage
		const { result: target } = renderHook(() => useBaqk(), { wrapper });
		expect(target.current.hasTrail).toBe(true);
		expect(target.current.previousEntry?.label).toBe("Products");
	});

	it("goBack calls router.push with previous path", () => {
		const wrapper = createWrapper();
		const { result } = renderHook(() => useBaqk(), { wrapper });

		act(() => {
			result.current.navigateWithTrail("/products/42");
		});

		const { result: detail } = renderHook(() => useBaqk(), { wrapper });
		act(() => {
			detail.current.goBack();
		});

		expect(mocks.push).toHaveBeenCalledWith("/products");
	});

	it("getCurrentPath includes search params", () => {
		mocks.pathname = "/products";
		mocks.searchParams = new URLSearchParams("cat=shoes&sort=price");

		const wrapper = createWrapper();
		const { result } = renderHook(() => useBaqk(), { wrapper });

		act(() => {
			result.current.navigateWithTrail("/products/42");
		});

		const { result: target } = renderHook(() => useBaqk(), { wrapper });
		expect(target.current.previousEntry?.path).toBe(
			"/products?cat=shoes&sort=price",
		);
	});
});
