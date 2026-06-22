import { describe, expect, it } from 'vitest'

import { planJsonToSnapshots } from '../plan-to-snapshots'

// arm chain: waist (joint, Z-axis) → base (link, z=100mm, capsule geometry)
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

const RESULT = { trajectory: [{ arm: [0] }, { arm: [1.5708] }] }
const CONTENT = JSON.stringify(REQUEST) + JSON.stringify(RESULT)

describe('planJsonToSnapshots', () => {
	it('returns one Snapshot per trajectory step', () => {
		const snapshots = planJsonToSnapshots(CONTENT)
		expect(snapshots).toHaveLength(2)
	})

	it('joint frames produce no transform; child link appears instead', () => {
		const snapshots = planJsonToSnapshots(CONTENT)
		// waist (joint) is absorbed — only base (jointed_link) appears
		expect(snapshots[0]!.transforms).toHaveLength(1)
		const names = snapshots[0]!.transforms.map((t) => t.referenceFrame)
		expect(names).not.toContain('arm:waist')
		expect(names).toContain('arm:base')
	})

	it('jointed link bakes joint rotation — pose changes per step', () => {
		const snapshots = planJsonToSnapshots(CONTENT)
		const base0 = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		const base1 = snapshots[1]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		// step 0: angle=0 → theta≈0; step 1: angle=π/2 → theta≈90°
		expect(base0.poseInObserverFrame!.pose!.theta).toBeCloseTo(0, 1)
		expect(base1.poseInObserverFrame!.pose!.theta).toBeCloseTo(90, 1)
	})

	it("jointed link is parented to the joint's parent, not the joint", () => {
		const snapshots = planJsonToSnapshots(CONTENT)
		const base = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		// waist's parent is 'world', so base's ECS parent should also be 'world'
		expect(base.poseInObserverFrame!.referenceFrame).toBe('world')
	})

	it('jointed link translation is rotated by the joint quaternion', () => {
		const snapshots = planJsonToSnapshots(CONTENT)
		// Z-axis rotation by π/2: translation (0, 0, 100) stays (0, 0, 100) because Z is unchanged
		const base1 = snapshots[1]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		const pose = base1.poseInObserverFrame!.pose!
		expect(pose.x).toBeCloseTo(0, 1)
		expect(pose.y).toBeCloseTo(0, 1)
		expect(pose.z).toBeCloseTo(100, 1)
	})

	it('link has same UUID across steps', () => {
		const snapshots = planJsonToSnapshots(CONTENT)
		const base0 = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		const base1 = snapshots[1]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		expect(base0.uuid).toStrictEqual(base1.uuid)
	})

	it('link has physicalObject when geometry is present', () => {
		const snapshots = planJsonToSnapshots(CONTENT)
		const base = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		expect(base.physicalObject).toBeDefined()
		expect(base.physicalObject!.geometryType.case).toBe('capsule')
	})

	it('returns empty array for plan with no trajectory', () => {
		expect(planJsonToSnapshots(JSON.stringify(REQUEST))).toHaveLength(0)
	})
})
