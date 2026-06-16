import { describe, expect, it } from 'vitest'

import { planJsonToSnapshots } from '../plan-to-snapshots'

const REQUEST = {
	frame_system: {
		frames: {
			arm: {
				frame_type: 'model',
				frame: { name: 'arm', model: { joints: [{ id: 'waist' }] } },
			},
			'arm:waist': {
				frame_type: 'named',
				frame: {
					inner_frame: {
						frame_type: 'rotational',
						frame: { axis: { X: 0, Y: 0, Z: 1 } },
					},
				},
			},
			'arm:base': {
				frame_type: 'named',
				frame: {
					inner_frame: {
						frame_type: 'static',
						frame: {
							translation: { X: 0, Y: 0, Z: 100 },
							orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
							geometry: {
								type: 'capsule',
								r: 30,
								l: 100,
								translation: { X: 0, Y: 0, Z: 50 },
								orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
								Label: 'base',
							},
						},
					},
				},
			},
		},
		parents: { 'arm:waist': 'world', 'arm:base': 'arm:waist' },
	},
	goals: [],
	start_state: {},
}

const RESULT = { trajectory: [{ arm: [0.0] }, { arm: [1.5708] }] }
const CONTENT = JSON.stringify(REQUEST) + JSON.stringify(RESULT)

describe('planJsonToSnapshots', () => {
	it('returns one Snapshot per trajectory step', () => {
		const snapshots = planJsonToSnapshots(CONTENT)
		expect(snapshots).toHaveLength(2)
	})

	it('each Snapshot contains a Transform per frame', () => {
		const snapshots = planJsonToSnapshots(CONTENT)
		// 1 rotational (waist) + 1 static (base) = 2 frames
		expect(snapshots[0]!.transforms).toHaveLength(2)
		expect(snapshots[1]!.transforms).toHaveLength(2)
	})

	it('rotational frame Transform has different pose at each step', () => {
		const snapshots = planJsonToSnapshots(CONTENT)
		const waist0 = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:waist')!
		const waist1 = snapshots[1]!.transforms.find((t) => t.referenceFrame === 'arm:waist')!
		// step 0: angle=0 → theta≈0; step 1: angle=π/2 → theta≈90°
		expect(waist0.poseInObserverFrame!.pose!.theta).toBeCloseTo(0, 1)
		expect(waist1.poseInObserverFrame!.pose!.theta).toBeCloseTo(90, 1)
	})

	it('static frame has the same UUID in both steps', () => {
		const snapshots = planJsonToSnapshots(CONTENT)
		const base0 = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		const base1 = snapshots[1]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		expect(base0.uuid).toStrictEqual(base1.uuid)
	})

	it('static frame has physicalObject when geometry is present', () => {
		const snapshots = planJsonToSnapshots(CONTENT)
		const base = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		expect(base.physicalObject).toBeDefined()
		expect(base.physicalObject!.geometryType.case).toBe('capsule')
	})

	it('returns empty array for plan with no trajectory', () => {
		expect(planJsonToSnapshots(JSON.stringify(REQUEST))).toHaveLength(0)
	})
})
