import { Matrix4, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { createPose } from '$lib/transform'
import { poseToMatrix } from '$lib/transform'

import { buildTargetPose, worldNormalFromFace } from '../buildTargetPose'

describe('buildTargetPose — position', () => {
	it('converts a world point (m) to a destination pose (mm) relative to world', () => {
		const pose = buildTargetPose({
			worldPoint: new Vector3(0.1, 0.2, 0.3),
			orientation: 'keep',
		})
		expect(pose.x).toBeCloseTo(100)
		expect(pose.y).toBeCloseTo(200)
		expect(pose.z).toBeCloseTo(300)
	})

	it('expresses the point relative to the destination frame', () => {
		// Destination frame translated +1m on x; a world point at 1.5m is 0.5m local.
		const destinationWorldMatrix = new Matrix4().makeTranslation(1, 0, 0)
		const pose = buildTargetPose({
			worldPoint: new Vector3(1.5, 0, 0),
			destinationWorldMatrix,
			orientation: 'keep',
		})
		expect(pose.x).toBeCloseTo(500)
		expect(pose.y).toBeCloseTo(0)
		expect(pose.z).toBeCloseTo(0)
	})
})

describe('buildTargetPose — keep orientation', () => {
	it('defaults to the (0,0,1,0) orientation when no current transform is given', () => {
		const pose = buildTargetPose({
			worldPoint: new Vector3(0, 0, 0),
			orientation: 'keep',
		})
		expect(pose.oX).toBeCloseTo(0)
		expect(pose.oY).toBeCloseTo(0)
		expect(pose.oZ).toBeCloseTo(1)
		expect(pose.theta).toBeCloseTo(0)
	})

	it('reproduces the current frame orientation, replacing only position', () => {
		// A frame whose +Z points along world +X.
		const current = poseToMatrix(createPose({ oX: 1, oY: 0, oZ: 0, theta: 0 }), new Matrix4())
		const pose = buildTargetPose({
			worldPoint: new Vector3(0, 0, 0.5),
			currentWorldMatrix: current,
			orientation: 'keep',
		})
		expect(pose.z).toBeCloseTo(500)
		expect(pose.oX).toBeCloseTo(1)
		expect(pose.oY).toBeCloseTo(0)
		expect(pose.oZ).toBeCloseTo(0)
	})
})

describe('buildTargetPose — align into surface', () => {
	it('points the tool into a +Z face (−normal)', () => {
		const pose = buildTargetPose({
			worldPoint: new Vector3(0, 0, 0),
			worldNormal: new Vector3(0, 0, 1),
			orientation: 'align',
		})
		expect(pose.oX).toBeCloseTo(0)
		expect(pose.oY).toBeCloseTo(0)
		expect(pose.oZ).toBeCloseTo(-1)
	})

	it('points the orientation vector opposite the surface normal', () => {
		const pose = buildTargetPose({
			worldPoint: new Vector3(0, 0, 0),
			worldNormal: new Vector3(1, 0, 0),
			orientation: 'align',
		})
		expect(pose.oX).toBeCloseTo(-1)
		expect(pose.oY).toBeCloseTo(0)
		expect(pose.oZ).toBeCloseTo(0)
	})

	it('falls back to keep when align is requested but no normal is available', () => {
		const current = poseToMatrix(createPose({ oX: 1, oY: 0, oZ: 0, theta: 0 }), new Matrix4())
		const pose = buildTargetPose({
			worldPoint: new Vector3(0, 0, 0),
			currentWorldMatrix: current,
			orientation: 'align',
		})
		// No normal → keeps the current (+X) orientation instead of aligning.
		expect(pose.oX).toBeCloseTo(1)
		expect(pose.oZ).toBeCloseTo(0)
	})
})

describe('buildTargetPose — standoff', () => {
	it('lifts the goal off the surface along the normal', () => {
		const pose = buildTargetPose({
			worldPoint: new Vector3(0, 0, 0),
			worldNormal: new Vector3(0, 0, 1),
			orientation: 'keep',
			standoff: 100,
		})
		expect(pose.x).toBeCloseTo(0)
		expect(pose.y).toBeCloseTo(0)
		expect(pose.z).toBeCloseTo(100)
	})

	it('offsets along an arbitrary surface normal', () => {
		const pose = buildTargetPose({
			worldPoint: new Vector3(0, 0, 0),
			worldNormal: new Vector3(1, 0, 0),
			orientation: 'keep',
			standoff: 100,
		})
		expect(pose.x).toBeCloseTo(100)
		expect(pose.z).toBeCloseTo(0)
	})

	it('falls back to world up when the hit has no normal', () => {
		const pose = buildTargetPose({
			worldPoint: new Vector3(0, 0, 0),
			orientation: 'keep',
			standoff: 50,
		})
		expect(pose.z).toBeCloseTo(50)
	})
})

describe('worldNormalFromFace', () => {
	it('returns the object-space normal unchanged when the world matrix is identity', () => {
		const n = worldNormalFromFace(new Vector3(0, 0, 1), new Matrix4())
		expect(n.x).toBeCloseTo(0)
		expect(n.y).toBeCloseTo(0)
		expect(n.z).toBeCloseTo(1)
	})

	it('rotates the normal by the object rotation (90° about Y maps +Z to +X)', () => {
		const objectMatrixWorld = new Matrix4().makeRotationY(Math.PI / 2)
		const n = worldNormalFromFace(new Vector3(0, 0, 1), objectMatrixWorld)
		expect(n.x).toBeCloseTo(1)
		expect(n.y).toBeCloseTo(0)
		expect(n.z).toBeCloseTo(0)
	})
})
