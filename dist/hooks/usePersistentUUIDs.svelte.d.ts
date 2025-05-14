import type { WorldObject } from '../WorldObject';
export declare const usePersistentUUIDs: () => {
    uuids: Map<string, string>;
    updateUUIDs: (objects: WorldObject[]) => void;
};
