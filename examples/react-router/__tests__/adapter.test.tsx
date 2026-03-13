import { act, render, screen } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const navigateSpy = vi.fn();

vi.mock("react-router", async () => {
	const actual =
		await vi.importActual<typeof import("react-router")>("react-router");
	return {
		...actual,
		useNavigate: () => {
			const navigate = actual.useNavigate();
			return (to: string, options?: { replace?: boolean }) => {
				navigateSpy(to, options);
				return navigate(to, options);
			};
		},
	};
});

const { useBaqk } = await import("baqk");
const { BaqkAdapter } = await import("baqk/adapters/react-router");
const { MemoryRouter, Route, Routes, useLocation } = await import(
	"react-router"
);

let baqkRef: ReturnType<typeof useBaqk>;

function BaqkCapture() {
	baqkRef = useBaqk({ fallbackPath: "/products" });
	return null;
}

function LocationDisplay() {
	const location = useLocation();
	return <div data-testid="path">{location.pathname + location.search}</div>;
}

function TestApp({ initialPath }: { initialPath: string }) {
	return (
		<MemoryRouter initialEntries={[initialPath]}>
			<BaqkAdapter>
				<BaqkCapture />
				<LocationDisplay />
				<Routes>
					<Route path="*" element={null} />
				</Routes>
			</BaqkAdapter>
		</MemoryRouter>
	);
}

describe("React Router adapter", () => {
	beforeEach(() => {
		navigateSpy.mockClear();
	});

	it("navigateWithTrail changes route and records trail", () => {
		render(<TestApp initialPath="/products" />);

		expect(screen.getByTestId("path").textContent).toBe("/products");

		act(() => {
			baqkRef.navigateWithTrail("/products/42", { label: "Products" });
		});

		expect(screen.getByTestId("path").textContent).toBe("/products/42");
		expect(baqkRef.hasTrail).toBe(true);
		expect(baqkRef.previousEntry?.label).toBe("Products");
	});

	it("goBack navigates to previous route", () => {
		render(<TestApp initialPath="/products" />);

		act(() => {
			baqkRef.navigateWithTrail("/products/42");
		});

		act(() => {
			baqkRef.goBack();
		});

		expect(screen.getByTestId("path").textContent).toBe("/products");
		expect(baqkRef.hasTrail).toBe(false);
		expect(navigateSpy).toHaveBeenLastCalledWith("/products", {
			replace: true,
		});
	});

	it("goBack uses fallback when trail is empty", () => {
		render(<TestApp initialPath="/products/42" />);

		expect(baqkRef.hasTrail).toBe(false);

		act(() => {
			baqkRef.goBack();
		});

		expect(screen.getByTestId("path").textContent).toBe("/products");
	});
});
