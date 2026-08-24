import type { EntityDraft } from '../../src/lib/__tests__/__fixtures__/entityDrafts'
import type {
	EntityTypeDescriptor,
	TraitCase,
} from '../../src/lib/__tests__/__fixtures__/entityMatrix'
import type { CellExpectation } from './expectations'
import type { MatrixScene } from './fixture'

import {
	casesFor,
	ENTITY_TYPES,
	PARENT_FRAME,
} from '../../src/lib/__tests__/__fixtures__/entityMatrix'
import { waitForCanvasToSettle } from '../helpers/screenshot'
import { matrixDraft, parentDraft } from './drafts'
import { readEntityState } from './entityState'
import { expectationFor } from './expectations'
import { expect, test } from './fixture'

/**
 * Long enough for the service round trip plus the browser's rAF-bounded
 * coalescing flush, short enough that a dropped field fails a cell rather than
 * the whole worker.
 */
const CONVERGE_TIMEOUT_MS = 15_000

const withCase = (type: EntityTypeDescriptor, traitCase: TraitCase, phase: 'base' | 'target') => {
	const draft = matrixDraft(type)
	traitCase.base?.(draft)
	if (phase === 'target') traitCase.apply(draft)
	return draft
}

const converged = async (scene: MatrixScene, name: string, expectation: CellExpectation) => {
	await expect
		.poll(() => readEntityState(scene.page, name), { timeout: CONVERGE_TIMEOUT_MS })
		.toMatchObject(expectation.state)

	if (!expectation.canvas) return

	const settled = await waitForCanvasToSettle(scene.page)
	// Byte equality rather than a committed baseline: the reference frame is
	// captured on this machine, this run, so it carries no platform or GPU
	// dependence of its own.
	expect(
		settled.equals(scene.blankFrame),
		expectation.canvas === 'blank'
			? 'entity is hidden in the ECS but still on the canvas'
			: 'entity is visible in the ECS but the canvas is still empty'
	).toBe(expectation.canvas === 'blank')
}

/** Spawns the frame a `reparent` case attaches to, so the hierarchy has something to resolve against. */
const spawnParent = async (scene: MatrixScene, draft: EntityDraft) => {
	if (draft.parent !== PARENT_FRAME) return
	await scene.add(parentDraft(PARENT_FRAME))
	await expect
		.poll(() => readEntityState(scene.page, PARENT_FRAME), { timeout: CONVERGE_TIMEOUT_MS })
		.toMatchObject({ present: true })
}

/**
 * Every entity type crossed with every behavior it supports, driven over the
 * wire the app actually uses: a Connect client to the Go draw service, its
 * `StreamEntityChanges` broadcast, and the browser's coalescing reconciler.
 *
 * The equivalent unit spec (`draw-parity.spec.ts`) proves the spawn and update
 * code paths agree with each other. It cannot prove either one is right,
 * because it hands protos straight to `draw.ts`. These cells assert the
 * absolute end state instead, so a field the service drops on the floor fails
 * here even though both paths still agree.
 */
for (const type of ENTITY_TYPES) {
	test.describe(type.name, () => {
		test.beforeEach(async ({ scene }) => {
			await scene.reset()
		})

		for (const traitCase of casesFor(type)) {
			test(`${type.name} ${traitCase.name}`, async ({ scene }) => {
				const expectation = expectationFor(type, traitCase.name)

				await test.step('at spawn', async () => {
					const target = withCase(type, traitCase, 'target')
					await spawnParent(scene, target)
					await scene.add(target)
					await converged(scene, type.name, expectation)
				})

				await scene.reset()

				await test.step('on update', async () => {
					const initial = withCase(type, traitCase, 'base')
					const target = withCase(type, traitCase, 'target')
					await spawnParent(scene, target)

					const uuid = await scene.add(initial)
					// The add has to land before the update goes out. Two events in one
					// animation frame coalesce into a single apply, which would leave the
					// update path untested.
					await expect
						.poll(() => readEntityState(scene.page, type.name), {
							timeout: CONVERGE_TIMEOUT_MS,
						})
						.toMatchObject({ present: true })

					await scene.update(uuid, target)
					await converged(scene, type.name, expectation)
				})
			})
		}
	})
}
