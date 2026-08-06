import { Struct } from '@bufbuild/protobuf'
import { Geometry, PoseInFrame, robotApi, Sphere, Transform } from '@viamrobotics/sdk'
import { describe, expect, it, vi } from 'vitest'

import { parsePlan } from '$lib/plugins/MotionPlanReplayer/parse-plan'

import type { FrameDescriptor } from '../frameDescriptors'

import planJson from '../../plugins/MotionPlanReplayer/__tests__/__fixtures__/plan.json?raw'
import { buildFrameDescriptors } from '../frameDescriptors'
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
	 * `createFramesFromPart` builds the `_origin` static frame from the part's frame config at
	 * `frame_system.go:1105`, before it has looked at the model at all. A configured geometry on an
	 * arm is a safety envelope, and it was being dropped from the one view meant to show what a move
	 * would hit.
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
 * The other half of the same RDK conditional, running the other way. When a model has no degrees of
 * freedom and the part supplied a geometry, RDK replaces the model frame with a bare static one
 * (`frame_system.go:1112-1128`) — the user's shape is meant to *replace* the model's, not sit beside
 * it. A static frame is not flattenable (`:406`), so no `p:<link>` frames are published either.
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

	// A URDF-converted model names its joints for their index, and a `0` that survived as a JSON
	// number is falsy — truth-testing the id would drop the joint and everything below it.
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

	it('warns rather than dropping a joint the walk never reaches', () => {
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

		// Dropping it would take its whole subtree out of the drawing with it.
		expect(columns).toEqual({ 'arm:j1': 0, 'arm:stray': 1 })
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('not connected to its base'))
		warn.mockRestore()
	})
})

describe('unsupported kinematics', () => {
	it('warns and drops a DH model rather than drawing an armless chain', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		const { frames } = frameSystemToPlanFrames([
			part({
				name: 'dh-arm',
				kinematics: Struct.fromJson({
					kinematic_param_type: 'DH',
					dhParams: [{ id: 'a', parent: 'world' }],
					links: [{ id: 'base', parent: 'world' }],
				}),
			}),
		])

		expect(frames['dh-arm']?.frame_type).not.toBe('model')
		expect(frames['dh-arm:base']).toBeUndefined()
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('DH kinematics'))
		warn.mockRestore()
	})

	it('warns and skips a joint type RDK itself cannot build a frame for', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

		const { frames } = frameSystemToPlanFrames([
			part({
				name: 'arm',
				kinematics: Struct.fromJson({
					links: [{ id: 'base', parent: 'world' }],
					joints: [{ id: 'spin', parent: 'base', type: 'continuous', axis: { X: 0, Y: 0, Z: 1 } }],
				}),
			}),
		])

		expect(frames['arm:base']).toBeDefined()
		expect(frames['arm:spin']).toBeUndefined()
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('unsupported joint type'))
		warn.mockRestore()
	})

	it('treats an empty kinematics struct as no model', () => {
		const { frames } = frameSystemToPlanFrames([
			part({ name: 'a', kinematics: Struct.fromJson({}) }),
		])
		expect(frames['a']?.frame_type).not.toBe('model')
	})
})
