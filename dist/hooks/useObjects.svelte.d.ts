import type { WorldObject } from '../WorldObject';
interface Context {
    current: WorldObject[];
}
export declare const provideObjects: () => void;
export declare const useObjects: () => Context;
export {};
