import { BatchedMesh, MeshBasicMaterial, Object3D, Vector3, Box3, Matrix4 } from 'three';
interface Arrow {
    shaftId: number;
    headId: number;
}
export declare class BatchedArrow {
    batchedMesh: BatchedMesh;
    shaftGeoId: number;
    coneGeoId: number;
    shaftWidth: number;
    _arrows: Map<number, Arrow>;
    _idToArrowId: Map<number, number>;
    _pool: Arrow[];
    _idCounter: number;
    constructor({ maxArrows, shaftWidth, material, }?: {
        maxArrows?: number | undefined;
        shaftWidth?: number | undefined;
        material?: MeshBasicMaterial | undefined;
    });
    addArrow(dir: Vector3, origin: Vector3, length?: number, color?: string): number;
    getArrowId(instanceId: number): number | undefined;
    getBoundingBoxAt(arrowId: number, target: Box3): Box3 | undefined;
    removeArrow(arrowId: number): void;
    clear(): void;
    getObject3d(id: number): Object3D<import("three").Object3DEventMap>;
    _computeTransform(origin: Vector3, dir: Vector3, lengthY: number, scaleXZ?: number): Matrix4;
    _quaternionFromDirection(dir: Vector3): import("three").Quaternion;
    get object3d(): BatchedMesh;
}
export {};
