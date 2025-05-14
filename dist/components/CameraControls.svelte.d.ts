import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type CameraControlsProps = typeof __propDef.props;
export type CameraControlsEvents = typeof __propDef.events;
export type CameraControlsSlots = typeof __propDef.slots;
export default class CameraControls extends SvelteComponentTyped<CameraControlsProps, CameraControlsEvents, CameraControlsSlots> {
}
export {};
