import { useCursor } from '@threlte/extras';
import { useFocused, useSelected } from './useSelection.svelte';
import { useVisibility } from './useVisibility.svelte';
export const useObjectEvents = (uuid) => {
    const { onPointerEnter, onPointerLeave } = useCursor();
    const selected = useSelected();
    const focused = useFocused();
    const visibility = useVisibility();
    return {
        get visible() {
            return visibility.get(uuid());
        },
        onpointerenter: (event) => {
            event.stopPropagation();
            onPointerEnter();
        },
        onpointerleave: (event) => {
            event.stopPropagation();
            onPointerLeave();
        },
        ondblclick: (event) => {
            event.stopPropagation();
            focused.set(uuid());
        },
        onclick: (event) => {
            event.stopPropagation();
            selected.set(uuid());
        },
        onpointermissed: () => selected.set(),
    };
};
