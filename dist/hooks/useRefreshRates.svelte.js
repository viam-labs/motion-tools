import { get, set } from 'idb-keyval';
import { getContext, setContext } from 'svelte';
import { SvelteMap } from 'svelte/reactivity';
const key = Symbol('polling-rate-context');
const idbKey = 'polling-rate';
export const provideRefreshRates = () => {
    const map = new SvelteMap();
    get(idbKey).then((entries) => {
        if (entries) {
            for (const [key, value] of entries) {
                map.set(key, value);
            }
        }
    });
    $effect(() => {
        set(idbKey, [...map.entries()]);
    });
    setContext(key, map);
    return map;
};
export const useRefreshRates = () => {
    return getContext(key);
};
