import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type OriginMarkerProps = typeof __propDef.props;
export type OriginMarkerEvents = typeof __propDef.events;
export type OriginMarkerSlots = typeof __propDef.slots;
export default class OriginMarker extends SvelteComponentTyped<OriginMarkerProps, OriginMarkerEvents, OriginMarkerSlots> {
}
export {};
