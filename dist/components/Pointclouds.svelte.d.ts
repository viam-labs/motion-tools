import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type PointcloudsProps = typeof __propDef.props;
export type PointcloudsEvents = typeof __propDef.events;
export type PointcloudsSlots = typeof __propDef.slots;
export default class Pointclouds extends SvelteComponentTyped<PointcloudsProps, PointcloudsEvents, PointcloudsSlots> {
}
export {};
