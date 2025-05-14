import { SvelteComponentTyped } from "svelte";
declare const __propDef: {
    props: Record<string, never>;
    events: {
        [evt: string]: CustomEvent<any>;
    };
    slots: {};
};
export type SceneProps = typeof __propDef.props;
export type SceneEvents = typeof __propDef.events;
export type SceneSlots = typeof __propDef.slots;
export default class Scene extends SvelteComponentTyped<SceneProps, SceneEvents, SceneSlots> {
}
export {};
