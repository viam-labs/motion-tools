import { Box3, MathUtils, Object3D, Vector3 } from 'three';
import { createPose } from './transform';
export class WorldObject {
    uuid = MathUtils.generateUUID();
    name;
    referenceFrame;
    pose;
    geometry;
    metadata;
    constructor(name, pose, parent = 'world', geometry, metadata) {
        this.name = name;
        this.referenceFrame = parent;
        this.pose = pose ?? createPose();
        this.geometry = geometry;
        this.metadata = metadata ?? {};
    }
}
