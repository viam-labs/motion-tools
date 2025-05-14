import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type FramesProps = typeof __propDef.props;
export type FramesEvents = typeof __propDef.events;
export type FramesSlots = typeof __propDef.slots;
export default class Frames extends SvelteComponentTyped<FramesProps, FramesEvents, FramesSlots> {
}
export {};
