import { BatchedArrow } from '../three/BatchedArrow';
import { WorldObject, type PointsGeometry } from '../WorldObject';
type ConnectionStatus = 'connecting' | 'open' | 'closed';
interface Context {
    current: WorldObject[];
    points: WorldObject<PointsGeometry>[];
    meshes: WorldObject[];
    poses: WorldObject[];
    nurbs: WorldObject[];
    models: WorldObject[];
    connectionStatus: ConnectionStatus;
    object3ds: {
        batchedArrow: BatchedArrow;
    };
}
export declare const provideShapes: () => void;
export declare const useShapes: () => Context;
export {};
