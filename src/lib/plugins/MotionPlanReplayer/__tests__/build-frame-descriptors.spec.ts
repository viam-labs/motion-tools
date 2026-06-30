import { describe, expect, it } from 'vitest'

import type { ParsedPlan } from '../parse-plan'

import { buildFrameDescriptors } from '../build-frame-descriptors'

const plan = (frames: ParsedPlan['frames'], parents: ParsedPlan['parents']): ParsedPlan => ({
	frames,
	parents,
	trajectory: [],
	goals: [],
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

	it('returns null geometry for unrecognized geometry type', () => {
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
})
