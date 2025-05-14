import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type TreeContainerProps = typeof __propDef.props;
export type TreeContainerEvents = typeof __propDef.events;
export type TreeContainerSlots = typeof __propDef.slots;
export default class TreeContainer extends SvelteComponentTyped<TreeContainerProps, TreeContainerEvents, TreeContainerSlots> {
}
export {};
