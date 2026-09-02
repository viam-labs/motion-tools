import { describe, expect, it } from 'vitest'

import { topLevelField, type TransformField } from '../pendingTransformChanges'

const SPELLINGS: Array<[path: string, field: TransformField]> = [
	['reference_frame', 'referenceFrame'],
	['referenceFrame', 'referenceFrame'],
	['pose_in_observer_frame', 'poseInObserverFrame'],
	['poseInObserverFrame', 'poseInObserverFrame'],
	['physical_object', 'physicalObject'],
	['physicalObject', 'physicalObject'],
	['metadata', 'metadata'],
	['uuid', 'uuid'],
]

describe('topLevelField', () => {
	it.each(SPELLINGS)('resolves %s to %s', (path, field) => {
		expect(topLevelField(path)).toBe(field)
	})

	it('reads only the first path segment', () => {
		expect(topLevelField('pose_in_observer_frame.pose.x')).toBe('poseInObserverFrame')
		expect(topLevelField('metadata.fields.colors')).toBe('metadata')
	})

	it('rejects a head outside the message, including a differently cased one', () => {
		expect(topLevelField('velocity')).toBeUndefined()
		expect(topLevelField('PoseInObserverFrame')).toBeUndefined()
		expect(topLevelField('')).toBeUndefined()
	})
})
