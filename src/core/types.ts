export interface TrailEntry {
	path: string;
	navId: string;
	label?: string;
	timestamp: number;
}

export interface RouterAdapter {
	getCurrentPath(): string;
	navigate(path: string, options?: { replace?: boolean }): void;
	getHistoryState(): Record<string, unknown> | null;
	replaceHistoryState(patch: Record<string, unknown>): void;
}

export interface StorageAdapter {
	getItem(key: string): string | null;
	setItem(key: string, value: string): void;
	removeItem(key: string): void;
	clear(): void;
}

export interface BaqkOptions {
	fallbackPath?: string;
	autoSaveScroll?: boolean;
}

export interface BaqkResult<
	T extends Record<string, unknown> = Record<string, unknown>,
> {
	goBack: (fallbackPath?: string) => void;
	previousEntry: TrailEntry | null;
	saveState: (state: T) => void;
	restoredState: T | null;
	wasRestored: boolean;
	clear: () => void;
}

export interface BaqkContextValue {
	router: RouterAdapter;
	storage: StorageAdapter;
	sessionKey: string;
}
