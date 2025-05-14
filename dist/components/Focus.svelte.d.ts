import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type FocusProps = typeof __propDef.props;
export type FocusEvents = typeof __propDef.events;
export type FocusSlots = typeof __propDef.slots;
export default class Focus extends SvelteComponentTyped<FocusProps, FocusEvents, FocusSlots> {
}
export {};
