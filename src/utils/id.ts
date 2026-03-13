import { NAV_ID_LENGTH } from "../core/constants.js";

const CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

export function generateNavId(): string {
	if (typeof crypto !== "undefined" && crypto.getRandomValues) {
		const bytes = new Uint8Array(NAV_ID_LENGTH);
		crypto.getRandomValues(bytes);
		let result = "";
		for (let i = 0; i < NAV_ID_LENGTH; i++) {
			result += CHARS[bytes[i] % CHARS.length];
		}
		return result;
	}
	// Fallback for environments without crypto
	let result = "";
	for (let i = 0; i < NAV_ID_LENGTH; i++) {
		result += CHARS[Math.floor(Math.random() * CHARS.length)];
	}
	return result;
}
