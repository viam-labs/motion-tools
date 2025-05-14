import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type ShapesProps = typeof __propDef.props;
export type ShapesEvents = typeof __propDef.events;
export type ShapesSlots = typeof __propDef.slots;
export default class Shapes extends SvelteComponentTyped<ShapesProps, ShapesEvents, ShapesSlots> {
}
export {};
