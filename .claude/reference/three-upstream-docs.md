# Upstream Documentation

Three.js, Threlte, and React Three Fiber each publish their documentation in `llms.txt` form.
Fetch the relevant one instead of writing an API call from memory. Three.js has a large body of
outdated tutorial material on the web, so a signature recalled rather than checked is often one
that was removed several major versions ago.

None of the three ships an official MCP server. These URLs are the whole integration.

Every `llms-full.txt` size below was measured on 2026-08-06. They only grow, so treat each one
as a floor.

## Three.js

- Guidance: https://threejs.org/docs/llms.txt
- Full API: https://threejs.org/docs/llms-full.txt

The short file is not an index. It is a set of instructions for generating Three.js code, and it
opens by rejecting the `<script src="...three.min.js">` CDN pattern in favor of import maps. Read
it first. The full file is the complete API reference including TSL, at roughly 130 KB.

`https://threejs.org/llms.txt` also resolves, but it only points at the two URLs above.

## Threlte

- Index: https://threlte.xyz/llms.txt
- Full docs: https://threlte.xyz/llms-full.txt

The index is a link list over the Threlte 8 docs, carrying absolute URLs you can fetch directly.
The full file is roughly 500 KB, which does not belong in a context window whole. Read the index,
pick the page, fetch that page.

Threlte 7 is archived separately at https://v7.threlte.xyz.

Threlte 8, the Svelte 5 and runes release, is the largest migration in Threlte's history. It
replaces slot props with snippets, redesigns the plugin system, and narrows automatic
disposal to directly referenced objects.

## React Three Fiber

- Index: https://r3f.docs.pmnd.rs/llms.txt
- Full docs: https://r3f.docs.pmnd.rs/llms-full.txt

The index links are **relative**, so `/api/canvas` means `https://r3f.docs.pmnd.rs/api/canvas`.
The full file is roughly 170 KB.

## Svelte, in a Threlte repo

Svelte does ship a first-party MCP server, documented at https://svelte.dev/docs/ai/mcp. It
serves Svelte and SvelteKit documentation and statically analyzes generated Svelte code. It
covers the Svelte half of a Threlte component, not the Three.js half.

## Upgrading

Treat the Three.js migration guide as required reading on every upgrade, since releases
arrive frequently and routinely contain breaking changes. Budget the work as routine,
frequent maintenance rather than an occasional project. Skipping many revisions and
upgrading all at once is materially harder than making small upgrades along the way.

In a Threlte repo, upgrade Threlte, three, its type definitions, and Svelte together, and
read all four changelogs. The packages are version-coupled, and a mismatch, such as the
Threlte extras runes-mode incompatibility during the Svelte 5 transition, is a real failure
mode.
