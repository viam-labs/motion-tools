import { WorldObject } from '../WorldObject';
interface Context {
    current: WorldObject[];
    add: () => void;
    remove: (name: string) => void;
}
export declare const provideStaticGeometries: () => void;
export declare const useStaticGeometries: () => Context;
export {};
