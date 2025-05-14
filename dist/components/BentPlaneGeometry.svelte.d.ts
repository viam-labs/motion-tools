import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: {
        args: [radius: number, width?: number | undefined, height?: number | undefined, widthSegments?: number | undefined, heightSegments?: number | undefined];
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {
        default: {};
    };
};
export type BentPlaneGeometryProps = typeof __propDef.props;
export type BentPlaneGeometryEvents = typeof __propDef.events;
export type BentPlaneGeometrySlots = typeof __propDef.slots;
export default class BentPlaneGeometry extends SvelteComponentTyped<BentPlaneGeometryProps, BentPlaneGeometryEvents, BentPlaneGeometrySlots> {
}
export {};
