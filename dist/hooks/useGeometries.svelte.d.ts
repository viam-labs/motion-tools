import { WorldObject } from '../WorldObject';
interface Context {
    current: WorldObject[];
}
export declare const provideGeometries: (partID: () => string) => void;
export declare const useGeometries: () => Context;
export {};
