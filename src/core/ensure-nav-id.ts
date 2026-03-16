import { generateNavId } from "../utils/id.js";
import { HISTORY_STATE_KEY } from "./constants.js";

export function ensureNavId(router: {
	getHistoryState(): Record<string, unknown> | null;
	replaceHistoryState(patch: Record<string, unknown>): void;
}): string {
	const state = router.getHistoryState();
	if (state && typeof state[HISTORY_STATE_KEY] === "string") {
		return state[HISTORY_STATE_KEY];
	}
	const navId = generateNavId();
	router.replaceHistoryState({ [HISTORY_STATE_KEY]: navId });
	return navId;
}
