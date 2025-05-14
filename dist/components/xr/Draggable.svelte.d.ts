import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type DraggableProps = typeof __propDef.props;
export type DraggableEvents = typeof __propDef.events;
export type DraggableSlots = typeof __propDef.slots;
export default class Draggable extends SvelteComponentTyped<DraggableProps, DraggableEvents, DraggableSlots> {
}
export {};
