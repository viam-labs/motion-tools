import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type WorldObjectProps = typeof __propDef.props;
export type WorldObjectEvents = typeof __propDef.events;
export type WorldObjectSlots = typeof __propDef.slots;
export default class WorldObject extends SvelteComponentTyped<WorldObjectProps, WorldObjectEvents, WorldObjectSlots> {
}
export {};
