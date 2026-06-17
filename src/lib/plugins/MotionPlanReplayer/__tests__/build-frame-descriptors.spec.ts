import { describe, expect, it } from 'vitest'

import { buildFrameDescriptors } from '../build-frame-descriptors'
import type { ParsedPlan } from '../parse-plan'

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

	it('joint frames produce no descriptors; child links become jointed_link descriptors', () => {
		// arm chain: base (static) → waist (joint, Z) → base_top (static link)
		//                          → shoulder (joint, Y) → upper_arm (static link)
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

		// Joint frames (waist, shoulder) must not appear as descriptors
		expect(descriptors.find((d) => d.name === 'arm:waist')).toBeUndefined()
		expect(descriptors.find((d) => d.name === 'arm:shoulder')).toBeUndefined()

		// base_top: parent was waist (joint) → becomes jointed_link, ECS parent = waist's parent
		const basTop = descriptors.find((d) => d.name === 'arm:base_top')!
		expect(basTop.kind).toBe('jointed_link')
		if (basTop.kind === 'jointed_link') {
			expect(basTop.parent).toBe('arm:base') // joint's parent, not the joint itself
			expect(basTop.componentName).toBe('arm')
			expect(basTop.jointIndex).toBe(0) // waist is index 0
			expect(basTop.axis).toEqual({ X: 0, Y: 0, Z: 1 })
			expect(basTop.linkPose.z).toBeCloseTo(267)
		}

		// upper_arm: parent was shoulder (joint) → becomes jointed_link
		const upperArm = descriptors.find((d) => d.name === 'arm:upper_arm')!
		expect(upperArm.kind).toBe('jointed_link')
		if (upperArm.kind === 'jointed_link') {
			expect(upperArm.parent).toBe('arm:base_top') // shoulder's parent
			expect(upperArm.componentName).toBe('arm')
			expect(upperArm.jointIndex).toBe(1) // shoulder is index 1
			expect(upperArm.axis).toEqual({ X: 0, Y: 1, Z: 0 })
			expect(upperArm.linkPose.x).toBeCloseTo(53.5)
			expect(upperArm.linkPose.z).toBeCloseTo(284.5)
		}
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
			expect(d.geometry!.type).toBe('capsule')
			expect(d.geometry!.r).toBe(50)
			expect(d.geometry!.l).toBe(320)
			expect(d.geometry!.centerPose.z).toBeCloseTo(160)
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
