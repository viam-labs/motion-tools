import { describe, expect, it } from 'vitest'

import { buildFrameDescriptors } from './build-frame-descriptors'
import type { ParsedPlan } from './parse-plan'

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

	it('produces a rotational descriptor and maps to correct joint index', () => {
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
			},
			{ 'arm:waist': 'world', 'arm:shoulder': 'arm:waist' }
		)
		const descriptors = buildFrameDescriptors(p)
		const waist = descriptors.find((d) => d.name === 'arm:waist')!
		const shoulder = descriptors.find((d) => d.name === 'arm:shoulder')!
		expect(waist.kind).toBe('rotational')
		expect(shoulder.kind).toBe('rotational')
		if (waist.kind === 'rotational') {
			expect(waist.componentName).toBe('arm')
			expect(waist.jointIndex).toBe(0)
		}
		if (shoulder.kind === 'rotational') {
			expect(shoulder.componentName).toBe('arm')
			expect(shoulder.jointIndex).toBe(1)
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
