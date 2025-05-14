import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type AppProps = typeof __propDef.props;
export type AppEvents = typeof __propDef.events;
export type AppSlots = typeof __propDef.slots;
export default class App extends SvelteComponentTyped<AppProps, AppEvents, AppSlots> {
}
export {};
