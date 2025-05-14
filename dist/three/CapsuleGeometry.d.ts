import { LatheGeometry } from 'three';
/**
 * An alternate definition of a THREE.CapsuleGeometry: the length
 * represents the entire length of the capsule, including the rounded ends,
 * rather than just the midsection, which is the default THREE.CapsuleGeometry definition.
 */
export declare class CapsuleGeometry extends LatheGeometry {
    type: string;
    constructor(radius?: number, length?: number, capSegments?: number, radialSegments?: number);
}
