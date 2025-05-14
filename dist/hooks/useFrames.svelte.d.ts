import { WorldObject } from '../WorldObject';
interface FramesContext {
    current: WorldObject[];
    error?: Error;
    fetching: boolean;
}
export declare const provideFrames: (partID: () => string) => void;
export declare const useFrames: () => FramesContext;
export {};
