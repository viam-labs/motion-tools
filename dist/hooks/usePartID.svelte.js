import { getContext, setContext } from 'svelte';
const key = Symbol('part-id-context');
export const createPartIDContext = (partId) => {
    const context = {
        get current() {
            return partId();
        },
    };
    setContext(key, context);
    return context;
};
export const usePartID = () => {
    return getContext(key);
};
