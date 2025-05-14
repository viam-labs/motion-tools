import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
type CameraFeedProps_ = typeof __propDef.props;
export { CameraFeedProps_ as CameraFeedProps };
export type CameraFeedEvents = typeof __propDef.events;
export type CameraFeedSlots = typeof __propDef.slots;
export default class CameraFeed extends SvelteComponentTyped<CameraFeedProps_, CameraFeedEvents, CameraFeedSlots> {
}
