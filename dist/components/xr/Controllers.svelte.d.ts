import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type ControllersProps = typeof __propDef.props;
export type ControllersEvents = typeof __propDef.events;
export type ControllersSlots = typeof __propDef.slots;
export default class Controllers extends SvelteComponentTyped<ControllersProps, ControllersEvents, ControllersSlots> {
}
export {};
