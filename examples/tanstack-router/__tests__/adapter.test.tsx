import { act, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateSpy = vi.fn();

vi.mock("@tanstack/react-router", async () => {
	const actual =
		await vi.importActual<typeof import("@tanstack/react-router")>(
			"@tanstack/react-router",
		);
	return {
		...actual,
		useNavigate: () => {
			const navigate = actual.useNavigate();
			return (options: { to: string; replace?: boolean }) => {
				navigateSpy(options);
				return navigate(options);
			};
		},
	};
});

const {
	Outlet,
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} = await import("@tanstack/react-router");
const { useBaqk, useTrailClick } = await import("@thrylm/baqk");
const { BaqkAdapter } = await import("@thrylm/baqk/adapters/tanstack");

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

let baqkRef: ReturnType<typeof useBaqk>;
let trailClickRef: ReturnType<typeof useTrailClick>;

function BaqkCapture() {
	baqkRef = useBaqk({ fallbackPath: "/products" });
	trailClickRef = useTrailClick("Products");
	return null;
}

function createTestRouter(initialPath: string) {
	const rootRoute = createRootRoute({
		component: () => (
			<BaqkAdapter sessionKey="test">
				<BaqkCapture />
				<Outlet />
			</BaqkAdapter>
		),
	});

	const productsRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/products",
		component: () => <div data-testid="page">products</div>,
	});

	const detailRoute = createRoute({
		getParentRoute: () => rootRoute,
		path: "/products/$id",
		component: () => <div data-testid="page">detail</div>,
	});

	const routeTree = rootRoute.addChildren([productsRoute, detailRoute]);

	return createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	});
}

describe("TanStack Router adapter", () => {
	beforeEach(() => {
		sessionStorage.clear();
		navigateSpy.mockClear();
		// Sync window.location with memory router's initial path since
		// getCurrentPath now reads window.location directly
		window.history.pushState({}, "", "/products");
	});

	it("mounts and provides baqk context", async () => {
		const router = createTestRouter("/products");
		await router.load();
		render(<RouterProvider router={router} />);

		await waitFor(() => {
			expect(screen.getByTestId("page").textContent).toBe("products");
		});
		expect(baqkRef.previousEntry).toBeNull();
	});

	it("useTrailClick records trail entry", async () => {
		const router = createTestRouter("/products");
		await router.load();
		render(<RouterProvider router={router} />);

		await waitFor(() => {
			expect(screen.getByTestId("page")).toBeTruthy();
		});

		act(() => {
			trailClickRef(makeClickEvent());
		});

		// Navigate to trigger a re-render so previousEntry is recomputed
		await act(async () => {
			router.navigate({ to: "/products/42" });
			await router.invalidate();
		});

		await waitFor(() => {
			expect(baqkRef.previousEntry).not.toBeNull();
		});
		expect(baqkRef.previousEntry?.label).toBe("Products");
	});

	it("goBack pops trail and navigates", async () => {
		const router = createTestRouter("/products");
		await router.load();
		render(<RouterProvider router={router} />);

		await waitFor(() => {
			expect(screen.getByTestId("page")).toBeTruthy();
		});

		act(() => {
			trailClickRef(makeClickEvent());
		});

		// Simulate navigation to a detail page
		window.history.pushState({}, "", "/products/42");

		await act(async () => {
			baqkRef.goBack();
			await router.invalidate();
		});

		expect(baqkRef.previousEntry).toBeNull();
		expect(navigateSpy).toHaveBeenLastCalledWith({
			to: "/products",
			replace: true,
		});
	});
});
