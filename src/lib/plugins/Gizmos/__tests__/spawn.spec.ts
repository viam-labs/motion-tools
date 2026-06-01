import { createWorld } from 'koota'
import { Vector3 } from 'three'
import { describe, expect, it } from 'vitest'

import { traits } from '$lib/ecs'

import { cancelPending, confirmPending, spawnGizmo, spawnPending } from '../spawn'
import { Gizmo, PendingGizmo } from '../traits'

describe('spawnGizmo', () => {
	it('attaches the Gizmo marker trait', () => {
		const world = createWorld()
		const entity = spawnGizmo(world, { kind: 'arrow', traits: [] })
		expect(entity.has(Gizmo)).toBe(true)
	})

	it('numbers the first gizmo of a kind starting at 1', () => {
		const world = createWorld()
		const entity = spawnGizmo(world, { kind: 'arrow', traits: [] })
		expect(entity.get(traits.Name)).toBe('arrow 1')
	})

	it('skips already-used indices', () => {
		const world = createWorld()
		spawnGizmo(world, { kind: 'plane', traits: [] })
		spawnGizmo(world, { kind: 'plane', traits: [] })
		const third = spawnGizmo(world, { kind: 'plane', traits: [] })
		expect(third.get(traits.Name)).toBe('plane 3')
	})

	it('fills gaps left by a removed gizmo', () => {
		const world = createWorld()
		const first = spawnGizmo(world, { kind: 'plane', traits: [] })
		spawnGizmo(world, { kind: 'plane', traits: [] })
		first.destroy()
		const next = spawnGizmo(world, { kind: 'plane', traits: [] })
		expect(next.get(traits.Name)).toBe('plane 1')
	})

	it('numbers different kinds independently', () => {
		const world = createWorld()
		spawnGizmo(world, { kind: 'arrow', traits: [] })
		const plane = spawnGizmo(world, { kind: 'plane', traits: [] })
		expect(plane.get(traits.Name)).toBe('plane 1')
	})

	it('ignores entities with non-numeric or unrelated name suffixes', () => {
		const world = createWorld()
		world.spawn(traits.Name('arrow foo'))
		world.spawn(traits.Name('arrowhead 1'))
		const arrow = spawnGizmo(world, { kind: 'arrow', traits: [] })
		expect(arrow.get(traits.Name)).toBe('arrow 1')
	})
})

describe('spawnPending', () => {
	it('attaches PendingGizmo so cancelPending can destroy it', () => {
		const world = createWorld()
		const entity = spawnPending(world, {
			kind: 'arrow',
			position: new Vector3(),
			traits: [],
		})
		expect(entity.has(PendingGizmo)).toBe(true)
	})

	it('confirmPending drops the PendingGizmo tag', () => {
		const world = createWorld()
		const entity = spawnPending(world, {
			kind: 'arrow',
			position: new Vector3(),
			traits: [],
		})
		confirmPending(entity)
		expect(entity.has(PendingGizmo)).toBe(false)
		expect(entity.isAlive()).toBe(true)
	})

	it('cancelPending destroys a still-pending entity', () => {
		const world = createWorld()
		const entity = spawnPending(world, {
			kind: 'arrow',
			position: new Vector3(),
			traits: [],
		})
		cancelPending(entity)
		expect(entity.isAlive()).toBe(false)
	})

	it('cancelPending is a no-op after confirm', () => {
		const world = createWorld()
		const entity = spawnPending(world, {
			kind: 'arrow',
			position: new Vector3(),
			traits: [],
		})
		confirmPending(entity)
		cancelPending(entity)
		expect(entity.isAlive()).toBe(true)
	})

	it('cancelPending tolerates undefined', () => {
		expect(() => cancelPending(undefined)).not.toThrow()
	})
})
