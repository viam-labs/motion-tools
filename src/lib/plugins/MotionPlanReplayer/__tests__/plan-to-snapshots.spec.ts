import { describe, expect, it } from 'vitest'

import { parsePlan } from '../parse-plan'
import { parsedPlanToReplay } from '../plan-to-snapshots'

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

const snapshotsFromContent = (content: string) => parsedPlanToReplay(parsePlan(content)).snapshots

describe('parsedPlanToSnapshots', () => {
	it('returns one Snapshot per trajectory step', () => {
		const snapshots = snapshotsFromContent(CONTENT)
		expect(snapshots).toHaveLength(2)
	})

	it('joint and link both appear as transforms', () => {
		const snapshots = snapshotsFromContent(CONTENT)
		// waist (joint) and base (link) each emit a transform
		expect(snapshots[0]!.transforms).toHaveLength(2)
		const names = snapshots[0]!.transforms.map((t) => t.referenceFrame)
		expect(names).toContain('arm:waist')
		expect(names).toContain('arm:base')
	})

	it('joint pose changes per step; link local pose stays constant', () => {
		const snapshots = snapshotsFromContent(CONTENT)
		const waist0 = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:waist')!
		const waist1 = snapshots[1]!.transforms.find((t) => t.referenceFrame === 'arm:waist')!
		const base0 = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		const base1 = snapshots[1]!.transforms.find((t) => t.referenceFrame === 'arm:base')!

		// joint theta changes: step 0 → 0°, step 1 → 90°
		expect(waist0.poseInObserverFrame!.pose!.theta).toBeCloseTo(0, 1)
		expect(waist1.poseInObserverFrame!.pose!.theta).toBeCloseTo(90, 1)

		// link local pose is constant — WorldMatrix handles world-space composition
		expect(base0.poseInObserverFrame!.pose!.z).toBeCloseTo(100, 1)
		expect(base1.poseInObserverFrame!.pose!.z).toBeCloseTo(100, 1)
		expect(base0.poseInObserverFrame!.pose!.theta).toBeCloseTo(0, 1)
		expect(base1.poseInObserverFrame!.pose!.theta).toBeCloseTo(0, 1)
	})

	it('link is parented to its joint', () => {
		const snapshots = snapshotsFromContent(CONTENT)
		const base = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		expect(base.poseInObserverFrame!.referenceFrame).toBe('arm:waist')
	})

	it('joint is parented to its frame_system parent', () => {
		const snapshots = snapshotsFromContent(CONTENT)
		const waist = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:waist')!
		expect(waist.poseInObserverFrame!.referenceFrame).toBe('world')
	})

	it('joint has no physicalObject', () => {
		const snapshots = snapshotsFromContent(CONTENT)
		const waist = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:waist')!
		expect(waist.physicalObject).toBeUndefined()
	})

	it('link has same UUID across steps', () => {
		const snapshots = snapshotsFromContent(CONTENT)
		const base0 = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		const base1 = snapshots[1]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		expect(base0.uuid).toStrictEqual(base1.uuid)
	})

	it('link has physicalObject when geometry is present', () => {
		const snapshots = snapshotsFromContent(CONTENT)
		const base = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:base')!
		expect(base.physicalObject).toBeDefined()
		expect(base.physicalObject!.geometryType.case).toBe('capsule')
	})

	it('returns no snapshots for a plan with neither trajectory nor start state', () => {
		const replay = parsedPlanToReplay(parsePlan(JSON.stringify(REQUEST)))
		expect(replay.snapshots).toHaveLength(0)
		expect(replay.startStateOnly).toBe(false)
	})

	it('is not start-state-only when a trajectory exists', () => {
		expect(parsedPlanToReplay(parsePlan(CONTENT)).startStateOnly).toBe(false)
	})
})

const GOAL_REQUEST = {
	...REQUEST,
	goals: [
		{
			poses: {
				gripper: {
					referenceFrame: 'world',
					pose: { x: 300, y: 700, z: 50, oX: 0, oY: 1, oZ: 0, theta: -180 },
				},
			},
			configuration: null,
		},
	],
}

describe('goal markers', () => {
	const snapshots = snapshotsFromContent(JSON.stringify(GOAL_REQUEST) + JSON.stringify(RESULT))

	it('appends one geometry-less marker transform per goal pose to every snapshot', () => {
		for (const snapshot of snapshots) {
			const marker = snapshot.transforms.find((t) => t.referenceFrame === 'goal:gripper')!
			expect(marker).toBeDefined()
			expect(marker.physicalObject).toBeUndefined()
		}
	})

	it('poses the marker in the goal reference frame with axes shown', () => {
		const marker = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'goal:gripper')!
		expect(marker.poseInObserverFrame!.referenceFrame).toBe('world')
		expect(marker.poseInObserverFrame!.pose!.x).toBe(300)
		expect(marker.poseInObserverFrame!.pose!.oY).toBe(1)
		expect(marker.poseInObserverFrame!.pose!.theta).toBe(-180)
		expect(marker.metadata!.fields['show_axes_helper']!.kind).toEqual({
			case: 'boolValue',
			value: true,
		})
	})

	it('keeps the marker UUID stable across steps so the reconciler updates in place', () => {
		const marker0 = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'goal:gripper')!
		const marker1 = snapshots[1]!.transforms.find((t) => t.referenceFrame === 'goal:gripper')!
		expect(marker0.uuid).toStrictEqual(marker1.uuid)
	})
})

describe('start-state fallback for plans without a trajectory', () => {
	const failedPlan = {
		...GOAL_REQUEST,
		start_state: { poses: null, configuration: { arm: [1.5708] } },
	}
	const replay = parsedPlanToReplay(parsePlan(JSON.stringify(failedPlan)))

	it('produces a single start-state-only snapshot', () => {
		expect(replay.startStateOnly).toBe(true)
		expect(replay.snapshots).toHaveLength(1)
	})

	it('poses joints from the start configuration', () => {
		const waist = replay.snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm:waist')!
		expect(waist.poseInObserverFrame!.pose!.theta).toBeCloseTo(90, 1)
	})

	it('includes the goal marker', () => {
		const marker = replay.snapshots[0]!.transforms.find((t) => t.referenceFrame === 'goal:gripper')
		expect(marker).toBeDefined()
	})
})
