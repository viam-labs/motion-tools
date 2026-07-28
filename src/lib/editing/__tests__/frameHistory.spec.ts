import { createWorld, type World } from 'koota'
import { Matrix4 } from 'three'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('$lib/loaders/pcd', () => ({
	parsePcdInWorker: vi.fn(() => Promise.resolve({ positions: new Float32Array(), colors: null })),
}))

import { hierarchy, traits } from '$lib/ecs'
import { installWorldMatrixListeners } from '$lib/ecs/worldMatrix'
import { createPose, matrixToPose, poseToMatrix } from '$lib/transform'

import {
	applyFrameHistorySnapshotToWorld,
	collectFrameHistoryFrames,
	type FrameHistoryPartConfig,
} from '../frameHistory'

const matrixOf = (x: number) => poseToMatrix(createPose({ x }), new Matrix4())

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
			traits.Matrix(matrixOf(0)),
			traits.LiveMatrix(matrixOf(10)),
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
		expect(matrixToPose(edited!, createPose()).x).toBe(100)
		expect(hierarchy.getParentName(entity)).toBe('base')
		expect(entity.has(traits.Box)).toBe(false)
		expect(entity.get(traits.Sphere)).toStrictEqual({ r: 42 })
	})

	it('removes EditedMatrix and updates baseline matrices for clean snapshots', () => {
		world = createWorld()
		const entity = world.spawn(
			traits.Name('arm'),
			traits.FramesAPI,
			traits.Matrix(matrixOf(0)),
			traits.LiveMatrix(matrixOf(10)),
			traits.EditedMatrix(matrixOf(20)),
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
		expect(matrixToPose(entity.get(traits.Matrix)!, createPose()).x).toBe(300)
		expect(matrixToPose(entity.get(traits.LiveMatrix)!, createPose()).x).toBe(300)
		expect(hierarchy.getParentName(entity)).toBeUndefined()
		expect(entity.has(traits.Sphere)).toBe(false)
	})

	it('holds the edited pose after the baseline is re-derived from the saved config', async () => {
		world = createWorld()
		const unsub = installWorldMatrixListeners(world)

		// useFrames spawns the frame at its saved pose, then the user drags it.
		const entity = world.spawn(
			traits.Name('arm'),
			traits.FramesAPI,
			traits.Matrix(matrixOf(100)),
			traits.LiveMatrix(matrixOf(100)),
			traits.EditedMatrix(matrixOf(500))
		)
		await Promise.resolve()
		expect(entity.get(traits.WorldMatrix)?.elements[12]).toBeCloseTo(0.5)

		// Saving commits the config into the world.
		applyFrameHistorySnapshotToWorld(
			world,
			{
				components: [
					{
						name: 'arm',
						frame: {
							parent: 'world',
							translation: { x: 500, y: 0, z: 0 },
							orientation: { type: 'ov_degrees', value: { x: 0, y: 0, z: 1, th: 0 } },
						},
					},
				],
			},
			{},
			{ keepEditedMatrices: false }
		)

		// Back in monitor mode useFrames re-derives the baseline from the saved
		// config. Without the commit above, the blend would cancel the edit
		// against a LiveMatrix still holding the pre-save pose.
		poseToMatrix(createPose({ x: 500 }), entity.get(traits.Matrix)!)
		entity.changed(traits.Matrix)
		await Promise.resolve()

		expect(entity.get(traits.WorldMatrix)?.elements[12]).toBeCloseTo(0.5)
		unsub()
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
