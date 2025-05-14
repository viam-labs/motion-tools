import type { Object3D } from 'three';
import type { WorldObject } from '../WorldObject';
type UUID = string;
interface SelectionContext {
    readonly current: UUID | undefined;
    set(value?: UUID): void;
}
interface FocusContext {
    readonly current: UUID | undefined;
    set(value?: UUID): void;
}
export declare const provideSelection: () => {
    selection: {
        readonly current: string | undefined;
        set(value?: UUID): void;
    };
    focus: {
        readonly current: string | undefined;
        set(value?: UUID): void;
    };
    hover: {
        readonly current: string | undefined;
        set(value?: UUID): void;
    };
};
export declare const useSelected: () => SelectionContext;
export declare const useFocused: () => FocusContext;
export declare const useFocusedObject: () => {
    current: WorldObject | undefined;
};
export declare const useSelectedObject: () => {
    current: WorldObject | undefined;
};
export declare const useFocusedObject3d: () => {
    current: Object3D | undefined;
};
export declare const useSelectedObject3d: () => {
    current: Object3D | undefined;
};
export {};
