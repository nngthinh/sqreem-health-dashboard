---
name: frontend-clean-code
description: Use when writing or reviewing code under apps/web/src/ — React components, hooks, JSX, TSX, Tailwind classes, state and effects, FE services and types. Covers imports, component structure, vertical grouping, naming, conditional rendering, error handling, and code reuse for the web app.
---

# Clean Code Rules — Frontend

## Overview

Frontend-specific clean code conventions for the web app. General language-agnostic
rules (KISS, DRY, YAGNI, readability, comments, async, TypeScript basics) apply here
too — this file adds the **frontend-specific** rules and the FE-side conventions for
naming, error handling, and code reuse (the backend has its own variants of those).

## When to Use

Apply when writing or reviewing code in the web app (`apps/web/src/`).

Not for: backend code (`apps/api/`), shared packages, or build config.

## Imports — FE specifics

- Use absolute imports from `src/` (configured via tsconfig paths), never relative `../../`
- Standard FE group order: external libs → components → constants/types → utils/hooks → assets

## Functions — React specifics

- If a `useCallback` has a switch with 5+ cases, extract each case into a named function.
- If a function inside a component doesn't reference hooks, state, or props, extract it as a module-level pure function. Pure functions don't need `useCallback`.
- Prefer named handlers over inline lambdas in JSX. Extract multi-statement handlers into a `handle`-prefixed function:

```typescript
// BAD — inline logic in JSX
<button onClick={() => { setItems(prev => prev.filter(i => i.id !== item.id)); toast('Deleted'); }}>

// GOOD — named handler
const handleDelete = (id: number) => {
  setItems((prev) => prev.filter((i) => i.id !== id));
  toast('Deleted');
};
<button onClick={() => handleDelete(item.id)}>
```

## Components

- One component per file. If a helper component is only used in one file, define it in the same file — below the main component, above `export default`.
- Keep components under 200 lines. If larger, split into sub-components.
- No inline styles unless the value is truly dynamic (computed at runtime, e.g., `style={{ width: `${percentage}%` }}`). Use Tailwind classes or styled-components instead.
- Use `React.memo` only when a component re-renders often with the same props and rendering is measurably expensive. Don't wrap every component — the overhead of shallow comparison can outweigh the savings for cheap renders.
- Use `React.lazy` and `Suspense` for route-level code splitting. Don't lazy-load small components — the overhead isn't worth it.

## Component Body — Vertical Grouping

The general **Group related code** rule applies hardest inside React component bodies,
where a wall of hooks, state, and guards is the most common readability killer.
Prettier won't add these blank lines — you must. Separate the body into labelled
groups with a blank line between each:

1. **Context/router hooks** — `useTranslation`, `useNavigate`, `useContext`, etc.
2. **State & refs**, sub-grouped by concern (one blank line between concerns, a short `// comment` per group when there are several). Don't dump 10 `useState` in one block — cluster the search state, the list state, the in-flight state separately.
3. **Effects** — one blank line between each `useEffect`; inside an effect, blank-line-separate the guard, the setup, the async body, and the cleanup `return`.
4. **Derived values & handlers**.
5. **Render helpers / early returns**.

```tsx
// BAD — hooks, state, and guards all stuck together
const { t } = useTranslation();
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);
const [query, setQuery] = useState('');
useEffect(() => { ... }, []);
if (loading) return <Spinner />;
if (error) return <Error />;
```

```tsx
// GOOD — blank lines group each logical unit
const { t } = useTranslation();

// list state
const [items, setItems] = useState([]);
const [loading, setLoading] = useState(true);

// search
const [query, setQuery] = useState('');

useEffect(() => { ... }, []);
```

- **Always blank-line between consecutive `if` guards / early returns** in a render helper or handler — chained `if (...) return` blocks with no spacing read as one tangled clump.
- Inside multi-step handlers, blank-line-separate the phases (optimistic update, API call, success/celebrate, error path).

## TypeScript — FE specifics

### Prefix frontend-local fields with `_`

When adding frontend-local/computed fields to a backend response type, prefix those fields with `_` to make them clearly non-API fields.

## State & Effects

- No unnecessary state. If a value can be derived from existing state/props, compute it inline (a plain `const`). Only reach for `useMemo` when the computation is expensive — inline is the default, `useMemo` is the exception.
- No unnecessary memoization. Only use `useMemo` when the computation is expensive or the value is passed to a `React.memo` child. Only use `useCallback` when the function is passed to a memoized child or appears in a dependency array. A plain `const` or inline function is fine otherwise.
- Every `useEffect` must have a clear purpose. If you can't name it in 5 words, it's doing too much — split it.
- Clean up subscriptions/timers in useEffect return.
- List all referenced values in `useCallback`/`useMemo`/`useEffect` deps. Don't suppress `react-hooks/exhaustive-deps` warnings without a comment explaining why.

### Functional state updates

Use `setCount((prev) => prev + 1)` not `setCount(count + 1)` — direct references can be stale in async/batched scenarios.

### Conditional rendering

- Use separate `{condition && <Component />}` blocks, not nested ternaries
- **Falsy-render gotcha**: `{count && <X />}` renders `"0"` when count is 0. Use `{!!count && <X />}` or `{Boolean(count) && <X />}`
- **Multiple branches**: for 3+ states, use a lookup object or extract a variable instead of chained ternaries:

```typescript
// GOOD — lookup object
const statusContent: Record<Status, ReactNode> = {
  loading: <Spinner />,
  error: <ErrorBanner />,
  empty: <EmptyState />,
  ready: <DataTable />,
};
return statusContent[status];
```

- **Key on conditional swaps**: use `key` to force remount when swapping between components that share the same position: `{isEditing ? <Editor key="editor" /> : <Viewer key="viewer" />}`

## Naming

- **Variables**: descriptive names (`marketSearchQuery`, not `q`; `isUserAuthenticated`, not `flag`)
- **Functions**: verb-noun pattern (`fetchMarketData`, `calculateSimilarity`, `isValidEmail`)

### Conventions

- Boolean variables/props: prefix with `is`, `has`, `should`, `can` (e.g., `isLoading`, `hasError`)
- Avoid abbreviations except well-known ones (e.g., `ctx` for context, `ref` for reference, `req`/`res` for request/response)
- Naming implies purity — a function prefixed with `get`, `is`, `has`, or `compute` should not modify state. Side effects belong in `handle`/`set`/`update`-prefixed functions.

### React-specific naming

- Event handlers inside components: prefix with `handle` (e.g., `handleClick`, `handleSort`)
- Callback props passed to components: prefix with `on` (e.g., `onChange`, `onSelect`, `onClose`). Use present tense consistently — this matches React's own APIs and third-party libraries.

## Tailwind

- Order classes consistently: layout (flex, grid, position) → sizing (w, h) → spacing (p, m, gap) → typography (text, font) → colors (bg, text, border) → effects (shadow, opacity, transition). If `prettier-plugin-tailwindcss` is configured, it handles this automatically.

## Error Handling

- Don't wrap internal/synchronous code in try/catch. Only catch at boundaries: API calls, user input parsing, third-party libs. A caught-and-swallowed error is worse than a crash — crashes are visible, silent failures aren't.
- When you do catch, do something meaningful: log with context, convert to a typed error, retry, or surface to the user via toast/banner. Never `catch (_) {}`.
- Every async operation (API call, data fetch) needs loading, error, and empty state handling — not just the happy path. A component that fetches data should always show something meaningful when the request is in-flight, fails, or returns nothing.

## React-Use & Lodash First

Before writing a custom hook or utility function, check whether `react-use` or `lodash` already provides it. These libraries are battle-tested, edge-case-handled, and well-documented — a custom implementation is almost always worse.

- **Hooks**: check `react-use` before writing custom (`useDebounce`, `useLocalStorage`, `usePrevious`, `useToggle`, `useClickAway`, etc.)
- **Utilities**: check `lodash-es` (tree-shakeable) before writing custom (`groupBy`, `debounce`, `cloneDeep`, `isEqual`, `pick`, `omit`, etc.)
- **Write custom only when**: the library doesn't cover the use case, or you need tight integration with project-specific state/context

## Code Reuse & Duplication

- **Reuse shared utilities, not old feature code.** Check `src/components/Common/`, `src/utils/`, and `src/hooks/` for genuinely shared code to reuse. But do NOT reuse types, services, or components from an old/replaced feature when the backend schema or data model has changed — write fresh code that matches the new contract. Forcing old code to fit a new schema creates adapter layers, type gymnastics, and code that's harder to read than starting clean.
- **When to reuse vs. rewrite:**
  - **Reuse**: shared UI components (`Common/`), generic utils, hooks that don't depend on a specific data shape
  - **Rewrite**: types, services, and feature components when the API contract or data model has changed. Even if the UI looks similar, if the underlying data is different, build from the new schema up — don't wrap or adapt old types.
- **Rule of Three**: if you write similar logic a third time, extract it.
  - Repeated UI patterns → shared component in `Common/`
  - Repeated data transforms → utility function in `utils/`
  - Repeated stateful logic → custom hook in `hooks/`
- **Extract, don't abstract prematurely.** Three similar lines are fine. A premature abstraction that handles 5 edge cases is worse than a little repetition.
- **When extracting, keep it simple.** A shared component with 10 boolean props to handle every variation is a sign you should have separate components instead.

## FE Quick-Reference Checklist

- No `index` as React `key` for dynamic lists — use a stable, unique identifier from the data (e.g., `item.id`). If no natural key exists, generate one at creation time, not at render time.
- No inline styles for static values — use Tailwind or styled-components
- No unnecessary `useState` — derive values inline
- No silent error swallowing (`catch (_) {}` or equivalent)
