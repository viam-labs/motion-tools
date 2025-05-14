import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type ProvidersProps = typeof __propDef.props;
export type ProvidersEvents = typeof __propDef.events;
export type ProvidersSlots = typeof __propDef.slots;
export default class Providers extends SvelteComponentTyped<ProvidersProps, ProvidersEvents, ProvidersSlots> {
}
export {};
