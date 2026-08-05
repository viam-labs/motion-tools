import { MathUtils, Quaternion, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import type { PoseInFrame, Transform } from '$lib/buf/common/v1/common_pb'

import { OrientationVector } from '$lib/three/OrientationVector'

import { parsePlan } from '../parse-plan'
import { parsedPlanToSnapshots } from '../plan-to-snapshots'
import gantryPlan from './__fixtures__/gantry-plan.json?raw'
import pirouettePlan from './__fixtures__/pirouette-plan.json?raw'
import gripperModel from './__fixtures__/rdk-mimic-gripper-model.json'
import serialModel from './__fixtures__/rdk-mimic-serial-model.json'
import { rdkModelPlan } from './__fixtures__/rdk-model-plan'
import saladPlan from './__fixtures__/salad-plan.json?raw'

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

const snapshotsFromContent = (content: string) => parsedPlanToSnapshots(parsePlan(content))

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

	it('returns empty array for plan with no trajectory', () => {
		expect(parsedPlanToSnapshots(parsePlan(JSON.stringify(REQUEST)))).toHaveLength(0)
	})
})

// The arm holds [0,0,0,0,0,0] across both steps, so the prismatic joint is the plan's only motion —
// a regression renders this capture entirely still.
describe('parsedPlanToSnapshots with a translational joint', () => {
	const snapshots = parsedPlanToSnapshots(parsePlan(gantryPlan))
	const jointAt = (step: number) =>
		snapshots[step]!.transforms.find((t) => t.referenceFrame === 'gantry-1:gantry_joint')!

	it('emits the prismatic joint as a transform', () => {
		expect(snapshots).toHaveLength(2)
		expect(jointAt(0)).toBeDefined()
	})

	// 50 and 90 are the capture's own gantry-1 values, on axis {X:1,Y:0,Z:0}.
	it('translates along the axis by the step value in millimetres', () => {
		expect(jointAt(0).poseInObserverFrame!.pose!.x).toBeCloseTo(50, 3)
		expect(jointAt(1).poseInObserverFrame!.pose!.x).toBeCloseTo(90, 3)
	})

	it('slides without rotating', () => {
		for (const step of [0, 1]) {
			const pose = jointAt(step).poseInObserverFrame!.pose!
			expect(pose.theta).toBeCloseTo(0, 3)
			expect(pose.y).toBeCloseTo(0, 3)
			expect(pose.z).toBeCloseTo(0, 3)
		}
	})

	it('keeps the carriage parented to the joint so it rides along', () => {
		const carriage = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'gantry-1:carriage')!
		expect(carriage.poseInObserverFrame!.referenceFrame).toBe('gantry-1:gantry_joint')
		expect(carriage.physicalObject!.geometryType.case).toBe('box')
	})

	// The arm shares the capture and must still read as radians, not millimetres.
	it('leaves revolute joints on the same rig unchanged', () => {
		const waist = snapshots[0]!.transforms.find((t) => t.referenceFrame === 'arm-1:waist')!
		expect(waist.poseInObserverFrame!.pose!.theta).toBeCloseTo(0, 3)
	})
})

describe('parsedPlanToSnapshots with the pirouette capture', () => {
	const snapshots = parsedPlanToSnapshots(parsePlan(pirouettePlan))
	const obstaclesIn = (step: number) =>
		snapshots[step]!.transforms.filter((t) => t.referenceFrame.startsWith('obstacle:'))

	it('replays trajectory steps with stable world_state obstacles', () => {
		expect(snapshots).toHaveLength(2)
		expect(obstaclesIn(0).map((t) => t.referenceFrame)).toEqual([
			'obstacle:pallet',
			'obstacle:pick-station',
		])
		expect(obstaclesIn(0).map((t) => t.uuid)).toStrictEqual(obstaclesIn(1).map((t) => t.uuid))
	})
})

// The renderer reads the mesh case off `physicalObject`, so it has to survive this far.
describe('parsedPlanToSnapshots with mesh geometry present', () => {
	const snapshots = parsedPlanToSnapshots(parsePlan(saladPlan))

	it('produces one snapshot per trajectory step', () => {
		expect(snapshots.length).toBe(parsePlan(saladPlan).trajectory.length)
		expect(snapshots.length).toBeGreaterThan(0)
	})

	it('emits the mesh frames as transforms carrying a mesh physicalObject', () => {
		const scoop = snapshots[0]!.transforms.find(
			(t) => t.referenceFrame === 'scoop-gripper:scoop_left'
		)
		expect(scoop).toBeDefined()
		expect(scoop!.physicalObject).toBeDefined()
		expect(scoop!.physicalObject!.geometryType.case).toBe('mesh')
	})

	it('still carries geometry for frames the builder understands', () => {
		const withGeometry = snapshots[0]!.transforms.filter((t) => t.physicalObject !== undefined)
		expect(withGeometry.length).toBeGreaterThan(0)
	})
})

/**
 * Transforms carry a pose in their parent's frame, so a claim about where a frame ends up is a claim
 * about the whole chain. Composing it here is what lets these tests quote RDK's own expected points
 * instead of ours.
 */
const worldPointOf = (transforms: Transform[], frame: string): Vector3 => {
	const byName = new Map(transforms.map((t) => [t.referenceFrame, t]))

	const chain: PoseInFrame[] = []
	for (let name = frame; byName.has(name); ) {
		const parented = byName.get(name)!.poseInObserverFrame!
		chain.unshift(parented)
		name = parented.referenceFrame
	}

	const point = new Vector3()
	const rotation = new Quaternion()
	const local = new Quaternion()
	const ov = new OrientationVector()

	for (const { pose } of chain) {
		point.add(new Vector3(pose!.x, pose!.y, pose!.z).applyQuaternion(rotation))
		ov.set(pose!.oX, pose!.oY, pose!.oZ, MathUtils.degToRad(pose!.theta))
		rotation.multiply(ov.toQuaternion(local))
	}

	return point
}

/**
 * A mimic joint moves but has no column of its own, so a step is shorter than the model's joint list
 * and reading it positionally walks off the end. Both models are byte-for-byte copies of
 * `referenceframe/testfiles/`, and every point below is one RDK's own tests assert
 * (`referenceframe/model_test.go:407,453`) — so what is being checked is agreement with RDK, not
 * self-consistency.
 */
describe('parsedPlanToSnapshots with a model whose joints mimic', () => {
	// RDK: 1 DoF. Opening to 25 mm drives both fingers, the right one through its mimic.
	describe("the gripper's two fingers off one column", () => {
		const [snapshot] = parsedPlanToSnapshots(
			rdkModelPlan(gripperModel, [{ test_mimic_gripper: [25] }])
		)
		const point = (frame: string) =>
			worldPointOf(snapshot!.transforms, `test_mimic_gripper:${frame}`)

		it('opens them symmetrically about the axis they share', () => {
			expect(point('left_finger').y).toBeCloseTo(25, 6)
			expect(point('right_finger').y).toBeCloseTo(-25, 6)
		})

		it('leaves the tcp where a static link belongs, clear of the joints', () => {
			expect(point('tcp').toArray()).toEqual([0, 0, 30])
		})
	})

	// RDK: 2 DoF. joint3 mimics joint1 at -1, so at joint1 = +90° it folds back by the same angle and
	// the tip comes to rest at (200, 0, 100) rather than continuing round to (300, 0, 0).
	describe("the serial arm's third joint driven from its first", () => {
		const steps = [{ test_mimic_serial: [0, 0] }, { test_mimic_serial: [Math.PI / 2, 0] }]
		const snapshots = parsedPlanToSnapshots(rdkModelPlan(serialModel, steps))
		const tipAt = (step: number) =>
			worldPointOf(snapshots[step]!.transforms, 'test_mimic_serial:link3')

		it('stacks the three links when every joint is at zero', () => {
			expect(tipAt(0).toArray()).toEqual([0, 0, 300])
		})

		it('folds the mimic back through the angle its source turned', () => {
			const tip = tipAt(1)
			expect(tip.x).toBeCloseTo(200, 6)
			expect(tip.y).toBeCloseTo(0, 6)
			expect(tip.z).toBeCloseTo(100, 6)
		})
	})
})
