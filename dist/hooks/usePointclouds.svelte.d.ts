import { WorldObject, type PointsGeometry } from '../WorldObject';
interface Context {
    current: WorldObject<PointsGeometry>[];
}
export declare const providePointclouds: (partID: () => string) => void;
export declare const usePointClouds: () => Context;
export {};
