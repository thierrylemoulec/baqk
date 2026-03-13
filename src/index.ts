// Main hook
export { useBaqk } from "./hooks/baqk.js";

// Adapter factory for custom routers
export { createBaqkAdapter } from "./context/create-adapter.js";
export type { BaqkAdapterProps } from "./context/create-adapter.js";

// Generic adapter (History API)
export { BaqkAdapter } from "./adapters/generic.js";

// Types
export type {
	BaqkContextValue,
	BaqkOptions,
	BaqkResult,
	RouterAdapter,
	StorageAdapter,
	TrailEntry,
} from "./core/types.js";

// Storage adapters
export { createMemoryStorage } from "./storage/memory-storage.js";
export { createSessionStorage } from "./storage/session-storage.js";
