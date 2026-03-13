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
const { useBaqk } = await import("baqk");
const { BaqkAdapter } = await import("baqk/adapters/tanstack");

let baqkRef: ReturnType<typeof useBaqk>;

function BaqkCapture() {
	baqkRef = useBaqk({ fallbackPath: "/products" });
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
		expect(baqkRef.hasTrail).toBe(false);
	});

	it("navigateWithTrail records trail entry", async () => {
		const router = createTestRouter("/products");
		await router.load();
		render(<RouterProvider router={router} />);

		await waitFor(() => {
			expect(screen.getByTestId("page")).toBeTruthy();
		});

		await act(async () => {
			baqkRef.navigateWithTrail("/products/42", { label: "Products" });
			await router.invalidate();
		});

		expect(baqkRef.hasTrail).toBe(true);
		expect(baqkRef.previousEntry?.label).toBe("Products");
	});

	it("goBack pops trail and navigates", async () => {
		const router = createTestRouter("/products");
		await router.load();
		render(<RouterProvider router={router} />);

		await waitFor(() => {
			expect(screen.getByTestId("page")).toBeTruthy();
		});

		await act(async () => {
			baqkRef.navigateWithTrail("/products/42");
			await router.invalidate();
		});

		await act(async () => {
			baqkRef.goBack();
			await router.invalidate();
		});

		expect(baqkRef.hasTrail).toBe(false);
		expect(navigateSpy).toHaveBeenLastCalledWith({
			to: "/products",
			replace: true,
		});
	});
});
