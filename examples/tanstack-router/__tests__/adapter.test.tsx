import { act, render, screen, waitFor } from "@testing-library/react";
import {
	Outlet,
	RouterProvider,
	createMemoryHistory,
	createRootRoute,
	createRoute,
	createRouter,
} from "@tanstack/react-router";
import { useBaqk } from "baqk";
import { BaqkAdapter } from "baqk/adapters/tanstack";
import React from "react";
import { beforeEach, describe, expect, it } from "vitest";

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
	});
});
