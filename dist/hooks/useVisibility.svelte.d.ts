import { SvelteMap } from 'svelte/reactivity';
type Context = SvelteMap<string, boolean>;
export declare const provideVisibility: () => void;
export declare const useVisibility: () => Context;
export {};
