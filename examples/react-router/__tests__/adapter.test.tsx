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

const { useBaqk, useTrailClick } = await import("@thrylm/baqk");
const { BaqkAdapter } = await import("@thrylm/baqk/adapters/react-router");
const { MemoryRouter, Route, Routes, useLocation } = await import(
	"react-router"
);

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
		// Reset window.location so getCurrentPath (which reads window.location)
		// stays in sync with the MemoryRouter's initial path
		window.history.pushState({}, "", "/");
	});

	it("useTrailClick records trail entry, goBack pops it", () => {
		window.history.pushState({}, "", "/products");
		render(<TestApp initialPath="/products" />);

		expect(screen.getByTestId("path").textContent).toBe("/products");

		// Push trail entry via useTrailClick
		act(() => {
			trailClickRef(makeClickEvent());
		});

		// Simulate navigation to a detail page
		window.history.pushState({}, "", "/products/42");

		// Trail was recorded — goBack should pop it and navigate back
		act(() => {
			baqkRef.goBack();
		});

		expect(navigateSpy).toHaveBeenLastCalledWith("/products", {
			replace: true,
		});
	});

	it("goBack navigates to previous route", () => {
		window.history.pushState({}, "", "/products");
		render(<TestApp initialPath="/products" />);

		// Push trail entry via useTrailClick
		act(() => {
			trailClickRef(makeClickEvent());
		});

		// Simulate navigation to a detail page
		window.history.pushState({}, "", "/products/42");

		// The trail entry is now recorded. Go back should pop it.
		act(() => {
			baqkRef.goBack();
		});

		expect(navigateSpy).toHaveBeenLastCalledWith("/products", {
			replace: true,
		});
	});

	it("goBack uses fallback when trail is empty", () => {
		window.history.pushState({}, "", "/products/42");
		render(<TestApp initialPath="/products/42" />);

		expect(baqkRef.previousEntry).toBeNull();

		act(() => {
			baqkRef.goBack();
		});

		expect(screen.getByTestId("path").textContent).toBe("/products");
	});
});
