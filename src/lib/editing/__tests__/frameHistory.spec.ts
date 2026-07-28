import { createWorld, type World } from 'koota'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('$lib/loaders/pcd', () => ({
	parsePcdInWorker: vi.fn(() => Promise.resolve({ positions: new Float32Array(), colors: null })),
}))

import { hierarchy, traits } from '$lib/ecs'
import { Pose } from '$lib/math'

import {
	applyFrameHistorySnapshotToWorld,
	collectFrameHistoryFrames,
	type FrameHistoryPartConfig,
} from '../frameHistory'

describe('frame history replay', () => {
	let world: World

	afterEach(() => {
		world?.destroy()
	})

	it('writes dirty snapshots into EditedMatrix and frame traits', () => {
		world = createWorld()
		const entity = world.spawn(
			traits.Name('arm'),
			traits.FramesAPI,
			traits.Matrix(),
			traits.LiveMatrix(new Pose(10, 0, 0).toMatrix4()),
			traits.Box({ x: 1, y: 2, z: 3 })
		)

		applyFrameHistorySnapshotToWorld(
			world,
			{
				components: [
					{
						name: 'arm',
						frame: {
							parent: 'base',
							translation: { x: 100, y: 0, z: 0 },
							orientation: { type: 'ov_degrees', value: { x: 0, y: 0, z: 1, th: 0 } },
							geometry: { type: 'sphere', r: 42 },
						},
					},
				],
			},
			{},
			{ keepEditedMatrices: true }
		)

		const edited = entity.get(traits.EditedMatrix)
		expect(edited).toBeDefined()
		expect(new Pose().setFromMatrix4(edited!).x).toBe(100)
		expect(hierarchy.getParentName(entity)).toBe('base')
		expect(entity.has(traits.Box)).toBe(false)
		expect(entity.get(traits.Sphere)).toStrictEqual({ r: 42 })
	})

	it('removes EditedMatrix and updates baseline matrices for clean snapshots', () => {
		world = createWorld()
		const entity = world.spawn(
			traits.Name('arm'),
			traits.FramesAPI,
			traits.Matrix(),
			traits.LiveMatrix(new Pose(10, 0, 0).toMatrix4()),
			traits.EditedMatrix(new Pose(20, 0, 0).toMatrix4()),
			traits.Sphere({ r: 5 })
		)

		applyFrameHistorySnapshotToWorld(
			world,
			{
				components: [
					{
						name: 'arm',
						frame: {
							parent: 'world',
							translation: { x: 300, y: 0, z: 0 },
							orientation: { type: 'ov_degrees', value: { x: 0, y: 0, z: 1, th: 0 } },
						},
					},
				],
			},
			{},
			{ keepEditedMatrices: false }
		)

		expect(entity.has(traits.EditedMatrix)).toBe(false)
		expect(new Pose().setFromMatrix4(entity.get(traits.Matrix)!).x).toBe(300)
		expect(new Pose().setFromMatrix4(entity.get(traits.LiveMatrix)!).x).toBe(300)
		expect(hierarchy.getParentName(entity)).toBeUndefined()
		expect(entity.has(traits.Sphere)).toBe(false)
	})

	it('uses the latest fragment frame mod when collecting replay frames', () => {
		const config: FrameHistoryPartConfig = {
			components: [],
			fragment_mods: [
				{
					fragment_id: 'fragment-1',
					mods: [
						{
							$set: {
								'components.frag-arm.frame': {
									parent: 'world',
									translation: { x: 10, y: 0, z: 0 },
									orientation: {
										type: 'ov_degrees',
										value: { x: 0, y: 0, z: 1, th: 0 },
									},
								},
							},
						},
						{
							$set: {
								'components.frag-arm.frame': {
									parent: 'world',
									translation: { x: 20, y: 0, z: 0 },
									orientation: {
										type: 'ov_degrees',
										value: { x: 0, y: 0, z: 1, th: 0 },
									},
								},
							},
						},
					],
				},
			],
		}

		const { frames } = collectFrameHistoryFrames(config, {
			'frag-arm': { id: 'fragment-1', variables: {} },
		})

		expect(frames.get('frag-arm')?.translation.x).toBe(20)
	})

	it('falls back to the fragment base frame when no frame mod exists', () => {
		const { frames } = collectFrameHistoryFrames(
			{ components: [] },
			{
				'frag-arm': {
					id: 'fragment-1',
					variables: {},
					frame: {
						parent: 'world',
						translation: { x: 30, y: 0, z: 0 },
						orientation: { type: 'ov_degrees', value: { x: 0, y: 0, z: 1, th: 0 } },
					},
				},
			}
		)

		expect(frames.get('frag-arm')?.translation.x).toBe(30)
	})
})
