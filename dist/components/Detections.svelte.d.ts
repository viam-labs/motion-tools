import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type DetectionsProps = typeof __propDef.props;
export type DetectionsEvents = typeof __propDef.events;
export type DetectionsSlots = typeof __propDef.slots;
export default class Detections extends SvelteComponentTyped<DetectionsProps, DetectionsEvents, DetectionsSlots> {
}
export {};
