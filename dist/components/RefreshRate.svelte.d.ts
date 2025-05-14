import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type RefreshRateProps = typeof __propDef.props;
export type RefreshRateEvents = typeof __propDef.events;
export type RefreshRateSlots = typeof __propDef.slots;
export default class RefreshRate extends SvelteComponentTyped<RefreshRateProps, RefreshRateEvents, RefreshRateSlots> {
}
export {};
