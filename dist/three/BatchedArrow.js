import { BatchedMesh, BoxGeometry, ConeGeometry, MeshBasicMaterial, Object3D, Vector3, Color, Box3, Matrix4, } from 'three';
const axis = new Vector3();
const object3d = new Object3D();
const vec3 = new Vector3();
const box1 = new Box3();
const box2 = new Box3();
const mat4_1 = new Matrix4();
const mat4_2 = new Matrix4();
let index = 0;
export class BatchedArrow {
    batchedMesh;
    shaftGeoId = -1;
    coneGeoId = -1;
    shaftWidth = 0;
    _arrows = new Map(); // arrowId -> { shaftId, headId }
    _idToArrowId = new Map();
    _pool = [];
    _idCounter = 0;
    constructor({ maxArrows = 20_000, shaftWidth = 0.001, material = new MeshBasicMaterial({ color: 0xffff00, toneMapped: false }), } = {}) {
        const shaftGeo = new BoxGeometry(1, 1, 1);
        shaftGeo.translate(0, 0.5, 0);
        const coneGeo = new ConeGeometry(0.5, 1, 5, 1);
        coneGeo.translate(0, -0.5, 0);
        const shaftVertexCount = shaftGeo.getAttribute('position').count;
        const coneVertexCount = coneGeo.getAttribute('position').count;
        const shaftIndexCount = shaftGeo.index?.count ?? shaftVertexCount;
        const coneIndexCount = coneGeo.index?.count ?? coneVertexCount;
        const maxVertexCount = maxArrows * (shaftVertexCount + coneVertexCount);
        const maxIndexCount = maxArrows * (shaftIndexCount + coneIndexCount);
        this.batchedMesh = new BatchedMesh(maxArrows * 2, maxVertexCount, maxIndexCount, material);
        this.batchedMesh.name = `batched arrows ${++index}`;
        this.batchedMesh.frustumCulled = false;
        this.shaftWidth = shaftWidth;
        this.shaftGeoId = this.batchedMesh.addGeometry(shaftGeo);
        this.coneGeoId = this.batchedMesh.addGeometry(coneGeo);
    }
    addArrow(dir, origin, length = 0.1, color) {
        dir.normalize();
        const headLength = length * 0.2;
        const headWidth = headLength * 0.2;
        let shaftId;
        let headId;
        const instance = this._pool.pop();
        if (instance) {
            ;
            ({ shaftId, headId } = instance);
        }
        else {
            shaftId = this.batchedMesh.addInstance(this.shaftGeoId);
            headId = this.batchedMesh.addInstance(this.coneGeoId);
        }
        // Apply shaft transform
        const shaftMatrix = this._computeTransform(origin, dir, length - headLength, this.shaftWidth);
        this.batchedMesh.setMatrixAt(shaftId, shaftMatrix);
        // Compute cone position = origin + dir * length
        const coneOrigin = vec3.copy(dir).multiplyScalar(length).add(origin);
        const coneMatrix = this._computeTransform(coneOrigin, dir, headLength, headWidth * 4);
        this.batchedMesh.setMatrixAt(headId, coneMatrix);
        if (color) {
            const col = new Color(color);
            this.batchedMesh.setColorAt(shaftId, col);
            this.batchedMesh.setColorAt(headId, col);
        }
        this.batchedMesh.setVisibleAt(shaftId, true);
        this.batchedMesh.setVisibleAt(headId, true);
        const arrowId = this._idCounter++;
        this._arrows.set(arrowId, { shaftId, headId });
        this._idToArrowId.set(shaftId, arrowId);
        this._idToArrowId.set(headId, arrowId);
        return arrowId;
    }
    getArrowId(instanceId) {
        return this._idToArrowId.get(instanceId);
    }
    getBoundingBoxAt(arrowId, target) {
        const arrow = this._arrows.get(arrowId);
        if (arrow) {
            const headBox = this.batchedMesh.getBoundingBoxAt(this.coneGeoId, box1);
            const tailBox = this.batchedMesh.getBoundingBoxAt(this.shaftGeoId, box2);
            if (headBox && tailBox) {
                this.batchedMesh.getMatrixAt(arrow.headId, mat4_1);
                this.batchedMesh.getMatrixAt(arrow.shaftId, mat4_2);
                target.copy(headBox.applyMatrix4(mat4_1)).union(tailBox.applyMatrix4(mat4_2));
                console.log(target);
                return target;
            }
        }
    }
    removeArrow(arrowId) {
        const arrow = this._arrows.get(arrowId);
        if (!arrow)
            return;
        this.batchedMesh.setVisibleAt(arrow.shaftId, false);
        this.batchedMesh.setVisibleAt(arrow.headId, false);
        this._pool.push(arrow);
        this._arrows.delete(arrowId);
    }
    clear() {
        for (const id of this._arrows.keys()) {
            this.removeArrow(id);
        }
    }
    getObject3d(id) {
        this.batchedMesh.getMatrixAt(id, object3d.matrix);
        object3d.updateMatrix();
        return object3d;
    }
    _computeTransform(origin, dir, lengthY, scaleXZ = 1) {
        object3d.position.copy(origin);
        object3d.quaternion.copy(this._quaternionFromDirection(dir));
        object3d.scale.set(scaleXZ, lengthY, scaleXZ);
        object3d.updateMatrix();
        return object3d.matrix.clone();
    }
    _quaternionFromDirection(dir) {
        if (dir.y > 0.99999)
            return object3d.quaternion.set(0, 0, 0, 1);
        if (dir.y < -0.99999)
            return object3d.quaternion.set(1, 0, 0, 0);
        axis.set(dir.z, 0, -dir.x).normalize();
        const radians = Math.acos(dir.y);
        return object3d.quaternion.setFromAxisAngle(axis, radians);
    }
    get object3d() {
        return this.batchedMesh;
    }
}
