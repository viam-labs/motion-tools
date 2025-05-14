/** @typedef {typeof __propDef.props}  ConnectionProps */
/** @typedef {typeof __propDef.events}  ConnectionEvents */
/** @typedef {typeof __propDef.slots}  ConnectionSlots */
export default class Connection extends SvelteComponentTyped<{
    [x: string]: never;
}, {
    [evt: string]: CustomEvent<any>;
}, {}> {
}
export type ConnectionProps = typeof __propDef.props;
export type ConnectionEvents = typeof __propDef.events;
export type ConnectionSlots = typeof __propDef.slots;
import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        [x: string]: never;
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export {};
