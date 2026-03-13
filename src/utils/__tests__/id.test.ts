import { describe, expect, it } from "vitest";
import { generateNavId } from "../id.js";

describe("generateNavId", () => {
	it("returns an 8-character string", () => {
		const id = generateNavId();
		expect(id).toHaveLength(8);
	});

	it("only contains alphanumeric lowercase chars", () => {
		const id = generateNavId();
		expect(id).toMatch(/^[a-z0-9]{8}$/);
	});

	it("generates unique IDs", () => {
		const ids = new Set(Array.from({ length: 100 }, () => generateNavId()));
		expect(ids.size).toBe(100);
	});
});
