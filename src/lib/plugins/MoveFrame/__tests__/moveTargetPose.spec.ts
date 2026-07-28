import { Matrix4 } from 'three'
import { describe, expect, it } from 'vitest'

import { createPose, poseToMatrix } from '$lib/transform'

import { fromDestinationPose, moveDelta, toDestinationPose } from '../moveTargetPose'

const pose = createPose({ x: 100, y: -250, z: 40, oX: 0, oY: 1, oZ: 0, theta: 35 })

describe('fromDestinationPose', () => {
	it('round-trips a pose through the world matrix the gizmo drags', () => {
		const matrix = fromDestinationPose(pose)

		expect(toDestinationPose(matrix)).toEqual({
			x: expect.closeTo(pose.x, 6),
			y: expect.closeTo(pose.y, 6),
			z: expect.closeTo(pose.z, 6),
			oX: expect.closeTo(pose.oX, 6),
			oY: expect.closeTo(pose.oY, 6),
			oZ: expect.closeTo(pose.oZ, 6),
			theta: expect.closeTo(pose.theta, 6),
		})
	})

	it('expresses the pose relative to a destination frame', () => {
		const destination = poseToMatrix(createPose({ x: 1000, y: 0, z: 0 }), new Matrix4())

		const matrix = fromDestinationPose(pose, destination)

		// The destination sits 1 m along +x, so the world position shifts by that much.
		expect(toDestinationPose(matrix).x).toBeCloseTo(pose.x + 1000, 6)
		// …and reading it back against the same destination returns the input.
		expect(toDestinationPose(matrix, destination).x).toBeCloseTo(pose.x, 6)
	})

	it('returns a new matrix so the staged goal is replaced rather than mutated', () => {
		expect(fromDestinationPose(pose)).not.toBe(fromDestinationPose(pose))
	})

	it('stages no travel when the pose describes where the frame already is', () => {
		const current = fromDestinationPose(pose)

		const delta = moveDelta(current, fromDestinationPose(pose))

		expect(delta.distance).toBeCloseTo(0, 6)
		expect(delta.angle).toBeCloseTo(0, 6)
	})
})
