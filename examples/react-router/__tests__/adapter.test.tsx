import { act, render, screen } from "@testing-library/react";
import { useBaqk } from "baqk";
import { BaqkAdapter } from "baqk/adapters/react-router";
import React from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it } from "vitest";

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
