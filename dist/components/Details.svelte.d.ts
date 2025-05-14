import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type DetailsProps = typeof __propDef.props;
export type DetailsEvents = typeof __propDef.events;
export type DetailsSlots = typeof __propDef.slots;
export default class Details extends SvelteComponentTyped<DetailsProps, DetailsEvents, DetailsSlots> {
}
export {};
