import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type TreeProps = typeof __propDef.props;
export type TreeEvents = typeof __propDef.events;
export type TreeSlots = typeof __propDef.slots;
export default class Tree extends SvelteComponentTyped<TreeProps, TreeEvents, TreeSlots> {
}
export {};
