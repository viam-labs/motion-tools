import { get, set } from 'idb-keyval';
import { getContext, setContext } from 'svelte';
import { SvelteSet } from 'svelte/reactivity';
const key = Symbol('tree-item-expanded-context');
export const provideTreeExpandedContext = () => {
    const expanded = new SvelteSet();
    get('tree-item-expanded').then((stored) => {
        if (stored) {
            for (const value of stored) {
                expanded.add(value);
            }
        }
    });
    $effect(() => {
        set('tree-item-expanded', [...expanded]);
    });
    setContext(key, expanded);
};
export const useExpanded = () => {
    return getContext(key);
};
