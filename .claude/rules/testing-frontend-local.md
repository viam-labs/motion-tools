---
paths:
  - 'src/**/*.spec.ts'
---

# Frontend Testing — motion-tools specifics

Repo-specific additions to the shared `testing-frontend.md`. That file covers Vitest, TypeScript unit/integration tests, mocking, component tests, and browser mode. This file preserves the repo's context-injection fixture convention.

## Injecting Svelte context

Pass a `context` map when a component depends on Svelte context:

```typescript
render(UserProfile, {
	context: new Map([[USER_CONTEXT_KEY, { name: 'Alice', role: 'admin' }]]),
})
```

For complex context trees — a Koota world provided via `provideWorld()`, or several service/config providers at once — create a `__fixtures__/ContextWrapper.svelte` that provides all required contexts and accepts the component under test as a snippet, rather than rebuilding the context map inline in every test.
