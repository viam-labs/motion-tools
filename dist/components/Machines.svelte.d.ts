import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type MachinesProps = typeof __propDef.props;
export type MachinesEvents = typeof __propDef.events;
export type MachinesSlots = typeof __propDef.slots;
export default class Machines extends SvelteComponentTyped<MachinesProps, MachinesEvents, MachinesSlots> {
}
export {};
