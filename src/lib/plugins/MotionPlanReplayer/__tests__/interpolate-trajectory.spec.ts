import { describe, expect, it } from 'vitest'

import { interpolateTrajectory } from '../interpolate-trajectory'

const DEG = Math.PI / 180

describe('interpolateTrajectory', () => {
	it('returns a single-step trajectory unchanged', () => {
		const traj = [{ arm: [0, 0, 0] }]
		expect(interpolateTrajectory(traj)).toEqual(traj)
	})

	it('returns identical keyframes as a single step', () => {
		const traj = [{ arm: [1, 2, 3] }, { arm: [1, 2, 3] }]
		const result = interpolateTrajectory(traj)
		// maxDelta = 0 → numSubSteps = 1 → one sub-step (t=0) + final keyframe
		expect(result).toHaveLength(2)
		expect(result[0]).toEqual({ arm: [1, 2, 3] })
		expect(result[1]).toEqual({ arm: [1, 2, 3] })
	})

	it('scales sub-steps to the largest mover', () => {
		// joint 0 moves 1°, joint 1 moves 2° — largest is 2° → 2 sub-steps with 1° step size
		const from = { arm: [0, 0] }
		const to = { arm: [DEG, 2 * DEG] }
		const result = interpolateTrajectory([from, to], DEG)

		// 2 sub-steps (t=0, t=0.5) + final keyframe = 3 entries
		expect(result).toHaveLength(3)
		expect(result[0]).toEqual({ arm: [0, 0] })
		expect(result[1]!.arm![0]).toBeCloseTo(DEG / 2)
		expect(result[1]!.arm![1]).toBeCloseTo(DEG)
		expect(result[2]).toEqual(to)
	})

	it('always includes the final keyframe exactly', () => {
		const traj = [{ arm: [0] }, { arm: [10 * DEG] }]
		const result = interpolateTrajectory(traj, DEG)
		expect(result.at(-1)).toEqual({ arm: [10 * DEG] })
	})

	it('handles multiple components — max delta across all joints', () => {
		// arm moves 1°, gripper moves 3° — largest is 3° → 3 sub-steps
		const from = { arm: [0], gripper: [0] }
		const to = { arm: [DEG], gripper: [3 * DEG] }
		const result = interpolateTrajectory([from, to], DEG)
		// 3 sub-steps + final = 4
		expect(result).toHaveLength(4)
	})

	it('concatenates sub-steps across multiple keyframe pairs', () => {
		// Two pairs, each with 2° max delta → 2 sub-steps each + final = 5 total
		const traj = [{ arm: [0] }, { arm: [2 * DEG] }, { arm: [4 * DEG] }]
		const result = interpolateTrajectory(traj, DEG)
		expect(result).toHaveLength(5)
		expect(result.at(-1)).toEqual({ arm: [4 * DEG] })
	})
})
