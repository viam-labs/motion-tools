import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type SelectedProps = typeof __propDef.props;
export type SelectedEvents = typeof __propDef.events;
export type SelectedSlots = typeof __propDef.slots;
export default class Selected extends SvelteComponentTyped<SelectedProps, SelectedEvents, SelectedSlots> {
}
export {};
