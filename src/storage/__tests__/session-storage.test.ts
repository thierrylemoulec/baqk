import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSessionStorage } from "../session-storage.js";

describe("createSessionStorage", () => {
	beforeEach(() => {
		sessionStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		sessionStorage.clear();
	});

	it("clears only baqk keys before retrying a quota failure", () => {
		const storage = createSessionStorage();
		const originalSetItem = Storage.prototype.setItem;
		let firstAttempt = true;

		sessionStorage.setItem("bcb:test:state:old", '{"page":1}');
		sessionStorage.setItem("bcb:test:trail", "[]");
		sessionStorage.setItem("app:token", "keep");

		vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (
			key: string,
			value: string,
		) {
			if (key === "bcb:test:state:new" && firstAttempt) {
				firstAttempt = false;
				throw new DOMException("Quota exceeded", "QuotaExceededError");
			}

			if (key === "bcb:test:state:new") {
				expect(sessionStorage.getItem("bcb:test:state:old")).toBeNull();
				expect(sessionStorage.getItem("bcb:test:trail")).toBeNull();
				expect(sessionStorage.getItem("app:token")).toBe("keep");
			}

			return originalSetItem.call(this, key, value);
		});

		storage.setItem("bcb:test:state:new", '{"page":2}');

		expect(sessionStorage.getItem("bcb:test:state:new")).toBe('{"page":2}');
		expect(sessionStorage.getItem("app:token")).toBe("keep");
	});

	it("clear removes only baqk keys", () => {
		const storage = createSessionStorage();

		sessionStorage.setItem("bcb:test:state:old", '{"page":1}');
		sessionStorage.setItem("app:token", "keep");

		storage.clear();

		expect(sessionStorage.getItem("bcb:test:state:old")).toBeNull();
		expect(sessionStorage.getItem("app:token")).toBe("keep");
	});
});
