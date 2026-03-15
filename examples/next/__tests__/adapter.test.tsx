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
const { useBaqk, useTrailClick } = await import("baqk");

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
		// Sync window.location with mocked router state since
		// getCurrentPath now reads window.location directly
		window.history.pushState({}, "", "/products");
	});

	it("mounts without error and provides baqk context", () => {
		const wrapper = createWrapper();
		const { result } = renderHook(() => useBaqk(), { wrapper });

		expect(result.current.previousEntry).toBeNull();
		expect(result.current.restoredState).toBeNull();
	});

	it("useTrailClick pushes trail entry", () => {
		const wrapper = createWrapper();
		const { result } = renderHook(
			() => ({
				baqk: useBaqk(),
				trailClick: useTrailClick("Products"),
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
		});

		// Render a new hook instance to read updated trail from storage
		const { result: target } = renderHook(() => useBaqk(), { wrapper });
		expect(target.current.previousEntry).not.toBeNull();
		expect(target.current.previousEntry?.label).toBe("Products");
	});

	it("goBack calls router.replace with previous path", () => {
		const wrapper = createWrapper();
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
		});

		const { result: detail } = renderHook(() => useBaqk(), { wrapper });
		act(() => {
			detail.current.goBack();
		});

		expect(mocks.replace).toHaveBeenCalledWith("/products");
	});

	it("getCurrentPath includes search params", () => {
		mocks.pathname = "/products";
		mocks.searchParams = new URLSearchParams("cat=shoes&sort=price");
		window.history.pushState({}, "", "/products?cat=shoes&sort=price");

		const wrapper = createWrapper();
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
		});

		const { result: target } = renderHook(() => useBaqk(), { wrapper });
		expect(target.current.previousEntry?.path).toBe(
			"/products?cat=shoes&sort=price",
		);
	});
});
