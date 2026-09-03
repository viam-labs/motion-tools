import type { TransformChangeType, TransformWithUUID } from '@viamrobotics/sdk'

/** Top-level `Transform` fields a field-mask path can address. */
export type TransformField =
	| 'referenceFrame'
	| 'poseInObserverFrame'
	| 'physicalObject'
	| 'metadata'
	| 'uuid'

/**
 * Every spelling a field-mask path may start with. Spec-compliant backends emit proto
 * snake_case, some emit the JSON camelCase; the accepted set is closed, so a lookup
 * beats a case converter that would also have to be right about inputs we never see.
 */
const FIELD_BY_PATH: ReadonlyMap<string, TransformField> = new Map([
	['reference_frame', 'referenceFrame'],
	['referenceFrame', 'referenceFrame'],
	['pose_in_observer_frame', 'poseInObserverFrame'],
	['poseInObserverFrame', 'poseInObserverFrame'],
	['physical_object', 'physicalObject'],
	['physicalObject', 'physicalObject'],
	['metadata', 'metadata'],
	['uuid', 'uuid'],
])

/**
 * One stream event as the coalescer receives it. `updatedFields` is the wire
 * field mask; an UPDATED with no paths means the transform is full state.
 */
export interface IncomingChange {
	changeType: TransformChangeType
	transform: TransformWithUUID
	updatedFields?: { paths: string[] }
}

/**
 * The latest known change for one UUID. `fields` is the set of top-level fields
 * an UPDATED carries; `undefined` means the transform is full state (an ADDED, a
 * REMOVED, or an UPDATED whose mask was empty).
 */
export interface PendingChange {
	changeType: TransformChangeType
	transform: TransformWithUUID
	fields: Set<TransformField> | undefined
}

/** Keyed by `uuidString`. Insertion order is apply order, so parents stay ahead of children. */
export type PendingTransformChanges = Map<string, PendingChange>

/**
 * The top-level `Transform` field a field-mask path addresses, or `undefined` for a
 * path outside the message. `pose_in_observer_frame.pose.x` and `poseInObserverFrame.pose`
 * both resolve to `poseInObserverFrame`.
 */
export const topLevelField = (path: string): TransformField | undefined => {
	const [head] = path.split('.')
	return head === undefined ? undefined : FIELD_BY_PATH.get(head)
}
