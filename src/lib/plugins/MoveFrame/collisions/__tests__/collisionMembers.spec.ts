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

const bitOf = (entity: Entity, members: ReturnType<typeof collectMembers>) =>
	members.find((member) => member.entity === entity)?.bit

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

	/**
	 * A preview ghost is the same physical object as its subject at another moment, so the pair must
	 * never be reported. It carries neither a `Name` nor a parent, so the bit has to come from
	 * `PreviewOf` rather than the hierarchy walk.
	 */
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
		 * The first rung of the ladder, which the rows above only appear to cover: each of them also
		 * spawns a live `arm` frame, so the parent walk reaches bit 1 on its own and `armBits.get`
		 * could be deleted without failing anything. Here there is no live entity to walk, so the
		 * name has to answer for itself.
		 *
		 * Reachable in practice: a preview drawn before `useFrames` has reconciled the arm's frame
		 * entity has `armBits` populated from `useResourceNames` and no live frame yet.
		 */
		it('answers from the arm`s own name when nothing live carries it', () => {
			expect(bitOf(spawnPreview('arm:wrist_1_link'), collectMembers(world, armBits))).toBe(1)
		})

		/**
		 * RDK's remote delimiter is the same colon as its link delimiter, so a remote arm is
		 * `myremote:arm` and its links are `myremote:arm:wrist_1_link`. Reading the part as everything
		 * before the *first* colon answered `myremote` — no `armBits` key, no live frame — so every
		 * ghost of a remote arm fell into the environment and reported touching the arm it is drawn on
		 * top of. That is the exact bug this whole file exists to prevent, reinstated for remote parts.
		 *
		 * The `arm:wrist_1_link` row above cannot catch it: the spec spawns a live collider with that
		 * literal name, so `liveByName` finds it and the walk succeeds even if the parse returns the
		 * whole string untouched.
		 */
		describe('a remote-qualified part', () => {
			const remoteBits = new Map([['myremote:arm', 1]])

			/**
			 * The bare part frame is deliberately absent. `myremote:arm` is ambiguous from the string
			 * alone — link `arm` of local part `myremote`, or bare part `arm` on remote `myremote` — and
			 * nothing can decide it, since `:` is the delimiter in both cases. It is also unreachable:
			 * a ghost is only spawned for a frame carrying geometry, and the bare part frame never
			 * does, so only `<part>_origin` and `<part>:<link>` are ever parsed.
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

				const members = collectMembers(world, remoteBits)
				const linkGroups = groupsForBit(bitOf(link, members)!)
				const previewGroups = groupsForBit(bitOf(preview, members)!)

				expect((linkGroups >>> 16) & (previewGroups & 0xff_ff)).toBe(0)
				expect((previewGroups >>> 16) & (linkGroups & 0xff_ff)).toBe(0)
			})
		})

		// The bug this fixes: the real arm reported touching seven `unnamed` colliders, because the
		// ghosts fell through to the environment and the arm tests against the environment.
		it('never lets a previewed arm test against the real arm', () => {
			const link = spawnCollider(spawnFrame('arm'), 'arm:wrist_1_link')
			const preview = spawnPreview('arm:wrist_1_link')

			const members = collectMembers(world, armBits)
			const linkGroups = groupsForBit(bitOf(link, members)!)
			const previewGroups = groupsForBit(bitOf(preview, members)!)

			// Rapier considers a pair only when each membership intersects the other's filter.
			const membership = (groups: number) => groups >>> 16
			const filter = (groups: number) => groups & 0xff_ff
			expect(membership(linkGroups) & filter(previewGroups)).toBe(0)
			expect(membership(previewGroups) & filter(linkGroups)).toBe(0)
		})

		/**
		 * The case the arm rows above all happen to miss: a gripper is its own component, so its
		 * name is not in `armBits` at all. Indexing that map dropped the ghost into the environment
		 * while its live twin walked up to the arm — and at step 0 the two are exactly coincident,
		 * so the pair was not merely possible but guaranteed. On the reference rig that fires for
		 * `left-gripper:case-gripper`, `left-gripper:claws` and `left-cam_origin`, and their
		 * right-hand twins.
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

			const members = collectMembers(world, armBits)
			const fingerGroups = groupsForBit(bitOf(finger, members)!)
			const previewGroups = groupsForBit(bitOf(preview, members)!)

			expect((fingerGroups >>> 16) & (previewGroups & 0xff_ff)).toBe(0)
			expect((previewGroups >>> 16) & (fingerGroups & 0xff_ff)).toBe(0)
		})

		// Neither says which arm owns the ghost, so neither may claim one.
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

		it('leaves a previewed obstacle in the environment, alongside the real one', () => {
			// The environment filters itself too, so a ghosted obstacle sitting exactly on its original
			// is silent for the same reason.
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

			const members = collectMembers(world, armBits)
			const previewGroups = groupsForBit(bitOf(preview, members)!)
			const obstacleGroups = groupsForBit(bitOf(obstacle, members)!)

			// A plan drawn through an obstacle is worth surfacing, so this pair stays live.
			expect((previewGroups >>> 16) & (obstacleGroups & 0xff_ff)).not.toBe(0)
		})
	})
})
