import { getContext, setContext } from 'svelte';
const key = Symbol('tranform-controls-context');
export const provideTransformControls = () => {
    let active = $state(false);
    setContext(key, {
        get active() {
            return active;
        },
        setActive(value) {
            active = value;
        },
    });
};
export const useTransformControls = () => {
    return getContext(key);
};
