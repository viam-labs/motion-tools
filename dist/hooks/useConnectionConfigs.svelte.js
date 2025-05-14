import { get, set } from 'idb-keyval';
import { PersistedState } from 'runed';
import { getContext, setContext } from 'svelte';
const key = Symbol('connection-config-context');
const activeConfig = new PersistedState('active-connection-config', 0);
export const provideConnectionConfigs = () => {
    let connectionConfigs = $state([]);
    get('connection-configs').then((response) => {
        connectionConfigs = response ?? [];
    });
    $effect(() => {
        set('connection-configs', $state.snapshot(connectionConfigs));
    });
    setContext(key, {
        get current() {
            return connectionConfigs;
        },
    });
};
export const useConnectionConfigs = () => {
    return getContext(key);
};
export const useActiveConnectionConfig = () => {
    const connectionConfigs = useConnectionConfigs();
    return {
        get current() {
            if (activeConfig.current === -1) {
                return undefined;
            }
            return connectionConfigs.current.at(activeConfig.current);
        },
        set(index) {
            activeConfig.current = index ?? -1;
        },
    };
};
