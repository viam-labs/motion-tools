import { PersistedState } from 'runed';
import { setContext } from 'svelte';
const key = Symbol('draggables-context');
export const provideDraggables = () => { };
export const useDraggable = (name) => {
    const down = { x: 0, y: 0 };
    const onDragMove = () => { };
    const onDragStart = (event) => {
        down.x = event.clientX;
        down.y = event.clientY;
    };
    const onDragEnd = (event) => {
        translate.current.x += event.clientX - down.x;
        translate.current.y += event.clientY - down.y;
    };
    const translate = new PersistedState(`${name} draggable`, { x: 0, y: 0 });
    setContext(key, {
        onDragStart,
        onDragMove,
        onDragEnd,
        get current() {
            return translate.current;
        },
    });
};
