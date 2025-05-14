import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type PointDistanceProps = typeof __propDef.props;
export type PointDistanceEvents = typeof __propDef.events;
export type PointDistanceSlots = typeof __propDef.slots;
export default class PointDistance extends SvelteComponentTyped<PointDistanceProps, PointDistanceEvents, PointDistanceSlots> {
}
export {};
