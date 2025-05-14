import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type PointcloudProps = typeof __propDef.props;
export type PointcloudEvents = typeof __propDef.events;
export type PointcloudSlots = typeof __propDef.slots;
export default class Pointcloud extends SvelteComponentTyped<PointcloudProps, PointcloudEvents, PointcloudSlots> {
}
export {};
