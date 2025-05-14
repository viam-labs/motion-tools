import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type HandsProps = typeof __propDef.props;
export type HandsEvents = typeof __propDef.events;
export type HandsSlots = typeof __propDef.slots;
export default class Hands extends SvelteComponentTyped<HandsProps, HandsEvents, HandsSlots> {
}
export {};
