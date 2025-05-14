import { useThrelte } from '@threlte/core';
import { getContext, setContext } from 'svelte';
import { useObjects } from './useObjects.svelte';
const hoverKey = Symbol('hover-context');
const selectionKey = Symbol('selection-context');
const focusKey = Symbol('focus-context');
const selectedObjectKey = Symbol('selected-frame-context');
const focusedObjectKey = Symbol('focused-frame-context');
export const provideSelection = () => {
    let selected = $state();
    let focused = $state();
    let hovered = $state();
    const selectionContext = {
        get current() {
            return selected;
        },
        set(value) {
            selected = value;
        },
    };
    setContext(selectionKey, selectionContext);
    const focusContext = {
        get current() {
            return focused;
        },
        set(value) {
            focused = value;
        },
    };
    setContext(focusKey, focusContext);
    const hoverContext = {
        get current() {
            return hovered;
        },
        set(value) {
            hovered = value;
        },
    };
    setContext(hoverKey, hoverContext);
    const objects = useObjects();
    const selectedObject = $derived(objects.current.find((object) => object.uuid === selected));
    const selectedObjectContext = {
        get current() {
            return selectedObject;
        },
    };
    setContext(selectedObjectKey, selectedObjectContext);
    const focusedFrame = $derived(objects.current.find((object) => object.uuid === focused));
    const focusedFrameContext = {
        get current() {
            return focusedFrame;
        },
    };
    setContext(focusedObjectKey, focusedFrameContext);
    return {
        selection: selectionContext,
        focus: focusContext,
        hover: hoverContext,
    };
};
export const useSelected = () => {
    return getContext(selectionKey);
};
export const useFocused = () => {
    return getContext(focusKey);
};
export const useFocusedObject = () => {
    return getContext(focusedObjectKey);
};
export const useSelectedObject = () => {
    return getContext(selectedObjectKey);
};
export const useFocusedObject3d = () => {
    const focusedObject = useFocusedObject();
    const { scene } = useThrelte();
    const object = $derived(focusedObject.current ? scene.getObjectByName(focusedObject.current.name)?.clone() : undefined);
    return {
        get current() {
            return object;
        },
    };
};
export const useSelectedObject3d = () => {
    const selectedObject = useSelectedObject();
    const { scene } = useThrelte();
    const object = $derived(selectedObject.current ? scene.getObjectByName(selectedObject.current.name) : undefined);
    return {
        get current() {
            return object;
        },
    };
};
