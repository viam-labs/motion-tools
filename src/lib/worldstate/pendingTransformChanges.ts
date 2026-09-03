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
 * Wall-clock budget for one flush callback. Sized under a third of a 60 Hz frame so
 * the render and the Svelte flush that follow the callback still fit the frame.
 */
export const FLUSH_BUDGET_MS = 6

/**
 * Spawns plus destroys allowed per flush. Each one queues Threlte mount or teardown
 * work that runs after the callback returns, where the ms budget cannot see it.
 */
export const FLUSH_MAX_SPAWNS = 16

/** Drain cadence while the tab is hidden and `requestAnimationFrame` is paused. */
export const HIDDEN_FLUSH_INTERVAL_MS = 250

/** What applying one pending change did; a destroy counts as a spawn for budgeting. */
export interface ApplyOutcome {
	spawned: boolean
}

export interface FlushBudget {
	now: () => number
	budgetMs: number
	maxSpawns: number
}

export interface DrainResult {
	applied: number
	spawns: number
	remaining: number
	/** Which limit ended the flush early, or `undefined` when the map drained. */
	exhausted: 'budget' | 'spawns' | undefined
}

export interface FlushScheduler {
	/** Idempotent: a flush already scheduled is not scheduled twice. */
	request(): void
	cancel(): void
}

/** The environment a scheduler runs in, injectable so tests can drive it. */
export interface FlushSchedulerDeps {
	flush: () => void
	isVisible: () => boolean
	requestFrame: (callback: () => void) => number
	cancelFrame: (handle: number) => void
	setTimer: (callback: () => void, ms: number) => number
	clearTimer: (handle: number) => void
	hiddenIntervalMs: number
}

/**
 * The top-level `Transform` field a field-mask path addresses, or `undefined` for a
 * path outside the message. `pose_in_observer_frame.pose.x` and `poseInObserverFrame.pose`
 * both resolve to `poseInObserverFrame`.
 */
export const topLevelField = (path: string): TransformField | undefined => {
	const [head] = path.split('.')
	return head === undefined ? undefined : FIELD_BY_PATH.get(head)
}
