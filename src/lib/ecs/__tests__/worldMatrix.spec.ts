import { createWorld, type World } from 'koota'
import { Matrix4 } from 'three'
import { afterEach, describe, expect, it } from 'vitest'

import { relations, traits } from '$lib/ecs'
import { installWorldMatrixListeners } from '$lib/ecs/worldMatrix'
import { createPose, newMatrixTrait, poseToMatrixTrait, readTraitToMatrix } from '$lib/transform'

const matrixOf = (pose: Parameters<typeof createPose>[0]) =>
	poseToMatrixTrait(createPose(pose), newMatrixTrait())

describe('worldMatrix system', () => {
	let world: World
	let unsub: (() => void) | undefined
	afterEach(() => {
		unsub?.()
		unsub = undefined
		world?.destroy()
	})

	const tick = () => Promise.resolve()

	// Pose translation is in mm; matrix translation is in m (× 0.001).
	// Tests assert metres at the matrix layer.

	it('writes WorldMatrix equal to Matrix for a root entity', async () => {
		world = createWorld()
		unsub = installWorldMatrixListeners(world)

		const entity = world.spawn(traits.Matrix(matrixOf({ x: 100, y: 200, z: 300 })))
		await tick()

		const worldMat = entity.get(traits.WorldMatrix)
		expect(worldMat).toBeDefined()
		expect(worldMat?.m12).toBeCloseTo(0.1)
		expect(worldMat?.m13).toBeCloseTo(0.2)
		expect(worldMat?.m14).toBeCloseTo(0.3)
	})

	it("composes parent.WorldMatrix × child.Matrix for a child", async () => {
		world = createWorld()
		unsub = installWorldMatrixListeners(world)

		const parent = world.spawn(
			traits.Name('arm'),
			traits.Matrix(matrixOf({ x: 100, y: 0, z: 0 }))
		)
		const child = world.spawn(
			relations.ChildOf(parent),
			traits.Matrix(matrixOf({ x: 50, y: 0, z: 0 }))
		)
		await tick()

		const worldMat = child.get(traits.WorldMatrix)
		expect(worldMat?.m12).toBeCloseTo(0.15)
	})

	it("falls back to EditedMatrix when LiveMatrix or Matrix is missing", async () => {
		world = createWorld()
		unsub = installWorldMatrixListeners(world)

		const entity = world.spawn(traits.EditedMatrix(matrixOf({ x: 42 })))
		await tick()

		expect(entity.get(traits.WorldMatrix)?.m12).toBeCloseTo(0.042)
	})

	it("blends live × baseline⁻¹ × edited when all three are present", async () => {
		world = createWorld()
		unsub = installWorldMatrixListeners(world)

		// baseline at +10 mm, live at +30 mm — kinematic offset of +20 mm
		// edited at +10 mm — same as baseline, no user delta
		// rendered = live × baseline⁻¹ × edited = +30 mm = +0.030 m
		const entity = world.spawn(
			traits.Matrix(matrixOf({ x: 10 })),
			traits.LiveMatrix(matrixOf({ x: 30 })),
			traits.EditedMatrix(matrixOf({ x: 10 }))
		)
		await tick()

		expect(entity.get(traits.WorldMatrix)?.m12).toBeCloseTo(0.03)
	})

	it("propagates parent updates to descendants on the next microtask", async () => {
		world = createWorld()
		unsub = installWorldMatrixListeners(world)

		const parent = world.spawn(
			traits.Name('arm'),
			traits.Matrix(matrixOf({ x: 100, y: 0, z: 0 }))
		)
		const child = world.spawn(
			relations.ChildOf(parent),
			traits.Matrix(matrixOf({ x: 50 }))
		)
		await tick()
		expect(child.get(traits.WorldMatrix)?.m12).toBeCloseTo(0.15)

		parent.set(traits.Matrix, matrixOf({ x: 200 }))
		await tick()

		expect(child.get(traits.WorldMatrix)?.m12).toBeCloseTo(0.25)
	})

	it("applies Scale to the local transform", async () => {
		world = createWorld()
		unsub = installWorldMatrixListeners(world)

		const entity = world.spawn(
			traits.Matrix(matrixOf({ x: 0, y: 0, z: 0 })),
			traits.Scale({ x: 2, y: 2, z: 2 })
		)
		await tick()

		const worldMat = entity.get(traits.WorldMatrix)
		const m = readTraitToMatrix(worldMat!, new Matrix4())
		// Scale 2 means m0/m5/m10 should be 2 (along the diagonal of a pure-scale matrix at origin).
		expect(m.elements[0]).toBeCloseTo(2)
		expect(m.elements[5]).toBeCloseTo(2)
		expect(m.elements[10]).toBeCloseTo(2)
	})

	it("coalesces multiple changes into a single flush", async () => {
		world = createWorld()
		unsub = installWorldMatrixListeners(world)

		const entity = world.spawn(traits.Matrix(matrixOf({ x: 0 })))

		entity.set(traits.Matrix, matrixOf({ x: 1 }))
		entity.set(traits.Matrix, matrixOf({ x: 2 }))
		entity.set(traits.Matrix, matrixOf({ x: 3 }))
		await tick()

		expect(entity.get(traits.WorldMatrix)?.m12).toBeCloseTo(0.003)
	})
})
