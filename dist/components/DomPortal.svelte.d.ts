import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type DomPortalProps = typeof __propDef.props;
export type DomPortalEvents = typeof __propDef.events;
export type DomPortalSlots = typeof __propDef.slots;
export default class DomPortal extends SvelteComponentTyped<DomPortalProps, DomPortalEvents, DomPortalSlots> {
}
export {};
