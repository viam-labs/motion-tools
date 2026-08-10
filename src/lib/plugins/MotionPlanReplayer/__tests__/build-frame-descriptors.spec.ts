import { afterEach, describe, expect, it, vi } from 'vitest'

import type { ParsedPlan } from '../parse-plan'

import { buildFrameDescriptors } from '../build-frame-descriptors'
import { parsePlan } from '../parse-plan'
import gantryPlan from './__fixtures__/gantry-plan.json?raw'
import pirouettePlan from './__fixtures__/pirouette-plan.json?raw'
import planDump from './__fixtures__/plan.json?raw'
import saladPlan from './__fixtures__/salad-plan.json?raw'

const plan = (frames: ParsedPlan['frames'], parents: ParsedPlan['parents']): ParsedPlan => ({
	frames,
	parents,
	trajectory: [],
	goals: [],
	obstaclesInWorldFrame: undefined,
	worldState: undefined,
})

/**
 * An equivalence check across every capture at once, not a regression gate: a frame parented to a
 * bare model name has to land on that model's declared `primary_output_frame`, read here straight
 * out of the dump rather than from a snapshot, so a wrong answer names itself instead of showing up
 * as a diff nobody can adjudicate. `gantry-plan` contributes nothing, which is why the count is
 * asserted across the set rather than per file.
 *
 * It cannot tell the rungs apart, and is not meant to. On all 29 captured model frames the declared
 * value, the sole leaf and the last declared link are the same string, so every rung reproduces the
 * same answer and this passes with any one of them deleted. What it catches is a ladder that stops
 * resolving a terminal at all. The rung-by-rung tests are in `model output frame` below.
 */
describe('captured plans', () => {
	it('resolve every model-parented frame to that model`s declared output frame', () => {
		let checked = 0

		for (const raw of [gantryPlan, pirouettePlan, planDump, saladPlan]) {
			const parsed = parsePlan(raw)
			const parentByName = new Map(buildFrameDescriptors(parsed).map((d) => [d.name, d.parent]))

			for (const [child, rawParent] of Object.entries(parsed.parents)) {
				const model = parsed.frames[rawParent]
				if (model?.frame_type !== 'model') continue

				const declared = (model.frame as Record<string, unknown>).primary_output_frame
				expect(parentByName.get(child)).toBe(`${rawParent}:${declared as string}`)
				checked += 1
			}
		}

		expect(checked).toBe(14)
	})
})

// Identity is right for an absent orientation and wrong for an unrecognised one; both halves matter,
// since a warning on every pure translation would be as useless as none.
describe('unrecognised orientation encodings', () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
	afterEach(() => warn.mockClear())

	const framed = (orientation: unknown, geometry?: unknown): ParsedPlan =>
		plan(
			{
				'arm:link': {
					frame_type: 'named',
					frame: {
						inner_frame: {
							frame_type: 'static',
							frame: { translation: { X: 0, Y: 0, Z: 267 }, orientation, geometry },
						},
					},
				},
			},
			{ 'arm:link': 'world' }
		)

	it('warns and falls back to identity for a type it has no conversion for', () => {
		const descriptors = buildFrameDescriptors(framed({ type: 'made_up', value: { th: 1 } }))

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('unhandled orientation "made_up"'))
		const d = descriptors[0]!
		expect(d.kind).toBe('static')
		if (d.kind === 'static') {
			expect(d.localPose.z).toBeCloseTo(267)
			expect(d.localPose.theta).toBeCloseTo(0)
		}
	})

	it('stays silent when orientation is absent — a pure translation is not a defect', () => {
		buildFrameDescriptors(framed(undefined))
		expect(warn).not.toHaveBeenCalled()
	})

	// RDK's NoOrientationType is "" and means identity.
	it("stays silent for RDK's empty-string orientation type", () => {
		buildFrameDescriptors(framed({ type: '', value: {} }))
		expect(warn).not.toHaveBeenCalled()
	})

	// Guarded by `hasOrientJson`, so a warn placed only in `quatFromJson` would miss this path.
	// `rotation_matrix` is a real spatialmath type that `NewOrientationConfig` refuses to marshal,
	// so it stands in for an encoding this file will never convert.
	it('warns for an unrecognised orientation on a geometry, not just on a frame', () => {
		buildFrameDescriptors(
			framed(
				{ type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
				{
					type: 'box',
					x: 10,
					y: 10,
					z: 10,
					translation: { X: 0, Y: 0, Z: 0 },
					orientation: { type: 'rotation_matrix', value: { rows: [] } },
				}
			)
		)

		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('unhandled orientation "rotation_matrix"')
		)
	})
})

// Neither switch had a fallthrough, so an unregistered or unbuilt frame type produced no descriptor
// and no output — the frame simply wasn't in the scene.
describe('unhandled frame types', () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
	afterEach(() => warn.mockClear())

	it('warns and emits nothing for an unregistered outer frame type', () => {
		const descriptors = buildFrameDescriptors(
			plan({ 'arm:thing': { frame_type: 'pose', frame: {} } }, { 'arm:thing': 'world' })
		)

		expect(descriptors).toHaveLength(0)
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('unhandled frame type "pose" on "arm:thing"')
		)
	})

	// The inner switch needs its own fallthrough — a `named` wrapper around something unregistered
	// would otherwise be dropped by the inner branch even though the outer one matched.
	it('warns and emits nothing for an unregistered type inside a named frame', () => {
		const descriptors = buildFrameDescriptors(
			plan(
				{
					'arm:thing': {
						frame_type: 'named',
						frame: { inner_frame: { frame_type: 'pose', frame: {} } },
					},
				},
				{ 'arm:thing': 'world' }
			)
		)

		expect(descriptors).toHaveLength(0)
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('unhandled frame type "pose" on "arm:thing"')
		)
	})

	it.each([
		['salad-plan', saladPlan],
		['gantry-plan', gantryPlan],
	])('stays silent for the frame types %s contains', (_name, capture) => {
		buildFrameDescriptors(parsePlan(capture))
		expect(warn).not.toHaveBeenCalled()
	})
})

describe('buildFrameDescriptors', () => {
	it('produces a static descriptor for a named static frame', () => {
		const p = plan(
			{
				'arm:link': {
					frame_type: 'named',
					frame: {
						inner_frame: {
							frame_type: 'static',
							frame: {
								translation: { X: 0, Y: 0, Z: 267 },
								orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
							},
						},
					},
				},
			},
			{ 'arm:link': 'world' }
		)
		const descriptors = buildFrameDescriptors(p)
		expect(descriptors).toHaveLength(1)
		const d = descriptors[0]!
		expect(d.kind).toBe('static')
		if (d.kind === 'static') {
			expect(d.name).toBe('arm:link')
			expect(d.parent).toBe('world')
			expect(d.localPose.z).toBeCloseTo(267)
			expect(d.geometry).toBeNull()
		}
	})

	it('joint frames emit joint descriptors; link frames emit static descriptors parented to their joint', () => {
		// arm chain: arm:base (static) → arm:waist (joint, Z) → arm:base_top (static link)
		//            arm:base_top → arm:shoulder (joint, Y) → arm:upper_arm (static link)
		const p = plan(
			{
				arm: {
					frame_type: 'model',
					frame: { name: 'arm', model: { joints: [{ id: 'waist' }, { id: 'shoulder' }] } },
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
				'arm:shoulder': {
					frame_type: 'named',
					frame: {
						inner_frame: {
							frame_type: 'rotational',
							frame: { axis: { X: 0, Y: 1, Z: 0 } },
						},
					},
				},
				'arm:base_top': {
					frame_type: 'named',
					frame: {
						inner_frame: {
							frame_type: 'static',
							frame: {
								translation: { X: 0, Y: 0, Z: 267 },
								orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
							},
						},
					},
				},
				'arm:upper_arm': {
					frame_type: 'named',
					frame: {
						inner_frame: {
							frame_type: 'static',
							frame: {
								translation: { X: 53.5, Y: 0, Z: 284.5 },
								orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
							},
						},
					},
				},
			},
			{
				'arm:waist': 'arm:base',
				'arm:shoulder': 'arm:base_top',
				'arm:base_top': 'arm:waist',
				'arm:upper_arm': 'arm:shoulder',
			}
		)
		const descriptors = buildFrameDescriptors(p)

		// Joint frames appear as joint descriptors
		const waist = descriptors.find((d) => d.name === 'arm:waist')!
		expect(waist).toBeDefined()
		expect(waist.kind).toBe('joint')
		if (waist.kind === 'joint') {
			expect(waist.parent).toBe('arm:base')
			expect(waist.componentName).toBe('arm')
			expect(waist.jointIndex).toBe(0)
			expect(waist.axis).toEqual({ X: 0, Y: 0, Z: 1 })
		}

		const shoulder = descriptors.find((d) => d.name === 'arm:shoulder')!
		expect(shoulder).toBeDefined()
		expect(shoulder.kind).toBe('joint')
		if (shoulder.kind === 'joint') {
			expect(shoulder.parent).toBe('arm:base_top')
			expect(shoulder.componentName).toBe('arm')
			expect(shoulder.jointIndex).toBe(1)
			expect(shoulder.axis).toEqual({ X: 0, Y: 1, Z: 0 })
		}

		// Link frames appear as static descriptors parented directly to their joint
		const baseTop = descriptors.find((d) => d.name === 'arm:base_top')!
		expect(baseTop).toBeDefined()
		expect(baseTop.kind).toBe('static')
		if (baseTop.kind === 'static') {
			expect(baseTop.parent).toBe('arm:waist') // parented to the joint, not the joint's parent
			expect(baseTop.localPose.z).toBeCloseTo(267)
		}

		const upperArm = descriptors.find((d) => d.name === 'arm:upper_arm')!
		expect(upperArm).toBeDefined()
		expect(upperArm.kind).toBe('static')
		if (upperArm.kind === 'static') {
			expect(upperArm.parent).toBe('arm:shoulder')
			expect(upperArm.localPose.x).toBeCloseTo(53.5)
			expect(upperArm.localPose.z).toBeCloseTo(284.5)
		}
	})

	/**
	 * Where a model hands off its children, one test per rung of the ladder. Each declares `links` in
	 * an order that array position would answer differently from, so the new rule and the old one are
	 * distinguishable — the previous version of this test could not tell them apart, because its last
	 * link was also its output frame. A URDF arm's link order really is arbitrary: RDK collects links
	 * into a Go map and ranges it into a slice, and map iteration is randomised per range statement.
	 *
	 * See `armed` below for the second thing these have to avoid, which is subtler: the fallback that
	 * catches an unanswered ladder must not agree with the rung under test either.
	 */
	describe('model output frame', () => {
		const staticFrame = {
			frame_type: 'named',
			frame: {
				inner_frame: {
					frame_type: 'static',
					frame: {
						translation: { X: 0, Y: 0, Z: 0 },
						orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
					},
				},
			},
		}

		const camera = {
			frame_type: 'static',
			frame: {
				translation: { X: 10, Y: 0, Z: 0 },
				orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
			},
		}

		const rotational = {
			frame_type: 'named',
			frame: { inner_frame: { frame_type: 'rotational', frame: { axis: { X: 0, Y: 0, Z: 1 } } } },
		}

		/**
		 * `extra_link` is declared *before* `gripper_mount` on purpose. When no rung of the ladder
		 * answers, `buildFrameContexts` falls through to the first child of the last joint, and that
		 * child is whichever one this map lists first. Listing `gripper_mount` first made the fallback
		 * produce the same answer every rung below was asserting, so four of the five tests here
		 * passed with the rung they are named after deleted. With the order flipped the fallback says
		 * `arm:extra_link`, which no rung test expects, so each one now fails when its rung goes.
		 */
		const armed = (frame: Record<string, unknown>): ParsedPlan =>
			plan(
				{
					arm: { frame_type: 'model', frame },
					'arm:gripper_rot': rotational,
					'arm:extra_link': staticFrame,
					'arm:gripper_mount': staticFrame,
					camera_origin: camera,
				},
				{
					'arm:gripper_rot': 'arm:base',
					'arm:extra_link': 'arm:gripper_rot',
					'arm:gripper_mount': 'arm:gripper_rot',
					camera_origin: 'arm',
				}
			)

		const parentOfCamera = (p: ParsedPlan): string | undefined =>
			buildFrameDescriptors(p).find((d) => d.name === 'camera_origin')?.parent

		// RDK puts this on the SimpleModel envelope, a sibling of `model`. All four captures have it
		// there; none has it inside `model`, so reading it off `model` never found it.
		it('reads primary_output_frame off the model envelope, not out of `model`', () => {
			const p = armed({
				name: 'arm',
				primary_output_frame: 'gripper_mount',
				model: {
					joints: [{ id: 'gripper_rot', parent: 'base' }],
					links: [
						{ id: 'gripper_mount', parent: 'gripper_rot' },
						{ id: 'extra_link', parent: 'gripper_rot' },
					],
				},
			})

			expect(parentOfCamera(p)).toBe('arm:gripper_mount')
		})

		// `ModelConfigJSON` has no primary_output_frame — `output_frames` is its analogue, and RDK
		// refuses to build a model that declares more than one.
		it('falls back to the model config`s own output_frames', () => {
			const p = armed({
				name: 'arm',
				model: {
					output_frames: ['gripper_mount'],
					joints: [{ id: 'gripper_rot', parent: 'base' }],
					links: [
						{ id: 'gripper_mount', parent: 'gripper_rot' },
						{ id: 'extra_link', parent: 'gripper_rot' },
					],
				},
			})

			expect(parentOfCamera(p)).toBe('arm:gripper_mount')
		})

		// RDK's own rule when nothing is declared. `extra_link` is declared last but is not the tip.
		it('falls back to the model`s sole childless frame rather than its last link', () => {
			const p = armed({
				name: 'arm',
				model: {
					joints: [{ id: 'gripper_rot', parent: 'extra_link' }],
					links: [
						{ id: 'gripper_mount', parent: 'gripper_rot' },
						{ id: 'extra_link', parent: 'base' },
					],
				},
			})

			expect(parentOfCamera(p)).toBe('arm:gripper_mount')
		})

		// The leaf can be a joint, which the old array-position fallback could never name.
		it('accepts a joint as the terminal frame', () => {
			const p = armed({
				name: 'arm',
				model: {
					joints: [{ id: 'gripper_rot', parent: 'extra_link' }],
					links: [{ id: 'extra_link', parent: 'base' }],
				},
			})

			expect(parentOfCamera(p)).toBe('arm:gripper_rot')
		})

		// Ambiguous shapes must not guess; the last-joint-child path still covers them. `gripper_mount`
		// is the first leaf in declaration order, so picking `leaves[0]` rather than refusing would
		// answer `arm:gripper_mount` and this fails.
		it('declines to pick when a model has more than one childless frame', () => {
			const p = armed({
				name: 'arm',
				model: {
					joints: [{ id: 'gripper_rot', parent: 'base' }],
					links: [
						{ id: 'gripper_mount', parent: 'gripper_rot' },
						{ id: 'extra_link', parent: 'gripper_rot' },
					],
				},
			})

			// Falls through to "what hangs off the last joint", which is insertion-ordered.
			expect(parentOfCamera(p)).toBe('arm:extra_link')
		})

		// A bare string would otherwise be indexed as an array and yield its first character, which
		// the `typeof === 'string'` check downstream would accept.
		it('ignores an output_frames that is not an array', () => {
			const p = armed({
				name: 'arm',
				model: {
					output_frames: 'gripper_mount',
					joints: [{ id: 'gripper_rot', parent: 'extra_link' }],
					links: [
						{ id: 'gripper_mount', parent: 'gripper_rot' },
						{ id: 'extra_link', parent: 'base' },
					],
				},
			})

			// Falls to the sole-leaf rule rather than resolving to `arm:g`.
			expect(parentOfCamera(p)).toBe('arm:gripper_mount')
		})
	})

	it('remaps frames parented to a model frame to the terminal static frame', () => {
		// camera is parented to the model frame 'arm' (never an ECS entity).
		// It should be reparented to 'arm:gripper_mount' (static frame after the last joint).
		const p = plan(
			{
				arm: {
					frame_type: 'model',
					frame: { name: 'arm', model: { joints: [{ id: 'waist' }, { id: 'gripper_rot' }] } },
				},
				'arm:gripper_rot': {
					frame_type: 'named',
					frame: {
						inner_frame: { frame_type: 'rotational', frame: { axis: { X: 0, Y: 0, Z: 1 } } },
					},
				},
				'arm:gripper_mount': {
					frame_type: 'named',
					frame: {
						inner_frame: {
							frame_type: 'static',
							frame: {
								translation: { X: 0, Y: 0, Z: 0 },
								orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
							},
						},
					},
				},
				camera_origin: {
					frame_type: 'static',
					frame: {
						translation: { X: 10, Y: 0, Z: 0 },
						orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
					},
				},
			},
			{
				'arm:gripper_mount': 'arm:gripper_rot',
				camera_origin: 'arm', // model frame — should be remapped
			}
		)
		const descriptors = buildFrameDescriptors(p)
		const camera = descriptors.find((d) => d.name === 'camera_origin')!
		expect(camera).toBeDefined()
		expect(camera.parent).toBe('arm:gripper_mount') // remapped from 'arm'
	})

	it('skips model frames', () => {
		const p = plan(
			{ arm: { frame_type: 'model', frame: { name: 'arm', model: { joints: [] } } } },
			{}
		)
		expect(buildFrameDescriptors(p)).toHaveLength(0)
	})

	it('parses capsule geometry from a static frame', () => {
		const p = plan(
			{
				'arm:link': {
					frame_type: 'named',
					frame: {
						inner_frame: {
							frame_type: 'static',
							frame: {
								translation: { X: 0, Y: 0, Z: 0 },
								orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
								geometry: {
									type: 'capsule',
									r: 50,
									l: 320,
									translation: { X: 0, Y: 0, Z: 160 },
									orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
									Label: 'link',
								},
							},
						},
					},
				},
			},
			{ 'arm:link': 'world' }
		)
		const descriptors = buildFrameDescriptors(p)
		const d = descriptors[0]!
		if (d.kind === 'static') {
			expect(d.geometry).not.toBeNull()
			expect(d.geometry!.geometryType.case).toBe('capsule')
			if (d.geometry!.geometryType.case === 'capsule') {
				expect(d.geometry!.geometryType.value.radiusMm).toBe(50)
				expect(d.geometry!.geometryType.value.lengthMm).toBe(320)
			}
			expect(d.geometry!.center!.z).toBeCloseTo(160)
		}
	})

	it('subtracts frame translation from parent-frame geometry center (xArm6 base_top)', () => {
		const p = plan(
			{
				'arm:base_top': {
					frame_type: 'named',
					frame: {
						inner_frame: {
							frame_type: 'static',
							frame: {
								translation: { X: 0, Y: 0, Z: 267 },
								orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
								geometry: {
									type: 'capsule',
									r: 50,
									l: 320,
									translation: { X: 0, Y: 0, Z: 160 },
									orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
									Label: 'base_top',
								},
							},
						},
					},
				},
			},
			{ 'arm:base_top': 'arm:waist' }
		)
		const d = buildFrameDescriptors(p)[0]!
		if (d.kind === 'static') {
			expect(d.localPose.z).toBeCloseTo(267)
			// geo z=160 and frame z=267 both in parent (waist) → local center 107mm below frame
			expect(d.geometry!.center!.z).toBeCloseTo(-107)
		}
	})

	it('rotates parent-frame geometry offset into link-local coords (xArm850 link_2)', () => {
		const p = plan(
			{
				'left-arm:link_2': {
					frame_type: 'named',
					frame: {
						inner_frame: {
							frame_type: 'static',
							frame: {
								translation: { X: 390, Y: 0, Z: 0 },
								orientation: {
									type: 'quaternion',
									value: {
										W: -2.5973434669646147e-6,
										X: -0.7071054825064661,
										Y: 0.7071080798547033,
										Z: 2.597353007557415e-6,
									},
								},
								geometry: {
									type: 'box',
									x: 500.07,
									y: 119.987,
									z: 161.805,
									translation: { X: 189.857, Y: 0, Z: 31.0907 },
									orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
									Label: 'link_2',
								},
							},
						},
					},
				},
			},
			{ 'left-arm:link_2': 'left-arm:joint_2' }
		)
		const d = buildFrameDescriptors(p)[0]!
		if (d.kind === 'static') {
			expect(d.localPose.x).toBeCloseTo(390)
			// R_frame⁻¹ * (geo − frame): not a naive component-wise subtract
			expect(d.geometry!.center!.x).toBeCloseTo(0, 1)
			expect(d.geometry!.center!.y).toBeCloseTo(200.143, 1)
			expect(d.geometry!.center!.z).toBeCloseTo(-31.0907, 1)
		}
	})

	it('parses euler_angles orientation on a static frame (not identity)', () => {
		const p = plan(
			{
				'arm:link': {
					frame_type: 'named',
					frame: {
						inner_frame: {
							frame_type: 'static',
							frame: {
								translation: { X: 0, Y: 0, Z: 0 },
								// 90 degree yaw about Z
								orientation: {
									type: 'euler_angles',
									value: { roll: 0, pitch: 0, yaw: Math.PI / 2 },
								},
							},
						},
					},
				},
			},
			{ 'arm:link': 'world' }
		)
		const d = buildFrameDescriptors(p)[0]!
		if (d.kind === 'static') {
			// Identity would be oX:0 oY:0 oZ:1 theta:0 — assert it's not identity and
			// specifically a 90 degree rotation about Z.
			expect(d.localPose.theta).toBeCloseTo(90)
			expect(d.localPose.oZ).toBeCloseTo(1)
		}
	})

	// Equivalence against an encoding already covered, rather than hand-computed components: the
	// claim is that RDK's five orientation types agree, not that a quaternion literal is right.
	it('parses axis_angles to the same rotation as the equivalent quaternion', () => {
		const staticFrame = (orientation: unknown): ParsedPlan =>
			plan(
				{
					'arm:link': {
						frame_type: 'named',
						frame: {
							inner_frame: {
								frame_type: 'static',
								frame: { translation: { X: 0, Y: 0, Z: 0 }, orientation },
							},
						},
					},
				},
				{ 'arm:link': 'world' }
			)

		// 90° about Z, written both ways.
		const viaAxis = buildFrameDescriptors(
			staticFrame({ type: 'axis_angles', value: { th: Math.PI / 2, x: 0, y: 0, z: 1 } })
		)[0]!
		const viaQuat = buildFrameDescriptors(
			staticFrame({
				type: 'quaternion',
				value: { W: Math.SQRT1_2, X: 0, Y: 0, Z: Math.SQRT1_2 },
			})
		)[0]!

		if (viaAxis.kind === 'static' && viaQuat.kind === 'static') {
			expect(viaAxis.localPose.theta).toBeCloseTo(viaQuat.localPose.theta)
			expect(viaAxis.localPose.oX).toBeCloseTo(viaQuat.localPose.oX)
			expect(viaAxis.localPose.oY).toBeCloseTo(viaQuat.localPose.oY)
			expect(viaAxis.localPose.oZ).toBeCloseTo(viaQuat.localPose.oZ)
			// Guard against the pair agreeing by both collapsing to identity.
			expect(viaAxis.localPose.theta).toBeCloseTo(90)
		}

		// setFromAxisAngle assumes a unit axis; RDK does not guarantee one on the wire.
		const viaLongAxis = buildFrameDescriptors(
			staticFrame({ type: 'axis_angles', value: { th: Math.PI / 2, x: 0, y: 0, z: 7 } })
		)[0]!
		if (viaLongAxis.kind === 'static' && viaAxis.kind === 'static') {
			expect(viaLongAxis.localPose.theta).toBeCloseTo(viaAxis.localPose.theta)
			expect(viaLongAxis.localPose.oZ).toBeCloseTo(viaAxis.localPose.oZ)
		}
	})

	it('parses euler_angles on link frame and rotates geometry orient into local coords', () => {
		// link_1 from salad: 90° fixed rotation with geometry offset in parent frame
		const p = plan(
			{
				'left-arm:link_1': {
					frame_type: 'named',
					frame: {
						inner_frame: {
							frame_type: 'static',
							frame: {
								translation: { X: 0, Y: 0, Z: 0 },
								orientation: {
									type: 'euler_angles',
									value: { roll: 1.5708, pitch: -1.5708, yaw: 0 },
								},
								geometry: {
									type: 'box',
									x: 120.619,
									y: 185.133,
									z: 238.5,
									translation: { X: 0, Y: 32.5667, Z: -59.25 },
									orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
									Label: 'link_1',
								},
							},
						},
					},
				},
			},
			{ 'left-arm:link_1': 'left-arm:joint_1' }
		)
		const d = buildFrameDescriptors(p)[0]!
		if (d.kind === 'static') {
			expect(d.localPose.theta).not.toBeCloseTo(0)
			// geometry center offset is rotated into link-local, not left in parent Y/Z
			expect(d.geometry!.center!.x).toBeCloseTo(-59.25, 1)
			expect(d.geometry!.center!.y).toBeCloseTo(0, 1)
			expect(d.geometry!.center!.z).toBeCloseTo(-32.5667, 1)
		}
	})

	it('parses ov_degrees orientation on a static frame', () => {
		const p = plan(
			{
				'arm:link': {
					frame_type: 'named',
					frame: {
						inner_frame: {
							frame_type: 'static',
							frame: {
								translation: { X: 0, Y: 0, Z: 0 },
								orientation: { type: 'ov_degrees', value: { x: 0, y: 0, z: 1, th: 90 } },
							},
						},
					},
				},
			},
			{ 'arm:link': 'world' }
		)
		const d = buildFrameDescriptors(p)[0]!
		if (d.kind === 'static') {
			expect(d.localPose.theta).toBeCloseTo(90)
			expect(d.localPose.oZ).toBeCloseTo(1)
		}
	})

	it('returns null geometry when the frame carries none (RDK writes an empty type)', () => {
		const p = plan(
			{
				'arm:link': {
					frame_type: 'named',
					frame: {
						inner_frame: {
							frame_type: 'static',
							frame: {
								translation: { X: 0, Y: 0, Z: 0 },
								orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
								geometry: { type: '', r: 1, l: 0 },
							},
						},
					},
				},
			},
			{ 'arm:link': 'world' }
		)
		const descriptors = buildFrameDescriptors(p)
		const d = descriptors[0]!
		if (d.kind === 'static') expect(d.geometry).toBeNull()
	})

	const obstacleWith = (geometry: Record<string, unknown>) =>
		plan(
			{
				obstacle: {
					frame_type: 'static',
					frame: {
						translation: { X: 0, Y: 0, Z: 0 },
						orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
						geometry,
					},
				},
			},
			{ obstacle: 'world' }
		)

	const obstacleGeometry = (geometry: Record<string, unknown>) => {
		const d = buildFrameDescriptors(obstacleWith(geometry)).find((x) => x.name === 'obstacle')
		expect(d).toBeDefined()
		expect(d!.kind).toBe('static')
		return d!.kind === 'static' ? d!.geometry : null
	}

	it('skips an unsupported geometry type but keeps the frame', () => {
		// Rendering nothing is honest; a stand-in box would lie about the collision volume.
		expect(obstacleGeometry({ type: 'ellipsoid', x: 1, y: 2, z: 3 })).toBeNull()
	})

	it('reads a mesh geometry into the proto mesh case', () => {
		const ply = 'ply\nformat ascii 1.0\nelement vertex 0\nend_header\n'
		const geometry = obstacleGeometry({
			type: 'mesh',
			mesh_content_type: 'ply',
			mesh_data: btoa(ply),
			Label: 'scoop',
		})

		expect(geometry).not.toBeNull()
		expect(geometry!.geometryType.case).toBe('mesh')
		expect(geometry!.label).toBe('scoop')
		if (geometry!.geometryType.case === 'mesh') {
			// A bad base64 swap shows up here and nowhere else.
			expect(geometry!.geometryType.value.contentType).toBe('ply')
			expect(geometry!.geometryType.value.mesh).toEqual(new TextEncoder().encode(ply))
		}
	})

	// An empty payload would spawn an entity that renders nothing but still costs a draw pass.
	// Undecodable data must skip too: protoBase64 throws, and an escaping error would fail
	// the entire plan rather than the one shape.
	it.each([
		['a non-PLY content type', { mesh_content_type: 'obj', mesh_data: btoa('solid\n') }],
		['a missing content type', { mesh_data: btoa('ply\n') }],
		['empty mesh data', { mesh_content_type: 'ply', mesh_data: '' }],
		['absent mesh data', { mesh_content_type: 'ply' }],
		['undecodable mesh data', { mesh_content_type: 'ply', mesh_data: '!!!not base64!!!' }],
	])('skips a mesh with %s', (_label, geometry) => {
		expect(obstacleGeometry({ type: 'mesh', ...geometry })).toBeNull()
	})

	it('keeps the rest of the plan when one mesh fails to decode', () => {
		const p = plan(
			{
				obstacle: {
					frame_type: 'static',
					frame: {
						translation: { X: 0, Y: 0, Z: 0 },
						orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
						geometry: { type: 'mesh', mesh_content_type: 'ply', mesh_data: 'not base64' },
					},
				},
				table: {
					frame_type: 'static',
					frame: {
						translation: { X: 0, Y: 0, Z: 0 },
						orientation: { type: 'quaternion', value: { W: 1, X: 0, Y: 0, Z: 0 } },
						geometry: { type: 'box', x: 1, y: 2, z: 3 },
					},
				},
			},
			{ obstacle: 'world', table: 'world' }
		)

		expect(() => buildFrameDescriptors(p)).not.toThrow()
		const table = buildFrameDescriptors(p).find((d) => d.name === 'table')
		expect(table?.kind === 'static' && table.geometry?.geometryType.case).toBe('box')
	})
})

/**
 * `salad-plan.json` is an unmodified capture, so these assertions cover the payload shape
 * RDK actually emits rather than one we invented.
 */
describe('buildFrameDescriptors with a captured mesh-geometry plan', () => {
	const parsed = parsePlan(saladPlan)

	it('builds descriptors without rejecting the plan', () => {
		expect(() => buildFrameDescriptors(parsed)).not.toThrow()
		expect(buildFrameDescriptors(parsed).length).toBeGreaterThan(0)
	})

	it.each([
		['scoop-gripper:scoop_left', 'scoop_left'],
		['scoop-gripper:scoop_right', 'scoop_right'],
	])('resolves %s to a mesh geometry', (name, label) => {
		const d = buildFrameDescriptors(parsed).find((x) => x.name === name)

		expect(d).toBeDefined()
		expect(d!.kind).toBe('static')
		if (d!.kind !== 'static') return

		expect(d!.geometry).not.toBeNull()
		expect(d!.geometry!.geometryType.case).toBe('mesh')
		expect(d!.geometry!.label).toBe(label)
		if (d!.geometry!.geometryType.case !== 'mesh') return

		const { contentType, mesh } = d!.geometry!.geometryType.value
		expect(contentType).toBe('ply')
		expect(mesh.length).toBeGreaterThan(0)

		// parsePlyInput sniffs the first 50 bytes for `format ascii` to pick its branch.
		const header = new TextDecoder().decode(mesh.slice(0, 50))
		expect(header.startsWith('ply')).toBe(true)
		expect(header).toContain('format ascii')
	})

	it('keeps the mesh center frame-relative', () => {
		const d = buildFrameDescriptors(parsed).find((x) => x.name === 'scoop-gripper:scoop_left')

		// Guards against the mesh branch bypassing geometryCenterInFrame on its way to the bytes.
		if (d?.kind === 'static') expect(d.geometry!.center!.x).toBeCloseTo(-42.6, 1)
	})

	it('still resolves geometry for the frames that use supported types', () => {
		const descriptors = buildFrameDescriptors(parsed)
		const boxes = descriptors.filter(
			(d) => d.kind === 'static' && d.geometry?.geometryType.case === 'box'
		)

		expect(boxes.length).toBeGreaterThan(0)
	})
})
