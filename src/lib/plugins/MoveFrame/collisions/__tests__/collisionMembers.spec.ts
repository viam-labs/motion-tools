import { createWorld, type Entity } from 'koota'
import { Matrix4 } from 'three'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { relations, traits } from '$lib/ecs'

import { GhostOf } from '../../relations'
import { previewComponentName, PreviewOf } from '../../traits'
import { armBitFor, collectMembers, isGhost } from '../collisionMembers'
import { ENVIRONMENT_BIT, groupsForBit } from '../interactionGroups'

let world: ReturnType<typeof createWorld>

const armBits = new Map([
	['arm', 1],
	['otherArm', 2],
])

/** A named frame, optionally parented to another. */
const spawnFrame = (name: string, parent?: Entity) =>
	world.spawn(
		traits.Name(name),
		traits.WorldMatrix(new Matrix4()),
		...(parent ? [relations.ChildOf(parent)] : [])
	)

/** A collider hanging off `parent`, the shape `GetGeometries` produces. */
const spawnCollider = (parent: Entity, name: string) =>
	world.spawn(
		relations.ChildOf(parent),
		traits.Name(name),
		traits.Box({ x: 100, y: 100, z: 100 }),
		traits.WorldMatrix(new Matrix4())
	)

type Members = ReturnType<typeof collectMembers>

const bitOf = (entity: Entity, members: Members) =>
	members.find((member) => member.entity === entity)?.bit

const groupsOf = (entity: Entity, members: Members): number => {
	const bit = bitOf(entity, members)
	if (bit === undefined) throw new Error('entity was not collected as a collision member')
	return groupsForBit(bit)
}

/**
 * Both directions of Rapier's pair test: it considers a pair only when each side's membership
 * intersects the other's filter, so a zero in either slot means the pair is never checked.
 */
const pairMasks = (a: Entity, b: Entity, members: Members): [number, number] => {
	const [groupsA, groupsB] = [groupsOf(a, members), groupsOf(b, members)]
	return [(groupsA >>> 16) & (groupsB & 0xff_ff), (groupsB >>> 16) & (groupsA & 0xff_ff)]
}

beforeEach(() => {
	world = createWorld()
})

// Koota allocates world ids from a pool of 16 and only `destroy` returns one.
afterEach(() => {
	world.destroy()
})

describe('armBitFor', () => {
	it("takes an arm's own link colliders, which parent straight to the component", () => {
		const arm = spawnFrame('arm')
		const link = spawnCollider(arm, 'arm:link_2')

		expect(armBitFor(link, armBits)).toBe(1)
	})

	it('walks past an intermediate component, so a mounted gripper joins its arm', () => {
		const arm = spawnFrame('arm')
		const gripper = spawnFrame('gripper', arm)
		const finger = spawnCollider(gripper, 'gripper:finger')

		expect(armBitFor(finger, armBits)).toBe(1)
	})

	it('puts anything with no arm above it in the environment', () => {
		const table = spawnFrame('table')

		expect(armBitFor(spawnCollider(table, 'table:top'), armBits)).toBe(ENVIRONMENT_BIT)
	})

	it('keeps two arms on their own bits', () => {
		const other = spawnFrame('otherArm')

		expect(armBitFor(spawnCollider(other, 'otherArm:link_1'), armBits)).toBe(2)
	})
})

describe('isGhost', () => {
	it('distinguishes a ghost from the entity it mirrors', () => {
		const source = world.spawn(traits.Box({ x: 100, y: 100, z: 100 }))
		const ghost = world.spawn(GhostOf(source), traits.Box({ x: 100, y: 100, z: 100 }))

		expect(isGhost(ghost)).toBe(true)
		expect(isGhost(source)).toBe(false)
	})
})

describe('collectMembers', () => {
	it('collects every collidable primitive', () => {
		const table = spawnFrame('table')
		world.spawn(
			relations.ChildOf(table),
			traits.Sphere({ r: 50 }),
			traits.WorldMatrix(new Matrix4())
		)
		world.spawn(
			relations.ChildOf(table),
			traits.Capsule({ l: 300, r: 50 }),
			traits.WorldMatrix(new Matrix4())
		)
		spawnCollider(table, 'table:top')

		expect(collectMembers(world, armBits)).toHaveLength(3)
	})

	it('leaves out hidden geometry, which the user has said not to consider', () => {
		const table = spawnFrame('table')
		const hidden = spawnCollider(table, 'table:top')
		hidden.add(traits.InheritedInvisible)

		expect(collectMembers(world, armBits)).toHaveLength(0)
	})

	it('keeps a collider whose CAD model is drawn in its place', () => {
		const arm = spawnFrame('arm')
		const link = spawnCollider(arm, 'arm:link_2')
		link.add(traits.ColliderHidden)

		expect(bitOf(link, collectMembers(world, armBits))).toBe(1)
	})

	it("gives a ghost its source's bit, so a previewed gripper still ignores its arm", () => {
		const arm = spawnFrame('arm')
		const gripper = spawnFrame('gripper', arm)
		const finger = spawnCollider(gripper, 'gripper:finger')

		const ghost = world.spawn(
			GhostOf(finger),
			traits.Box({ x: 100, y: 100, z: 100 }),
			traits.WorldMatrix(new Matrix4())
		)

		expect(bitOf(ghost, collectMembers(world, armBits))).toBe(1)
	})

	it('falls back to the environment for a ghost whose source is gone', () => {
		const source = spawnCollider(spawnFrame('arm'), 'arm:link_2')
		const ghost = world.spawn(
			GhostOf(source),
			traits.Box({ x: 100, y: 100, z: 100 }),
			traits.WorldMatrix(new Matrix4())
		)
		source.destroy()

		expect(bitOf(ghost, collectMembers(world, armBits))).toBe(ENVIRONMENT_BIT)
	})

	describe('preview ghosts', () => {
		const spawnPreview = (frameName: string) =>
			world.spawn(
				PreviewOf(previewComponentName(frameName)),
				traits.Box({ x: 100, y: 100, z: 100 }),
				traits.WorldMatrix(new Matrix4())
			)

		it.each(['arm', 'arm_origin', 'arm:wrist_1_link'])(
			'gives the preview of %s the arm`s own bit',
			(frameName) => {
				spawnCollider(spawnFrame('arm'), 'arm:wrist_1_link')
				expect(bitOf(spawnPreview(frameName), collectMembers(world, armBits))).toBe(1)
			}
		)

		/**
		 * The rows above only appear to cover this: each spawns a live `arm` too, so the parent walk
		 * reaches bit 1 on its own and `armBits.get` could be deleted without failing any of them.
		 */
		it('answers from the arm`s own name when nothing live carries it', () => {
			expect(bitOf(spawnPreview('arm:wrist_1_link'), collectMembers(world, armBits))).toBe(1)
		})

		/**
		 * The `arm:wrist_1_link` row above cannot catch this: it spawns a live collider with that
		 * literal name, so the walk succeeds even when the parse leaves the whole string untouched.
		 */
		describe('a remote-qualified part', () => {
			const remoteBits = new Map([['myremote:arm', 1]])

			/**
			 * No bare `myremote:arm` row: from the string alone it is undecidable, and it is also
			 * unreachable, since only a frame carrying geometry is ghosted and a part frame carries none.
			 */
			it.each(['myremote:arm_origin', 'myremote:arm:wrist_1_link'])(
				'gives the preview of %s the remote arm`s bit',
				(frameName) => {
					spawnCollider(spawnFrame('myremote:arm'), 'myremote:arm:wrist_1_link')
					expect(bitOf(spawnPreview(frameName), collectMembers(world, remoteBits))).toBe(1)
				}
			)

			it('never lets a remote arm`s preview test against the real one', () => {
				const link = spawnCollider(spawnFrame('myremote:arm'), 'myremote:arm:wrist_1_link')
				const preview = spawnPreview('myremote:arm:wrist_1_link')

				expect(pairMasks(link, preview, collectMembers(world, remoteBits))).toEqual([0, 0])
			})
		})

		it('never lets a previewed arm test against the real arm', () => {
			const link = spawnCollider(spawnFrame('arm'), 'arm:wrist_1_link')
			const preview = spawnPreview('arm:wrist_1_link')

			expect(pairMasks(link, preview, collectMembers(world, armBits))).toEqual([0, 0])
		})

		/**
		 * The rows above all miss this: a gripper is its own component, so its name is not in
		 * `armBits` at all and only the parent walk knows which arm it hangs off.
		 */
		it('gives the preview of a mounted gripper the arm it hangs off', () => {
			const arm = spawnFrame('arm')
			const gripper = spawnFrame('gripper', arm)
			spawnCollider(gripper, 'gripper:finger')

			expect(bitOf(spawnPreview('gripper:finger'), collectMembers(world, armBits))).toBe(1)
		})

		it('never lets a previewed gripper test against the real one', () => {
			const arm = spawnFrame('arm')
			const gripper = spawnFrame('gripper', arm)
			const finger = spawnCollider(gripper, 'gripper:finger')
			const preview = spawnPreview('gripper:finger')

			expect(pairMasks(finger, preview, collectMembers(world, armBits))).toEqual([0, 0])
		})

		it('leaves a preview whose subject is not in the scene in the environment', () => {
			expect(bitOf(spawnPreview('gripper:finger'), collectMembers(world, armBits))).toBe(
				ENVIRONMENT_BIT
			)
		})

		it('leaves a preview whose subject has no arm above it in the environment', () => {
			const cart = spawnFrame('cart')
			spawnCollider(cart, 'cart:wheel')

			expect(bitOf(spawnPreview('cart:wheel'), collectMembers(world, armBits))).toBe(
				ENVIRONMENT_BIT
			)
		})

		// The environment filters itself, so a ghosted obstacle sitting exactly on its original is
		// silent for the same reason an arm's ghost is.
		it('leaves a previewed obstacle in the environment, alongside the real one', () => {
			expect(bitOf(spawnPreview('table_origin'), collectMembers(world, armBits))).toBe(
				ENVIRONMENT_BIT
			)
		})

		it('still tests a previewed arm against the environment', () => {
			const preview = spawnPreview('arm:wrist_1_link')
			const obstacle = world.spawn(
				traits.Name('table'),
				traits.Box({ x: 100, y: 100, z: 100 }),
				traits.WorldMatrix(new Matrix4())
			)

			expect(pairMasks(preview, obstacle, collectMembers(world, armBits))).not.toContain(0)
		})
	})
})
