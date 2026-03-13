# baqk

Smart back navigation with state preservation for React apps.

[![npm](https://img.shields.io/npm/v/@thrylm/baqk)](https://www.npmjs.com/package/@thrylm/baqk)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/@thrylm/baqk)](https://bundlephobia.com/package/@thrylm/baqk)
[![license](https://img.shields.io/npm/l/@thrylm/baqk)](https://github.com/thierrylemoulec/baqk/blob/main/LICENSE)

## The Problem

User filters a list, clicks into a detail page, hits back — filters are gone. `history.back()` can't carry state, and `sessionStorage` alone doesn't know *which* page to restore. **baqk** solves this with a hybrid navId + sessionStorage approach that preserves state, scroll position, and navigation context across any number of levels.

## Install

```bash
npm install @thrylm/baqk
```

> ESM-only. Requires `react >= 18`.

> ~3.5 kB gzipped (core + hook). Each adapter adds ~500 B.

## Quick Start

```tsx
// app.tsx — wrap your app with the adapter
import { BaqkAdapter } from "@thrylm/baqk/adapters/react-router";

function App() {
  return (
    <BaqkAdapter>
      <Routes>{/* ... */}</Routes>
    </BaqkAdapter>
  );
}
```

```tsx
// products.tsx — listing page
import { useBaqk } from "@thrylm/baqk";

function ProductList() {
  const { restoredState, saveState, navigateWithTrail } =
    useBaqk<{ filters: Filters }>();

  // Restore filters synchronously — no useEffect
  const [filters, setFilters] = useState(
    () => restoredState?.filters ?? defaultFilters,
  );

  function openProduct(id: string) {
    saveState({ filters });
    navigateWithTrail(`/products/${id}`, { label: "Products" });
  }

  return <FilteredList filters={filters} onSelect={openProduct} />;
}
```

```tsx
// product-detail.tsx — detail page
import { useBaqk } from "@thrylm/baqk";

function ProductDetail() {
  const { goBack, hasTrail, previousEntry } = useBaqk({
    fallbackPath: "/products",
  });

  return (
    <div>
      <button onClick={() => goBack()}>
        {hasTrail ? `← ${previousEntry?.label}` : "← Products"}
      </button>
      {/* ... */}
    </div>
  );
}
```

## Adapters

### React Router

```tsx
import { BaqkAdapter } from "@thrylm/baqk/adapters/react-router";

<BaqkAdapter>
  <RouterProvider router={router} />
</BaqkAdapter>
```

### Next.js App Router

```tsx
import { BaqkAdapter } from "@thrylm/baqk/adapters/next";

<BaqkAdapter>
  {children}
</BaqkAdapter>
```

### TanStack Router

```tsx
import { BaqkAdapter } from "@thrylm/baqk/adapters/tanstack";

<BaqkAdapter>
  <RouterProvider router={router} />
</BaqkAdapter>
```

### Generic (any router)

```tsx
import { BaqkAdapter } from "@thrylm/baqk";

<BaqkAdapter
  navigate={(path, options) =>
    options?.replace ? myRouter.replace(path) : myRouter.push(path)
  }
  getCurrentPath={() => window.location.pathname + window.location.search}
>
  {children}
</BaqkAdapter>
```

All router-specific adapters accept optional `sessionKey` and `storage` props. The generic adapter additionally requires `navigate` and `getCurrentPath`.

## API Reference

### `useBaqk<T>(options?)`

#### Options (`BaqkOptions`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fallbackPath` | `string` | `undefined` | Path to navigate to when `goBack()` is called with no trail |
| `autoSaveScroll` | `boolean` | `true` | Automatically save/restore scroll position |

#### Return value (`BaqkResult<T>`)

| Property | Type | Description |
|----------|------|-------------|
| `restoredState` | `T \| null` | Synchronously available saved state (lazy ref pattern) |
| `wasRestored` | `boolean` | Whether state was restored for this page |
| `saveState` | `(state: T) => void` | Save state for the current page |
| `restoreState` | `() => T \| null` | Manually restore state (usually not needed — use `restoredState`) |
| `navigateWithTrail` | `(path, opts?) => void` | Navigate to `path`, pushing the current page onto the trail |
| `goBack` | `(fallbackPath?) => void` | Pop the trail and navigate back, or use fallback |
| `hasTrail` | `boolean` | Whether there are entries in the trail |
| `previousEntry` | `TrailEntry \| null` | The most recent trail entry (the page you'd go back to) |
| `trail` | `readonly TrailEntry[]` | The full trail stack |
| `clearAll` | `() => void` | Clear the trail and all associated state |

### `TrailEntry`

```ts
interface TrailEntry {
  path: string;
  navId: string;
  label?: string;
  timestamp: number;
}
```

### `navigateWithTrail` options

| Option | Type | Description |
|--------|------|-------------|
| `label` | `string` | Label for the breadcrumb (e.g. "Products") |
| `state` | `T` | State to save for the **current** page before navigating |

### `BaqkAdapterProps` (router-specific adapters)

| Prop | Type | Description |
|------|------|-------------|
| `children` | `ReactNode` | — |
| `sessionKey` | `string?` | Namespace for storage isolation (e.g. user ID) |
| `storage` | `StorageAdapter?` | Custom storage backend (defaults to sessionStorage) |

### `GenericBaqkAdapterProps` (generic adapter)

Extends `BaqkAdapterProps` with:

| Prop | Type | Description |
|------|------|-------------|
| `navigate` | `(path: string, options?: { replace?: boolean }) => void` | Navigation function |
| `getCurrentPath` | `() => string` | Returns current path + search params |

## How It Works

- Each page visit gets a unique **navId** stamped into `history.state`
- When you call `navigateWithTrail`, the current page's path + navId are pushed onto a **trail stack** in sessionStorage
- State and scroll position are keyed by `sessionKey:navId`, so they survive navigations
- `goBack` pops the trail, navigates to the previous path, and re-stamps the navId — triggering automatic state + scroll restoration
- `restoredState` is computed synchronously via a lazy ref (no useEffect, no flash of default state)

## Advanced

### Session key

Use `sessionKey` to isolate trails per user or session:

```tsx
<BaqkAdapter sessionKey={user.id}>
```

### Custom storage

```tsx
import { createMemoryStorage } from "@thrylm/baqk";

<BaqkAdapter storage={createMemoryStorage()}>
```

### `createBaqkAdapter` factory

Build an adapter for any router:

```tsx
import { createBaqkAdapter } from "@thrylm/baqk";

const MyBaqkAdapter = createBaqkAdapter(() => {
  // Return a RouterAdapter: { getCurrentPath, navigate, getHistoryState, replaceHistoryState }
  return useMyRouter();
});
```

### Limits

- Trail stack: max **50** entries (oldest evicted with their state)
- State size: max **100 KB** per entry (oversized state is silently dropped with a console warning)

## License

MIT
