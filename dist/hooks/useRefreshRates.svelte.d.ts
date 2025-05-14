import { SvelteMap } from 'svelte/reactivity';
type Context = SvelteMap<string, number>;
export declare const provideRefreshRates: () => SvelteMap<string, number>;
export declare const useRefreshRates: () => Context;
export {};
