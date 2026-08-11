import { Struct } from '@bufbuild/protobuf'
import { commonApi, Geometry, PoseInFrame, robotApi, Sphere, Transform } from '@viamrobotics/sdk'
import { describe, expect, it, vi } from 'vitest'

import { Geometry as LocalGeometry } from '$lib/buf/common/v1/common_pb'
import { Pose } from '$lib/math'
import { parsePlan } from '$lib/plugins/MotionPlanReplayer/parse-plan'

import type { FrameDescriptor } from '../frameDescriptors'

import planJson from '../../plugins/MotionPlanReplayer/__tests__/__fixtures__/plan.json?raw'
import { buildFrameDescriptors, DECODED_FRAME_TYPE } from '../frameDescriptors'
import { frameSystemToPlanFrames } from '../frameSystemToPlanFrames'

const dump = parsePlan(planJson)

/**
 * The `model` frame of a part in the dump holds the exact `ModelConfigJSON` that
 * `FrameSystemConfig.kinematics` carries, so a part can be reconstructed from the fixture rather
 * than hand-written — which is what makes the comparison below an equivalence test and not a
 * restatement of the implementation.
 */
const kinematicsFromDump = (partName: string): Struct => {
	const entry = dump.frames[partName]
	if (!entry || entry.frame_type !== 'model') {
		throw new Error(`fixture has no model frame named "${partName}"`)
	}
	const model = (entry.frame as { model: Record<string, unknown> }).model
	return Struct.fromJson(model as never)
}

const part = (options: {
	name: string
	parent?: string
	pose?: {
		x?: number
		y?: number
		z?: number
		oX?: number
		oY?: number
		oZ?: number
		theta?: number
	}
	kinematics?: Struct
	geometry?: Geometry
}): robotApi.FrameSystemConfig =>
	new robotApi.FrameSystemConfig({
		frame: new Transform({
			referenceFrame: options.name,
			poseInObserverFrame: new PoseInFrame({
				referenceFrame: options.parent ?? 'world',
				pose: { x: 0, y: 0, z: 0, oX: 0, oY: 0, oZ: 1, theta: 0, ...options.pose },
			}),
			physicalObject: options.geometry,
		}),
		kinematics: options.kinematics,
	})

const byName = (descriptors: FrameDescriptor[]) =>
	new Map(descriptors.map((descriptor) => [descriptor.name, descriptor]))

describe('parenting', () => {
	it('splits a part into a `_origin` mount and the part frame itself', () => {
		const { frames, parents } = frameSystemToPlanFrames([part({ name: 'cam', parent: 'table' })])

		expect(parents['cam_origin']).toBe('table')
		expect(parents['cam']).toBe('cam_origin')
		expect(Object.keys(frames).toSorted()).toEqual(['cam', 'cam_origin'])
	})

	it('defaults a part with no stated parent to the world root', () => {
		const parts = [
			new robotApi.FrameSystemConfig({ frame: new Transform({ referenceFrame: 'a' }) }),
		]
		expect(frameSystemToPlanFrames(parts).parents['a_origin']).toBe('world')
	})

	it('ignores a part named `world`, which has no offset of its own', () => {
		expect(frameSystemToPlanFrames([part({ name: 'world' })]).frames).toEqual({})
	})

	it('ignores a config with no frame at all', () => {
		expect(frameSystemToPlanFrames([new robotApi.FrameSystemConfig({})]).frames).toEqual({})
	})

	it('ignores a part whose frame name is empty', () => {
		const parts = [new robotApi.FrameSystemConfig({ frame: new Transform({ referenceFrame: '' }) })]
		expect(frameSystemToPlanFrames(parts).frames).toEqual({})
	})

	/**
	 * `||` rather than `??`, so an empty observer frame roots at the world too. RDK hard-errors on an
	 * empty frame name in both directions (`ErrEmptyStringFrameName`), including on the *parent*, so
	 * a reply carrying one never came from a healthy server - but `??` would pass it straight through
	 * as `parents[origin] = ''`, an unresolvable parent, where `||` keeps the rest of the scene
	 * drawable.
	 */
	it('roots a part at the world when its stated parent is the empty string', () => {
		const parts = [
			new robotApi.FrameSystemConfig({
				frame: new Transform({
					referenceFrame: 'a',
					poseInObserverFrame: new PoseInFrame({ referenceFrame: '' }),
				}),
			}),
		]
		expect(frameSystemToPlanFrames(parts).parents['a_origin']).toBe('world')
	})
})

/**
 * Holding the part's offset from its parent is the entire reason `p_origin` exists, and nothing
 * asserted it: every fixture in this file went through `part()`, which defaults the pose to
 * identity, so the pose could have been discarded or replaced outright without a failure.
 */
describe('the mount offset', () => {
	const pose = { x: 10, y: -20, z: 30, oX: 0, oY: 1, oZ: 0, theta: 90 }

	it('carries the part`s pose on its `_origin`', () => {
		const { frames } = frameSystemToPlanFrames([part({ name: 'cam', parent: 'table', pose })])
		const { pose: carried } = frames['cam_origin']!.frame as { pose: Pose }

		expect([carried.x, carried.y, carried.z]).toEqual([10, -20, 30])
		expect([carried.oX, carried.oY, carried.oZ, carried.theta]).toEqual([0, 1, 0, 90])
	})

	it('survives the descriptor builder onto the frame`s local pose', () => {
		const descriptors = byName(
			buildFrameDescriptors(frameSystemToPlanFrames([part({ name: 'cam', pose })]))
		)

		const origin = descriptors.get('cam_origin')
		expect(origin?.kind === 'static' && origin.localPose.x).toBe(10)
		expect(origin?.kind === 'static' && origin.localPose.theta).toBe(90)
	})

	// The bare part frame is a placeholder for descendants to hang off; the offset belongs to the
	// origin above it, and duplicating it there would apply it twice.
	it('leaves the bare part frame at identity', () => {
		const { frames } = frameSystemToPlanFrames([part({ name: 'cam', pose })])
		const { pose: bare } = frames['cam']!.frame as { pose: Pose }

		expect([bare.x, bare.y, bare.z, bare.theta]).toEqual([0, 0, 0, 0])
	})
})

/**
 * `originName` derives `<part>_origin` mechanically and nothing checks whether some other part in
 * the same reply is literally named that. A part `cam` and a part `cam_origin` both want the key
 * `frames['cam_origin']` — the first as its own mount-offset frame, the second as its own bare-part
 * frame — and until the guard under test existed, whichever was processed second silently overwrote
 * the first's mount offset and entire collision volume and reparented its descendants. Array order
 * decides which part comes first, and `cam` is listed first below.
 */
describe('a part named after another part`s generated origin', () => {
	const sphere = new Geometry({
		geometryType: { case: 'sphere', value: new Sphere({ radiusMm: 12 }) },
		label: 'cam-body',
	})

	it('keeps the earlier part`s mount offset and geometry, and warns and skips the collider', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		const { frames, parents } = frameSystemToPlanFrames([
			part({ name: 'cam', parent: 'table', geometry: sphere }),
			part({ name: 'cam_origin', parent: 'table' }),
		])

		// `cam`'s mount offset and geometry survive untouched.
		expect(parents['cam_origin']).toBe('table')
		const { geometry: carried } = frames['cam_origin']!.frame as { geometry: LocalGeometry | null }
		expect(carried?.geometryType.case).toBe('sphere')

		// The colliding part contributes nothing at all, not even its own origin.
		expect(frames['cam_origin_origin']).toBeUndefined()

		expect(warn).toHaveBeenCalledWith(expect.stringContaining('cam_origin'))
		warn.mockRestore()
	})
})

describe('geometry placement', () => {
	const sphere = new Geometry({
		geometryType: { case: 'sphere', value: new Sphere({ radiusMm: 12 }) },
		label: 'blob',
	})

	it('hangs a model-less part`s geometry on its `_origin`, matching RDK', () => {
		const descriptors = byName(
			buildFrameDescriptors(frameSystemToPlanFrames([part({ name: 'blob', geometry: sphere })]))
		)

		const origin = descriptors.get('blob_origin')
		expect(origin?.kind).toBe('static')
		expect(origin?.kind === 'static' && origin.geometry?.geometryType.case).toBe('sphere')

		// The bare part frame exists only so descendants have something to parent to.
		const bare = descriptors.get('blob')
		expect(bare?.kind === 'static' && bare.geometry).toBeNull()
	})

	/**
	 * Inverted from the assertion this file shipped with, which read "leaves a modelled part's
	 * geometry to its links rather than drawing it twice". RDK draws no such distinction:
	 * `createFramesFromPart` builds the `_origin` static frame from the part's frame config, and
	 * `ToStaticFrame` attaches the geometry, before either has looked at the model at all. A
	 * configured geometry on an arm is a safety envelope, and it was being dropped from the one view
	 * meant to show what a move would hit.
	 */
	it('hangs a modelled part`s geometry on its `_origin` too, matching RDK', () => {
		const descriptors = byName(
			buildFrameDescriptors(
				frameSystemToPlanFrames([
					part({ name: 'left-arm', kinematics: kinematicsFromDump('left-arm'), geometry: sphere }),
				])
			)
		)

		const origin = descriptors.get('left-arm_origin')
		expect(origin?.kind === 'static' && origin.geometry?.geometryType.case).toBe('sphere')
	})

	it('leaves the origin bare when the part configured no geometry', () => {
		const descriptors = byName(
			buildFrameDescriptors(
				frameSystemToPlanFrames([
					part({ name: 'left-arm', kinematics: kinematicsFromDump('left-arm') }),
				])
			)
		)

		const origin = descriptors.get('left-arm_origin')
		expect(origin?.kind === 'static' && origin.geometry).toBeNull()
	})
})

/**
 * The other half of the same RDK conditional, running the other way. Its predicate is
 * `len(modelFrame.DoF()) == 0 && len(offsetGeom.Geometries()) > 0` - degrees of freedom rather than
 * a joint count, which for an SVA model is the same thing - and when it holds,
 * `createFramesFromPart` replaces the model frame with a bare static one. The user's shape is meant
 * to *replace* the model's, not sit beside it. A static frame is not flattenable
 * (`asFlattenableModel` returns nil for one), so no `p:<link>` frames are published either.
 */
describe('a jointless model whose part configured a geometry', () => {
	const linksOnly = Struct.fromJson({
		name: 'grip',
		kinematic_param_type: 'SVA',
		links: [
			{
				id: 'body',
				parent: 'world',
				translation: { X: 0, Y: 0, Z: 40 },
				geometry: { x: 5, y: 5, z: 5, type: 'box' },
			},
		],
		joints: [],
	} as never)

	const envelope = new Geometry({
		geometryType: { case: 'sphere', value: new Sphere({ radiusMm: 80 }) },
		label: 'envelope',
	})

	it('draws the configured shape and none of the model`s links', () => {
		const descriptors = byName(
			buildFrameDescriptors(
				frameSystemToPlanFrames([part({ name: 'grip', kinematics: linksOnly, geometry: envelope })])
			)
		)

		const origin = descriptors.get('grip_origin')
		expect(origin?.kind === 'static' && origin.geometry?.geometryType.case).toBe('sphere')
		expect(descriptors.has('grip:body')).toBe(false)
	})

	it('still publishes the bare part frame for descendants to hang off', () => {
		const descriptors = byName(
			buildFrameDescriptors(
				frameSystemToPlanFrames([part({ name: 'grip', kinematics: linksOnly, geometry: envelope })])
			)
		)

		expect(descriptors.get('grip')?.kind).toBe('static')
	})

	/**
	 * The stand-in carries no geometry of its own. Putting the envelope on both it and `grip_origin`
	 * is the exact doubling this branch exists to prevent - the configured shape was meant to
	 * *replace* the model's, not join it - and it would report every contact twice.
	 */
	it('does not repeat the envelope on the stand-in frame', () => {
		const descriptors = byName(
			buildFrameDescriptors(
				frameSystemToPlanFrames([part({ name: 'grip', kinematics: linksOnly, geometry: envelope })])
			)
		)

		const bare = descriptors.get('grip')
		expect(bare?.kind === 'static' && bare.geometry).toBeNull()
	})

	// No configured geometry means nothing to replace the model with, so the links are drawn as usual.
	it('keeps the links when the part configured nothing', () => {
		const descriptors = byName(
			buildFrameDescriptors(
				frameSystemToPlanFrames([part({ name: 'grip', kinematics: linksOnly })])
			)
		)

		expect(descriptors.has('grip:body')).toBe(true)
	})
})

/**
 * Descriptors built from a synthesized frame system have to match the ones built from the frame
 * system RDK actually dumped, or a preview draws a different robot than the replayer does.
 *
 * What this can and cannot show is worth being precise about, because it reads stronger than it is:
 * both sides run through `buildFrameDescriptors`, so it compares the *synthesis* and holds
 * everything downstream fixed. A deterministic mistake in the descriptor builder appears identically
 * on both sides and cancels out — reversing the joint walk's sibling sort, an exact inversion of
 * this PR's headline fix, passes every assertion below. The two blocks that follow are the ones that
 * catch that, by comparing against hand-derived values and a branched model rather than against a
 * second run of the same code.
 */
describe('equivalence with a real plan dump', () => {
	const dumpDescriptors = byName(buildFrameDescriptors(dump))
	const synthesized = byName(
		buildFrameDescriptors(
			frameSystemToPlanFrames([
				part({ name: 'left-arm', kinematics: kinematicsFromDump('left-arm') }),
			])
		)
	)

	const armFrames = [...dumpDescriptors.keys()].filter((name) => name.startsWith('left-arm:'))

	it('reproduces every frame of the arm the dump contains', () => {
		expect(armFrames.length).toBeGreaterThan(10)
		expect(
			[...synthesized.keys()].filter((name) => name.startsWith('left-arm:')).toSorted()
		).toEqual(armFrames.toSorted())
	})

	it.each(['left-arm:base', 'left-arm:base_top', 'left-arm:upper_arm', 'left-arm:wrist_link'])(
		'places the static link %s identically',
		(name) => {
			const expected = dumpDescriptors.get(name)
			const actual = synthesized.get(name)

			expect(actual?.kind).toBe('static')
			expect(actual?.parent).toBe(expected?.parent)
			expect(actual?.kind === 'static' && actual.localPose).toEqual(
				expected?.kind === 'static' ? expected.localPose : undefined
			)
			expect(actual?.kind === 'static' && actual.geometry?.geometryType.case).toEqual(
				expected?.kind === 'static' ? expected.geometry?.geometryType.case : undefined
			)
		}
	)

	it.each(['left-arm:waist', 'left-arm:shoulder', 'left-arm:elbow', 'left-arm:wrist'])(
		'drives the joint %s from the same trajectory column',
		(name) => {
			const expected = dumpDescriptors.get(name)
			const actual = synthesized.get(name)

			expect(actual?.kind).toBe('joint')
			expect(actual?.parent).toBe(expected?.parent)
			expect(actual?.kind === 'joint' && actual.motion).toBe(
				expected?.kind === 'joint' ? expected.motion : undefined
			)
			expect(actual?.kind === 'joint' && actual.jointIndex).toBe(
				expected?.kind === 'joint' ? expected.jointIndex : undefined
			)
			expect(actual?.kind === 'joint' && actual.componentName).toBe('left-arm')
		}
	)

	it('roots the arm at the part`s own mount rather than the scene root', () => {
		// The dump parents `left-arm:base` to `left-arm_origin` because the link names `world` inside
		// the model, meaning "the model's mount". Getting this wrong plants the arm at the origin.
		expect(synthesized.get('left-arm:base')?.parent).toBe('left-arm_origin')
	})

	it('remaps a part parented to the arm onto the arm`s end effector', () => {
		const withCamera = byName(
			buildFrameDescriptors(
				frameSystemToPlanFrames([
					part({ name: 'left-arm', kinematics: kinematicsFromDump('left-arm') }),
					part({ name: 'left-cam', parent: 'left-arm' }),
				])
			)
		)

		// Not `left-arm` — that frame draws nothing, so anything left parented to it would hang off
		// the arm's mount and never move with the joints.
		expect(withCamera.get('left-cam_origin')?.parent).toBe(
			dumpDescriptors.get('left-cam_origin')?.parent
		)
		expect(withCamera.get('left-cam_origin')?.parent).toMatch(/^left-arm:/)
	})
})

/**
 * The same claim with the descriptor builder taken out of it: the frame system this file synthesizes
 * is compared to the one RDK dumped, directly. Nothing downstream can cancel a mistake here.
 */
describe('the synthesized frame system itself', () => {
	const armParentsIn = (parents: Record<string, string>) =>
		Object.fromEntries(Object.entries(parents).filter(([child]) => child.startsWith('left-arm')))

	it('parents every frame exactly as the dump does', () => {
		const synthesized = frameSystemToPlanFrames([
			part({ name: 'left-arm', kinematics: kinematicsFromDump('left-arm') }),
		])

		expect(armParentsIn(synthesized.parents)).toEqual(armParentsIn(dump.parents))
	})

	it('publishes the same set of frame names', () => {
		const synthesized = frameSystemToPlanFrames([
			part({ name: 'left-arm', kinematics: kinematicsFromDump('left-arm') }),
		])

		const armFramesIn = (frames: Record<string, unknown>) =>
			Object.keys(frames)
				.filter((name) => name.startsWith('left-arm'))
				.toSorted()

		expect(armFramesIn(synthesized.frames)).toEqual(armFramesIn(dump.frames))
	})
})

/**
 * A trajectory addresses joints positionally, and RDK numbers them by walking its model's internal
 * frame system breadth-first from the model's own root, visiting each node's children in
 * alphabetical order. Not declaration order.
 *
 * Every fixture in this repo is a serial chain, where each node has exactly one child — so the walk
 * order, the declaration order and any sibling ordering all agree, and none of them can tell the
 * three apart. This model branches, and the branch is named so that the three disagree: declaration
 * order gives `[zeta, alpha]`, a reversed sibling sort gives `[zeta, alpha]`, and RDK gives
 * `[alpha, zeta]`. Reading the wrong one drives each joint with a different joint's value.
 */
describe('a model that branches', () => {
	const branched = Struct.fromJson({
		name: 'grip',
		kinematic_param_type: 'SVA',
		links: [
			{ id: 'base', parent: 'world', translation: { X: 0, Y: 0, Z: 0 } },
			{ id: 'zeta_finger', parent: 'zeta_joint', translation: { X: 0, Y: 0, Z: 30 } },
			{ id: 'alpha_finger', parent: 'alpha_joint', translation: { X: 0, Y: 0, Z: 30 } },
		],
		joints: [
			{
				id: 'zeta_joint',
				type: 'revolute',
				parent: 'base',
				axis: { X: 0, Y: 0, Z: 1 },
				min: -90,
				max: 90,
			},
			{
				id: 'alpha_joint',
				type: 'revolute',
				parent: 'base',
				axis: { X: 0, Y: 0, Z: 1 },
				min: -90,
				max: 90,
			},
		],
	} as never)

	const columnOf = (kinematics: Struct, joint: string) => {
		const descriptors = byName(
			buildFrameDescriptors(frameSystemToPlanFrames([part({ name: 'grip', kinematics })]))
		)
		const descriptor = descriptors.get(`grip:${joint}`)
		return descriptor?.kind === 'joint' ? descriptor.jointIndex : undefined
	}

	it('numbers the branch alphabetically, not in the order it was declared', () => {
		expect(columnOf(branched, 'alpha_joint')).toBe(0)
		expect(columnOf(branched, 'zeta_joint')).toBe(1)
	})

	// The declaration arrays reversed. RDK reads its own frame system, so the answer cannot move.
	it('gives the same columns however the config lists them', () => {
		const shuffled = Struct.fromJson({
			name: 'grip',
			kinematic_param_type: 'SVA',
			links: [
				{ id: 'alpha_finger', parent: 'alpha_joint', translation: { X: 0, Y: 0, Z: 30 } },
				{ id: 'zeta_finger', parent: 'zeta_joint', translation: { X: 0, Y: 0, Z: 30 } },
				{ id: 'base', parent: 'world', translation: { X: 0, Y: 0, Z: 0 } },
			],
			joints: [
				{
					id: 'alpha_joint',
					type: 'revolute',
					parent: 'base',
					axis: { X: 0, Y: 0, Z: 1 },
					min: -90,
					max: 90,
				},
				{
					id: 'zeta_joint',
					type: 'revolute',
					parent: 'base',
					axis: { X: 0, Y: 0, Z: 1 },
					min: -90,
					max: 90,
				},
			],
		} as never)

		expect(columnOf(shuffled, 'alpha_joint')).toBe(0)
		expect(columnOf(shuffled, 'zeta_joint')).toBe(1)
	})

	/**
	 * This file's own module doc says `primary_output_frame` never arrives on this route, because
	 * `FrameSystemPart.ToProtobuf` sends only `model`. For a serial chain that is harmless — the
	 * declared envelope value always equals the sole leaf — but `grip` here branches into two
	 * leaves, `zeta_finger` and `alpha_finger`, so `soleLeafOf` sees both and returns `undefined`.
	 * `buildFrameContexts` then falls back to the first child of the last joint in the walk order
	 * (`grip:zeta_joint`), which happens to be `grip:zeta_finger` — not because RDK said so, there is
	 * no envelope on this route to say anything, but because that is the joint declared last and
	 * `zeta_finger` is the only frame parented to it. `alpha_finger` would be just as legitimate a
	 * guess, or the intended one; this test pins current behaviour rather than endorsing it. Which
	 * fallback is actually intended is a human call, not something to decide here.
	 */
	it('remaps a child of the bare part name onto the last joint`s child in the walk order', () => {
		const descriptors = byName(
			buildFrameDescriptors(
				frameSystemToPlanFrames([
					part({ name: 'grip', kinematics: branched }),
					part({ name: 'grip-child', parent: 'grip' }),
				])
			)
		)

		expect(descriptors.get('grip-child_origin')?.parent).toBe('grip:zeta_finger')
	})
})

/**
 * RDK seeds a model's input schema by walking its internal frame system breadth-first from `world`,
 * children alphabetical, and giving the next trajectory column to each frame with degrees of
 * freedom. Reading the `joints` array order instead happens to agree for a chain declared in order
 * — every fixture here, and the xArm6 above — and drives each joint with another joint's value for
 * anything else, which folds an arm through its own base.
 */
describe('trajectory column order', () => {
	const chainModel = (joints: Array<{ id: string; parent: string }>) =>
		Struct.fromJson({
			links: [
				{ id: 'base', parent: 'world' },
				{ id: 'l1', parent: 'j1' },
				{ id: 'l2', parent: 'j2' },
				{ id: 'l3', parent: 'j3' },
			],
			joints: joints.map((joint) => ({ ...joint, type: 'revolute', axis: { X: 0, Y: 0, Z: 1 } })),
		})

	const columnsOf = (kinematics: Struct) => {
		const descriptors = buildFrameDescriptors(
			frameSystemToPlanFrames([part({ name: 'arm', kinematics })])
		)
		return Object.fromEntries(
			descriptors
				.filter((descriptor) => descriptor.kind === 'joint')
				.map((descriptor) => [descriptor.name, descriptor.jointIndex])
		)
	}

	const chain = [
		{ id: 'j1', parent: 'base' },
		{ id: 'j2', parent: 'l1' },
		{ id: 'j3', parent: 'l2' },
	]

	it('numbers the joints down the chain', () => {
		expect(columnsOf(chainModel(chain))).toEqual({ 'arm:j1': 0, 'arm:j2': 1, 'arm:j3': 2 })
	})

	it('numbers by the chain, not by the order the joints were declared in', () => {
		// Same arm, joints listed backwards. Declaration order would hand j3 column 0 and swing the
		// wrist with the shoulder's angle.
		expect(columnsOf(chainModel(chain.toReversed()))).toEqual(columnsOf(chainModel(chain)))
	})

	it('breaks a branch tie alphabetically, as RDK`s breadth-first walk does', () => {
		const columns = columnsOf(
			Struct.fromJson({
				links: [{ id: 'base', parent: 'world' }],
				joints: [
					{ id: 'zeta', parent: 'base', type: 'revolute', axis: { X: 0, Y: 0, Z: 1 } },
					{ id: 'alpha', parent: 'base', type: 'revolute', axis: { X: 0, Y: 0, Z: 1 } },
				],
			})
		)

		expect(columns).toEqual({ 'arm:alpha': 0, 'arm:zeta': 1 })
	})

	/**
	 * Defensive rather than observed. RDK's URDF converter reads `jointElem.Name` - the element's
	 * name attribute, not its index - and `LinkConfig.ID` / `JointConfig.ID` are Go strings, so
	 * nothing on this route emits a numeric id. But `kinematics` is a `Struct`, which can carry a
	 * `NumberValue` whatever RDK meant to put there, and a `0` that arrived as a JSON number is
	 * falsy: truth-testing the id would drop the joint and everything below it. That is what keeps
	 * `nodeName`'s explicit `undefined`/`''` test rather than a truthiness check.
	 *
	 * Note the fixture feeds a number through a parameter typed `string | undefined`, which is the
	 * honest signature for what RDK sends and a lie about what this test sends.
	 */
	it('treats a numeric joint id as a name rather than as absent', () => {
		const columns = columnsOf(
			Struct.fromJson({
				links: [{ id: 'base', parent: 'world' }],
				joints: [
					{ id: 0, parent: 'base', type: 'revolute', axis: { X: 0, Y: 0, Z: 1 } },
					{ id: 1, parent: 0, type: 'revolute', axis: { X: 0, Y: 0, Z: 1 } },
				],
			})
		)

		expect(columns).toEqual({ 'arm:0': 0, 'arm:1': 1 })
	})

	/**
	 * A parent naming something the model never declares is a second root to RDK, not a broken chain:
	 * `buildModelFrameSystem` seeds its walk with every child whose parent is absent from `transforms`
	 * and hangs it off `fs.World()`. So `stray` sorts against `base` rather than trailing the walk, and
	 * nothing is guessed. Confirmed against `go.viam.com/rdk v0.122.0`, which builds this model and
	 * reports its schema as `[stray j1]`.
	 */
	it('roots a joint whose parent is not a declared node, the way RDK does', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		const columns = columnsOf(
			Struct.fromJson({
				links: [{ id: 'base', parent: 'world' }],
				joints: [
					{ id: 'j1', parent: 'base', type: 'revolute', axis: { X: 0, Y: 0, Z: 1 } },
					{ id: 'stray', parent: 'nowhere', type: 'revolute', axis: { X: 0, Y: 0, Z: 1 } },
				],
			})
		)

		expect(columns).toEqual({ 'arm:stray': 0, 'arm:j1': 1 })
		expect(warn).not.toHaveBeenCalled()
		warn.mockRestore()
	})
})

describe('node emission', () => {
	const model = Struct.fromJson({
		links: [
			{ id: 'base', parent: 'world' },
			{ id: 'tip', parent: 'j1' },
		],
		joints: [{ id: 'j1', parent: 'base', type: 'revolute', axis: { X: 0, Y: 0, Z: 1 } }],
	})

	/**
	 * Links before joints, which is the order RDK writes its own `transforms` map in
	 * `UnmarshalModelJSON`. It is not cosmetic: `buildFrameContexts` indexes children by iterating
	 * `parents`, and the end-effector fallback takes the *first* child of the last joint, so swapping
	 * these can silently re-parent everything hung off the bare part name on a model that declares no
	 * output frame.
	 */
	it('writes every link before any joint', () => {
		const { parents } = frameSystemToPlanFrames([part({ name: 'arm', kinematics: model })])
		const emitted = Object.keys(parents).filter((key) => key.startsWith('arm:'))

		expect(emitted).toEqual(['arm:base', 'arm:tip', 'arm:j1'])
	})

	// A node with no `parent` field means the model's own mount, the same as one naming `world`.
	// Without that case it would parent to the literal string `p:undefined`, a frame nothing emits.
	it('parents a node with no stated parent to the model`s mount', () => {
		const { parents } = frameSystemToPlanFrames([
			part({ name: 'arm', kinematics: Struct.fromJson({ links: [{ id: 'base' }] }) }),
		])

		expect(parents['arm:base']).toBe('arm_origin')
	})
})

/**
 * The SDK and this package generate `common.v1.Geometry` separately, and the byte round-trip is what
 * bridges them. A mesh is the one shape where the two classes actually differ - the bytes are typed
 * `ArrayBufferLike` on one side and `ArrayBuffer` on the other - so it is the case a straight cast
 * would survive in the type checker and fail on. Every other fixture here is a sphere, which a cast
 * carries perfectly well.
 */
describe('geometry crossing between the two generated protos', () => {
	it('re-decodes a mesh rather than casting it', () => {
		const bytes = new Uint8Array([112, 108, 121, 10, 0, 255, 7])
		const geometry = new Geometry({
			geometryType: {
				case: 'mesh',
				value: new commonApi.Mesh({ contentType: 'ply', mesh: bytes }),
			},
			label: 'scan',
		})

		const { frames } = frameSystemToPlanFrames([part({ name: 'scan', geometry })])
		const { geometry: carried } = frames['scan_origin']!.frame as { geometry: LocalGeometry }

		expect(carried.geometryType.case).toBe('mesh')
		const mesh = carried.geometryType.case === 'mesh' ? carried.geometryType.value : undefined
		expect(mesh?.contentType).toBe('ply')
		expect([...(mesh?.mesh ?? [])]).toEqual([...bytes])
		// A cast would hand back the SDK's instance; the round trip makes a local one.
		expect(carried).toBeInstanceOf(LocalGeometry)
	})
})

describe('unsupported kinematics', () => {
	/**
	 * The fixture carries `dhParams` and no `links` or `joints`, which is what a real DH config looks
	 * like. That shape is what makes the guard's *position* testable: `hasContent` is false for it, so
	 * a DH check placed after that test returns model-less one line earlier and the warning never
	 * prints. A fixture that also declares a link makes both orderings pass and the fix invisible.
	 */
	it('warns and drops a DH model rather than drawing an armless chain', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		const { frames } = frameSystemToPlanFrames([
			part({
				name: 'dh-arm',
				kinematics: Struct.fromJson({
					kinematic_param_type: 'DH',
					dhParams: [{ id: 'a', parent: 'world' }],
				}),
			}),
		])

		expect(frames['dh-arm']?.frame_type).not.toBe('model')
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('DH kinematics'))
		warn.mockRestore()
	})

	/**
	 * The whole model goes, not just the joint, because that is what RDK does:
	 * `JointConfig.ToFrame` returns `NewUnsupportedJointTypeError` and `UnmarshalModelJSON`
	 * propagates it, so the part ends up with no model frame at all.
	 *
	 * Dropping only the joint is worse than it sounds. `base` would survive, and so would anything
	 * parented to `arm:spin` - still naming a frame that was never emitted, which resolves to no
	 * parent at all and draws at the scene origin. The arm does not disappear, it scatters.
	 */
	it('warns and drops the whole model for a joint type RDK cannot build a frame for', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		const { frames, parents } = frameSystemToPlanFrames([
			part({
				name: 'arm',
				kinematics: Struct.fromJson({
					links: [
						{ id: 'base', parent: 'world' },
						{ id: 'tip', parent: 'spin' },
					],
					joints: [{ id: 'spin', parent: 'base', type: 'continuous', axis: { X: 0, Y: 0, Z: 1 } }],
				}),
			}),
		])

		expect(frames['arm:base']).toBeUndefined()
		expect(frames['arm:spin']).toBeUndefined()
		expect(frames['arm:tip']).toBeUndefined()
		// The part itself still draws, as a model-less one: its origin keeps the mount and geometry.
		expect(frames['arm']?.frame_type).toBe(DECODED_FRAME_TYPE)
		expect(frames['arm_origin']).toBeDefined()
		// Nothing is left naming a frame that was not emitted.
		for (const parent of Object.values(parents)) {
			if (parent !== 'world') expect(frames[parent]).toBeDefined()
		}
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('unsupported type'))
		warn.mockRestore()
	})

	it.each([
		['a link', { links: [{ parent: 'world' }], joints: [] }],
		[
			'a joint',
			{
				links: [{ id: 'base', parent: 'world' }],
				joints: [{ parent: 'base', type: 'revolute', axis: { X: 0, Y: 0, Z: 1 } }],
			},
		],
	])('warns and drops the whole model for %s with no id', (_label, kinematics) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		const { frames, parents } = frameSystemToPlanFrames([
			part({ name: 'arm', kinematics: Struct.fromJson(kinematics) }),
		])

		expect(frames['arm']?.frame_type).toBe(DECODED_FRAME_TYPE)
		expect(Object.keys(frames).some((key) => key.startsWith('arm:'))).toBe(false)
		for (const parent of Object.values(parents)) {
			if (parent !== 'world') expect(frames[parent]).toBeDefined()
		}
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('no id'))
		warn.mockRestore()
	})

	/**
	 * `links` and `joints` come off a `Struct` and can be any JSON shape. A non-array used to behave
	 * three different ways: `{ length: 2 }` passed a length test and then threw on iteration, taking
	 * every other part down with it; a string iterated character by character; an actual array of
	 * junk was skipped. All three now read as no model.
	 */
	it.each([
		['an object with a length', { links: { length: 2 } }],
		['a string', { links: 'abc' }],
		['a number', { joints: 7 }],
	])('treats %s in place of a node list as no model', (_label, kinematics) => {
		const { frames } = frameSystemToPlanFrames([
			part({ name: 'a', kinematics: Struct.fromJson(kinematics) }),
		])

		expect(frames['a']?.frame_type).toBe(DECODED_FRAME_TYPE)
	})

	/**
	 * `Struct.toJson()` throws on a `Value` with no kind set and on a non-finite number. That used to
	 * escape the loop and lose every part, so a single malformed one meant no preview at all rather
	 * than one part missing.
	 */
	it('loses only the part whose kinematics cannot be read', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		// A `Value` submessage with no kind set, which is what an empty `Value` decodes to.
		const unreadable = Struct.fromBinary(
			new Uint8Array([10, 9, 10, 5, 108, 105, 110, 107, 115, 18, 0])
		)
		const { frames } = frameSystemToPlanFrames([
			part({ name: 'ok' }),
			part({ name: 'bad', kinematics: unreadable }),
			part({ name: 'also-ok' }),
		])

		expect(frames['ok']).toBeDefined()
		expect(frames['also-ok']).toBeDefined()
		expect(frames['bad']).toBeUndefined()
		expect(warn).toHaveBeenCalledWith(
			expect.stringContaining('could not read the frame config'),
			expect.anything()
		)
		warn.mockRestore()
	})

	it('treats an empty kinematics struct as no model', () => {
		const { frames } = frameSystemToPlanFrames([
			part({ name: 'a', kinematics: Struct.fromJson({}) }),
		])
		expect(frames['a']?.frame_type).not.toBe('model')
	})
})
