import type { Geometry, Pose } from '@viamrobotics/sdk';
import { Box3, Object3D, Vector3 } from 'three';
export type PointsGeometry = {
    case: 'points';
    value: Float32Array;
};
export type LinesGeometry = {
    case: 'line';
    value: Float32Array;
};
export type Geometries = Geometry['geometryType'] | PointsGeometry | LinesGeometry;
export type Metadata = {
    colors?: Float32Array;
    color?: string;
    gltf?: {
        scene: Object3D;
    };
    points?: Vector3[];
    batched?: {
        name: string;
    };
    getBoundingBoxAt?: (box: Box3) => void;
};
export declare class WorldObject<T extends Geometries = Geometries> {
    uuid: string;
    name: string;
    referenceFrame: string;
    pose: Pose;
    geometry?: T;
    metadata: Metadata;
    constructor(name: string, pose?: Pose, parent?: string, geometry?: T, metadata?: Metadata);
}
