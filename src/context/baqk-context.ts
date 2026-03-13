import { createContext, useContext } from "react";
import type { BaqkContextValue } from "../core/types.js";

export const BaqkContext = createContext<BaqkContextValue | null>(null);

export function useBaqkContext(): BaqkContextValue {
	const ctx = useContext(BaqkContext);
	if (!ctx) {
		throw new Error(
			"[baqk] useBaqk must be used within a <BaqkAdapter>. " +
				"Wrap your app with the appropriate adapter for your router.",
		);
	}
	return ctx;
}
