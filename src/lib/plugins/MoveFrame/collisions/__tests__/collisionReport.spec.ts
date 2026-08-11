import { createWorld, type Entity } from 'koota'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { traits } from '$lib/ecs'

import { GhostOf } from '../../relations'
import { PreviewOf } from '../../traits'
import { toReports } from '../collisionReport'

let world: ReturnType<typeof createWorld>

const named = (name: string) => world.spawn(traits.Name(name))

const movedGhost = (source: Entity) => world.spawn(GhostOf(source))

const previewGhost = (component: string) => world.spawn(PreviewOf(component))

beforeEach(() => {
	world = createWorld()
})

// Koota allocates world ids from a pool of 16 and only `destroy` returns one.
afterEach(() => {
	world.destroy()
})

describe('live collisions', () => {
	it('names both sides and marks the pair as happening now', () => {
		const table = named('table')
		const gripper = named('gripper')

		expect(toReports([{ a: gripper, b: table }])).toEqual([
			{ a: 'gripper', b: 'table', staged: false },
		])
	})

	it('orders the sides by name so a pair keys the same either way round', () => {
		const table = named('table')
		const gripper = named('gripper')

		expect(toReports([{ a: gripper, b: table }])).toEqual(toReports([{ a: table, b: gripper }]))
	})

	it('collapses duplicates, which an arm`s identically-labelled links produce', () => {
		const table = named('table')
		const gripper = named('gripper')

		expect(
			toReports([
				{ a: gripper, b: table },
				{ a: gripper, b: table },
			])
		).toHaveLength(1)
	})
})

describe('a staged move that would collide', () => {
	it('borrows the source`s name and marks the pair as staged', () => {
		const table = named('table')
		const gripper = named('gripper')

		expect(toReports([{ a: movedGhost(gripper), b: table }])).toEqual([
			{ a: 'gripper', b: 'table', staged: true },
		])
	})
})

describe('a previewed plan that would collide', () => {
	it('names the ghost after the component it previews', () => {
		const table = named('obstacle-table')

		expect(toReports([{ a: previewGhost('left-arm'), b: table }])).toEqual([
			{ a: 'left-arm', b: 'obstacle-table', staged: true },
		])
	})

	it('reaches the banner rather than the currently-touching list', () => {
		const table = named('obstacle-table')
		const reports = toReports([{ a: previewGhost('left-arm'), b: table }])

		expect(reports.map((report) => report.staged)).toEqual([true])
	})

	it('keeps two components hitting the same obstacle as two rows', () => {
		const table = named('obstacle-table')

		const reports = toReports([
			{ a: previewGhost('left-arm'), b: table },
			{ a: previewGhost('left-gripper'), b: table },
		])

		expect(reports.map((report) => report.a)).toEqual(['left-arm', 'left-gripper'])
	})

	it('sorts ahead of a live pair', () => {
		const table = named('obstacle-table')
		const wall = named('obstacle-wall')

		const reports = toReports([
			{ a: named('left-arm'), b: wall },
			{ a: previewGhost('left-arm'), b: table },
		])

		expect(reports.map((report) => report.staged)).toEqual([true, false])
	})
})

describe('an entity with nothing to name it', () => {
	it('falls back rather than inventing one', () => {
		const table = named('table')

		expect(toReports([{ a: world.spawn(), b: table }])).toEqual([
			{ a: 'table', b: 'unnamed', staged: false },
		])
	})

	/**
	 * Koota drops a relation along with its target, so a moved ghost loses the fact that it was ever
	 * a ghost. A preview ghost carries the name on itself and has no such hole.
	 */
	it('lets a moved ghost lose both name and staged-ness when its source is destroyed', () => {
		const source = named('gripper')
		const ghost = movedGhost(source)
		source.destroy()

		expect(toReports([{ a: ghost, b: named('table') }])).toEqual([
			{ a: 'table', b: 'unnamed', staged: false },
		])
	})

	it('keeps naming a preview ghost after its subject leaves the scene', () => {
		const arm = named('left-arm')
		const ghost = previewGhost('left-arm')
		arm.destroy()

		expect(toReports([{ a: ghost, b: named('obstacle-table') }])).toEqual([
			{ a: 'left-arm', b: 'obstacle-table', staged: true },
		])
	})
})
