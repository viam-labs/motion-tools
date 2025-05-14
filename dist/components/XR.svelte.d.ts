import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type XrProps = typeof __propDef.props;
export type XrEvents = typeof __propDef.events;
export type XrSlots = typeof __propDef.slots;
export default class Xr extends SvelteComponentTyped<XrProps, XrEvents, XrSlots> {
}
export {};
