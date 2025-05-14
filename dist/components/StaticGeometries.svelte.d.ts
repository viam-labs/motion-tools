import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type StaticGeometriesProps = typeof __propDef.props;
export type StaticGeometriesEvents = typeof __propDef.events;
export type StaticGeometriesSlots = typeof __propDef.slots;
export default class StaticGeometries extends SvelteComponentTyped<StaticGeometriesProps, StaticGeometriesEvents, StaticGeometriesSlots> {
}
export {};
