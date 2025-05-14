import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type AxesHelperProps = typeof __propDef.props;
export type AxesHelperEvents = typeof __propDef.events;
export type AxesHelperSlots = typeof __propDef.slots;
export default class AxesHelper extends SvelteComponentTyped<AxesHelperProps, AxesHelperEvents, AxesHelperSlots> {
}
export {};
