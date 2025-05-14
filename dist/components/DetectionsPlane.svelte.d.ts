import { SvelteComponentTyped } from "svelte";
import { Detection } from '@viamrobotics/sdk';
declare const __propDef: {
    props: {
        detections: Detection[];
    };
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type DetectionsPlaneProps = typeof __propDef.props;
export type DetectionsPlaneEvents = typeof __propDef.events;
export type DetectionsPlaneSlots = typeof __propDef.slots;
export default class DetectionsPlane extends SvelteComponentTyped<DetectionsPlaneProps, DetectionsPlaneEvents, DetectionsPlaneSlots> {
}
export {};
