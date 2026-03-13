import { MAX_STATE_SIZE_BYTES } from "../core/constants.js";

export function serialize(data: unknown): string | null {
	try {
		const json = JSON.stringify(data);
		if (new TextEncoder().encode(json).byteLength > MAX_STATE_SIZE_BYTES) {
			console.warn(
				`[baqk] State exceeds ${MAX_STATE_SIZE_BYTES} bytes limit, not saving.`,
			);
			return null;
		}
		return json;
	} catch {
		console.warn("[baqk] Failed to serialize state.");
		return null;
	}
}

export function deserialize<T>(json: string): T | null {
	try {
		return JSON.parse(json) as T;
	} catch {
		console.warn("[baqk] Failed to deserialize state.");
		return null;
	}
}
