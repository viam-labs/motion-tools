import { OrientationVector } from '@viamrobotics/three';
import { MathUtils, Quaternion, Vector3 } from 'three';
const ov = new OrientationVector();
export const createPose = (pose) => {
    return {
        x: pose?.x ?? 0,
        y: pose?.y ?? 0,
        z: pose?.z ?? 0,
        oX: pose?.oX ?? 0,
        oY: pose?.oY ?? 0,
        oZ: pose?.oZ ?? 1,
        theta: pose?.theta ?? 0,
    };
};
export const createGeometry = (geometryType, label = '') => {
    return {
        center: createPose(),
        label,
        geometryType: geometryType ?? { case: undefined, value: undefined },
    };
};
export const quaternionToPose = (quaternion, pose) => {
    ov.setFromQuaternion(quaternion);
    pose.oX = ov.x;
    pose.oY = ov.y;
    pose.oZ = ov.z;
    pose.theta = MathUtils.radToDeg(ov.th);
};
export const vector3ToPose = (vec3, pose) => {
    pose.x = vec3.x * 1000;
    pose.y = vec3.y * 1000;
    pose.z = vec3.z * 1000;
};
export const object3dToPose = (object3d, pose) => {
    vector3ToPose(object3d.position, pose);
    quaternionToPose(object3d.quaternion, pose);
    return pose;
};
export const poseToQuaternion = (pose, quaternion) => {
    const th = MathUtils.degToRad(pose.theta ?? 0);
    ov.set(pose.oX, pose.oY, pose.oZ, th);
    ov.toQuaternion(quaternion);
};
export const poseToVector3 = (pose, vec3) => {
    vec3.set(pose.x ?? 0, pose.y ?? 0, pose.z ?? 0).multiplyScalar(0.001);
};
export const poseToObject3d = (pose, object3d) => {
    poseToVector3(pose, object3d.position);
    poseToQuaternion(pose, object3d.quaternion);
};
export const scaleToDimensions = (scale, geometry) => {
    if (geometry.geometryType.case === 'box') {
        geometry.geometryType.value.dimsMm ??= { x: 0, y: 0, z: 0 };
        geometry.geometryType.value.dimsMm.x = scale.x * 1000;
        geometry.geometryType.value.dimsMm.y = scale.y * 1000;
        geometry.geometryType.value.dimsMm.z = scale.z * 1000;
    }
    else if (geometry.geometryType.case === 'capsule') {
        geometry.geometryType.value.radiusMm = scale.x * 1000;
        geometry.geometryType.value.lengthMm = scale.y * 1000;
    }
    else if (geometry.geometryType.case === 'sphere') {
        geometry.geometryType.value.radiusMm = scale.x * 1000;
    }
};
