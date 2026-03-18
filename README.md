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
import { useBaqk, useTrailClick } from "@thrylm/baqk";
import { Link } from "react-router-dom";

function ProductList() {
  const { restoredState, saveState } = useBaqk<{ filters: Filters }>();
  const trailClick = useTrailClick("Products");

  // Restore filters synchronously — no useEffect
  const [filters, setFilters] = useState(
    () => restoredState?.filters ?? defaultFilters,
  );

  // Save state whenever filters change
  useEffect(() => { saveState({ filters }); }, [filters]);

  return products.map((p) => (
    <Link to={`/products/${p.id}`} onClick={trailClick}>
      {p.name}
    </Link>
  ));
}
```

```tsx
// product-detail.tsx — detail page
import { useBaqk } from "@thrylm/baqk";

function ProductDetail() {
  const { goBack, previousEntry } = useBaqk({
    fallbackPath: "/products",
  });

  return (
    <div>
      <button onClick={() => goBack()}>
        {previousEntry ? `← ${previousEntry.label}` : "← Products"}
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

### `useTrailClick(label?)`

Returns an `onClick` handler that pushes a trail entry without navigating. Attach it to same-tab internal `<Link>`/anchor navigations — the link handles navigation natively, no `preventDefault` needed.

#### Direct mode (recommended)

Attach the handler directly to each `<Link>`. This follows React's best practice of keeping event handling explicit and colocated with the element it applies to — easier to trace, easier to debug.

```tsx
import { useTrailClick } from "@thrylm/baqk";

function ProductList() {
  const trailClick = useTrailClick("Products");

  return products.map((p) => (
    <Link to={`/products/${p.id}`} onClick={trailClick}>
      {p.name}
    </Link>
  ));
}
```

#### Delegated mode

You can also attach the handler to a container element. It uses event delegation to detect anchor clicks via bubbling. This is convenient when you have many links in a list, but it's less explicit and harder to follow in larger components.

```tsx
function ProductList() {
  const trailClick = useTrailClick("Products");

  return (
    <div onClick={trailClick}>
      {products.map((p) => (
        <Link key={p.id} to={`/products/${p.id}`}>
          {p.name}
        </Link>
      ))}
    </div>
  );
}
```

**Behavior:**
- Saves scroll position and pushes the current page onto the trail
- Skips on modifier keys (`meta`, `ctrl`, `shift`, `alt`), middle-click, or `defaultPrevented`
- Skips new-tab, download, external, and hash-only anchor clicks
- Captures path at click time via `getCurrentPath()` (reads `window.location`, compatible with nuqs/shallow updates)
- Does NOT call `preventDefault()` or navigate — the underlying link handles that
- Shares the same `navId` as `useBaqk()` (both use `ensureNavId` which is idempotent)

### `useBaqk<T>(options?)`

#### Options (`BaqkOptions`)

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `fallbackPath` | `string` | `undefined` | Path to navigate to when `goBack()` is called with no trail |
| `autoSaveScroll` | `boolean` | `true` | Automatically save/restore scroll position |

#### Return value (`BaqkResult<T>`)

| Property | Type | Description |
|----------|------|-------------|
| `goBack` | `(fallbackPath?) => void` | Pop the trail and navigate back, or use fallback |
| `previousEntry` | `TrailEntry \| null` | The most recent trail entry (the page you'd go back to) |
| `saveState` | `(state: T) => void` | Save state for the current page |
| `restoredState` | `T \| null` | Synchronously available saved state (lazy ref pattern) |
| `wasRestored` | `boolean` | Whether state was restored for this page |
| `clear` | `() => void` | Clear the trail and all associated state |

### `TrailEntry`

```ts
interface TrailEntry {
  path: string;
  navId: string;
  label?: string;
  timestamp: number;
}
```

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
- When `useTrailClick` fires, the current page's path + navId are pushed onto a **trail stack** in sessionStorage
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
