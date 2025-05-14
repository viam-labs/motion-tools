import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type HandColliderProps = typeof __propDef.props;
export type HandColliderEvents = typeof __propDef.events;
export type HandColliderSlots = typeof __propDef.slots;
export default class HandCollider extends SvelteComponentTyped<HandColliderProps, HandColliderEvents, HandColliderSlots> {
}
export {};
