import { SvelteSet } from 'svelte/reactivity';
type Context = SvelteSet<string>;
export declare const provideTreeExpandedContext: () => void;
export declare const useExpanded: () => Context;
export {};
