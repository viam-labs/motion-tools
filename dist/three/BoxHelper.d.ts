import { Box3, LineSegments, Object3D } from 'three';
/**
 * Helper object to graphically show the world-axis-aligned bounding box
 * around an object. The actual bounding box is handled with {@link Box3},
 * this is just a visual helper for debugging. It can be automatically
 * resized with {@link BoxHelper#update} when the object it's created from
 * is transformed. Note that the object must have a geometry for this to work,
 * so it won't work with sprites.
 *
 * ```js
 * const sphere = new THREE.SphereGeometry();
 * const object = new THREE.Mesh( sphere, new THREE.MeshBasicMaterial( 0xff0000 ) );
 * const box = new THREE.BoxHelper( object, 0xffff00 );
 * scene.add( box );
 * ```
 *
 * @augments LineSegments
 */
declare class BoxHelper extends LineSegments {
    type: string;
    matrixAutoUpdate: boolean;
    object: Object3D | undefined;
    /**
     * Constructs a new box helper.
     *
     * @param {Object3D} [object] - The 3D object to show the world-axis-aligned bounding box.
     * @param {number|Color|string} [color=0xffff00] - The box's color.
     */
    constructor(object: Object3D, color?: number);
    /**
     * Updates the helper's geometry to match the dimensions of the object,
     * including any children.
     */
    update(): void;
    /**
     * Updates the wireframe box for the passed object.
     *
     * @param {Object3D} object - The 3D object to create the helper for.
     * @return {BoxHelper} A reference to this instance.
     */
    setFromObject(object: Object3D): this;
    setFromBox3(box: Box3): this;
    copy(source: BoxHelper, recursive: boolean): this;
    /**
     * Frees the GPU-related resources allocated by this instance. Call this
     * method whenever this instance is no longer used in your app.
     */
    dispose(): void;
}
export { BoxHelper };
