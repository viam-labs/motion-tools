import { describe, expect, it } from 'vitest'

import { PoseInFrame, Transform } from '$lib/buf/common/v1/common_pb'
import { TransformChangeType } from '$lib/buf/service/worldstatestore/v1/world_state_store_pb'

import type { IncomingChange, PendingTransformChanges } from '../pendingTransformChanges'

import { mergeChange } from '../coalesceTransformChanges'

type TransformInit = ConstructorParameters<typeof Transform>[0]

const added = (uuid: string, overrides: TransformInit = {}): IncomingChange => ({
	uuid,
	changeType: TransformChangeType.ADDED,
	transform: new Transform(overrides),
})

const removed = (uuid: string, overrides: TransformInit = {}): IncomingChange => ({
	uuid,
	changeType: TransformChangeType.REMOVED,
	transform: new Transform(overrides),
})

const updated = (
	uuid: string,
	overrides: TransformInit = {},
	paths?: string[]
): IncomingChange => ({
	uuid,
	changeType: TransformChangeType.UPDATED,
	transform: new Transform(overrides),
	updatedFields: paths ? { paths } : undefined,
})

const emptyMap = (): PendingTransformChanges => new Map()

describe('mergeChange', () => {
	describe('starting from no pending entry', () => {
		it('none + ADDED stores ADDED with fields undefined', () => {
			const pending = emptyMap()
			mergeChange(pending, added('a', { referenceFrame: 'world' }))

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.ADDED)
			expect(entry?.fields).toBeUndefined()
			expect(entry?.transform.referenceFrame).toBe('world')
		})

		it('none + UPDATED(P) stores UPDATED with the masked fields', () => {
			const pending = emptyMap()
			mergeChange(pending, updated('a', { referenceFrame: 'world' }, ['reference_frame']))

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.UPDATED)
			expect(entry?.fields).toEqual(new Set(['referenceFrame']))
		})

		it('none + UPDATED with no mask stores full state (fields undefined)', () => {
			const pending = emptyMap()
			mergeChange(pending, updated('a', { referenceFrame: 'world' }))

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.UPDATED)
			expect(entry?.fields).toBeUndefined()
		})

		it('none + REMOVED stores REMOVED with fields undefined', () => {
			const pending = emptyMap()
			mergeChange(pending, removed('a'))

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.REMOVED)
			expect(entry?.fields).toBeUndefined()
		})
	})

	describe('starting from a pending ADDED', () => {
		it('ADDED + ADDED replaces the transform, stays ADDED', () => {
			const pending = emptyMap()
			mergeChange(pending, added('a', { referenceFrame: 'first' }))
			mergeChange(pending, added('a', { referenceFrame: 'second' }))

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.ADDED)
			expect(entry?.transform.referenceFrame).toBe('second')
		})

		it('ADDED + UPDATED(P) copies only the masked fields, stays ADDED with fields undefined', () => {
			const pending = emptyMap()
			mergeChange(pending, added('a', { referenceFrame: 'first', physicalObject: undefined }))
			mergeChange(pending, updated('a', { referenceFrame: 'second' }, ['reference_frame']))

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.ADDED)
			expect(entry?.fields).toBeUndefined()
			expect(entry?.transform.referenceFrame).toBe('second')
		})

		it('ADDED + full-state UPDATED replaces the transform outright', () => {
			const pending = emptyMap()
			mergeChange(pending, added('a', { referenceFrame: 'first' }))
			mergeChange(pending, updated('a', { referenceFrame: 'second' }))

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.ADDED)
			expect(entry?.transform.referenceFrame).toBe('second')
		})

		it('ADDED + REMOVED replaces with REMOVED', () => {
			const pending = emptyMap()
			mergeChange(pending, added('a'))
			mergeChange(pending, removed('a', { referenceFrame: 'gone' }))

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.REMOVED)
			expect(entry?.transform.referenceFrame).toBe('gone')
		})
	})

	describe('starting from a pending UPDATED', () => {
		it('UPDATED(Q) + ADDED replaces with ADDED, fields undefined', () => {
			const pending = emptyMap()
			mergeChange(pending, updated('a', { referenceFrame: 'first' }, ['reference_frame']))
			mergeChange(pending, added('a', { referenceFrame: 'second' }))

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.ADDED)
			expect(entry?.fields).toBeUndefined()
			expect(entry?.transform.referenceFrame).toBe('second')
		})

		it('UPDATED(Q) + UPDATED(P) copies P and unions fields to Q ∪ P', () => {
			const pending = emptyMap()
			mergeChange(pending, updated('a', { referenceFrame: 'first' }, ['reference_frame']))
			mergeChange(pending, updated('a', { physicalObject: undefined }, ['metadata']))

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.UPDATED)
			expect(entry?.fields).toEqual(new Set(['referenceFrame', 'metadata']))
			expect(entry?.transform.referenceFrame).toBe('first')
		})

		it('UPDATED(Q) + full-state UPDATED replaces the transform, fields undefined', () => {
			const pending = emptyMap()
			mergeChange(pending, updated('a', { referenceFrame: 'first' }, ['reference_frame']))
			mergeChange(pending, updated('a', { referenceFrame: 'second' }))

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.UPDATED)
			expect(entry?.fields).toBeUndefined()
			expect(entry?.transform.referenceFrame).toBe('second')
		})

		it('full-state UPDATED + UPDATED(P) copies P and leaves fields undefined', () => {
			const pending = emptyMap()
			mergeChange(pending, updated('a', { referenceFrame: 'first' }))
			mergeChange(
				pending,
				updated('a', { poseInObserverFrame: new PoseInFrame({ referenceFrame: 'newPose' }) }, [
					'pose_in_observer_frame',
				])
			)

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.UPDATED)
			expect(entry?.fields).toBeUndefined()
			expect(entry?.transform.poseInObserverFrame?.referenceFrame).toBe('newPose')
		})

		it('UPDATED + REMOVED replaces with REMOVED', () => {
			const pending = emptyMap()
			mergeChange(pending, updated('a', {}, ['reference_frame']))
			mergeChange(pending, removed('a'))

			expect(pending.get('a')?.changeType).toBe(TransformChangeType.REMOVED)
		})
	})

	describe('starting from a pending REMOVED', () => {
		it('REMOVED + ADDED replaces with ADDED (full state)', () => {
			const pending = emptyMap()
			mergeChange(pending, removed('a'))
			mergeChange(pending, added('a', { referenceFrame: 'back' }))

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.ADDED)
			expect(entry?.fields).toBeUndefined()
			expect(entry?.transform.referenceFrame).toBe('back')
		})

		it('REMOVED + UPDATED keeps REMOVED unchanged', () => {
			const pending = emptyMap()
			mergeChange(pending, removed('a', { referenceFrame: 'gone' }))
			mergeChange(pending, updated('a', { referenceFrame: 'ignored' }, ['reference_frame']))

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.REMOVED)
			expect(entry?.transform.referenceFrame).toBe('gone')
		})

		it('REMOVED + REMOVED keeps REMOVED', () => {
			const pending = emptyMap()
			mergeChange(pending, removed('a', { referenceFrame: 'first' }))
			mergeChange(pending, removed('a', { referenceFrame: 'second' }))

			const entry = pending.get('a')
			expect(entry?.changeType).toBe(TransformChangeType.REMOVED)
			expect(entry?.transform.referenceFrame).toBe('first')
		})
	})

	it('Map.set on an existing key keeps its original position relative to other uuids', () => {
		const pending = emptyMap()
		mergeChange(pending, added('a'))
		mergeChange(pending, added('b'))
		mergeChange(pending, updated('a', { referenceFrame: 'moved' }, ['reference_frame']))

		expect([...pending.keys()]).toEqual(['a', 'b'])
	})

	it('resolves a snake_case mask path to its camelCase top-level field', () => {
		const pending = emptyMap()
		mergeChange(
			pending,
			updated('a', { poseInObserverFrame: undefined }, ['pose_in_observer_frame.pose.x'])
		)

		expect(pending.get('a')?.fields).toEqual(new Set(['poseInObserverFrame']))
	})

	it('drops an unknown path, and an all-unknown mask counts as full state', () => {
		const pending = emptyMap()
		mergeChange(pending, updated('a', {}, ['bogus_field']))

		expect(pending.get('a')?.fields).toBeUndefined()
	})

	it('does not mutate the incoming event transform when copying fields', () => {
		const pending = emptyMap()
		mergeChange(pending, added('a', { referenceFrame: 'first' }))

		const incoming = updated('a', { referenceFrame: 'second' }, ['reference_frame'])
		mergeChange(pending, incoming)

		expect(incoming.transform.referenceFrame).toBe('second')
	})
})
