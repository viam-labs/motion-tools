import type { Entity } from 'koota'

import { commonApi, MachineConnectionEvent } from '@viamrobotics/sdk'
import { createRobotQuery, useConnectionStatus, useRobotClient } from '@viamrobotics/svelte-sdk'
import { untrack } from 'svelte'

import { RefetchRates } from '$lib/components/overlay/RefreshRate.svelte'
import { traits, useParentName, useQuery, useTrait } from '$lib/ecs'
import { Pose } from '$lib/math'
import { useLogs } from '$lib/plugins'

import { useEnvironment } from './useEnvironment.svelte'
import { useFrames } from './useFrames.svelte'
import { useRefetchPoses } from './useRefetchPoses'
import { useResourceByName } from './useResourceByName.svelte'
import { RefreshRates, useSettings } from './useSettings.svelte'

/**
 * Component subtypes whose live kinematics pose is reported under a
 * `<name>_origin` frame rather than the bare component name.
 */
const originFrameComponentTypes = new Set(['arm', 'gantry', 'gripper', 'base'])

const tempPose = new Pose()

export interface PoseSnapshotSource {
	/** True once every frame in the selected config has a pose query. */
	readonly isReady: boolean
	refetch: () => Promise<PromiseSettledResult<unknown>[]>
}

/**
 * Mirrors each live-machine frame's kinematics-resolved pose into its
 * `LiveMatrix` trait. Watches every entity with `FramesAPI` and drives one
 * `getPose` poll per frame, writing the result so `Frame.svelte` can compose
 * the rendered transform via `composeLocalMatrix(live, baseline, edited)`.
 *
 * Replaces the former per-entity `<Pose>` wrapper component with a single
 * reactor mounted alongside the other `provide*` hooks. Each frame's query is
 * built in its own `$effect.root` and tracked in a stable map, so adding or
 * removing one frame never tears down the other frames' queries.
 */
export const providePoses = (partID: () => string) => {
	const environment = useEnvironment()
	const settings = useSettings()
	const logs = useLogs()
	const robotClient = useRobotClient(partID)
	const connectionStatus = useConnectionStatus(partID)
	const resourceByName = useResourceByName()
	const frames = useFrames()
	const { addQueryToRefetch } = useRefetchPoses()

	const frameEntities = useQuery(traits.FramesAPI)

	const interval = $derived(settings.current.refreshRates[RefreshRates.poses])
	const options = $derived({
		enabled: interval !== RefetchRates.OFF && environment.isLive,
		refetchInterval: interval === RefetchRates.MANUAL ? (false as const) : interval,
	})

	/**
	 * Builds one frame's `getPose` query plus the reactive name/parent it reads.
	 * Every hook here (`useTrait`, `useParentName`, `createRobotQuery`) allocates
	 * `$state` and registers `$effect`s / Koota subscriptions, so each entry is
	 * created inside its own `$effect.root` (below) — never inside a `$derived`
	 * over the frame list, which would tear down and re-fetch *every* frame's
	 * query whenever a single frame is added or removed.
	 *
	 * Within a stable entry, name / parent / subtype reactivity flows through
	 * the query's args closure, so a reparent or subtype update refetches
	 * without rebuilding anything.
	 */
	const buildEntry = (entity: Entity) => {
		const name = useTrait(() => entity, traits.Name)
		const parentName = useParentName(() => entity)

		// Resolve the `<name>_origin` frame names inside the query's (already
		// reactive) args closure, so name / parent / subtype changes refetch
		// without turning each frame into its own module-level `$derived`s.
		const query = createRobotQuery(
			robotClient,
			'getPose',
			() => {
				const frameName = name.current
				const parentFrameName = parentName.current
				const resource = frameName ? resourceByName.current[frameName] : undefined
				const parentResource = parentFrameName ? resourceByName.current[parentFrameName] : undefined

				const resolvedName = originFrameComponentTypes.has(resource?.subtype ?? '')
					? `${frameName}_origin`
					: frameName
				const resolvedParent = originFrameComponentTypes.has(parentResource?.subtype ?? '')
					? `${parentFrameName}_origin`
					: parentFrameName

				return [resolvedName, resolvedParent ?? 'world', []] as [
					string,
					string,
					commonApi.Transform[],
				]
			},
			() => options
		)

		return { entity, name, query }
	}

	type PoseEntry = ReturnType<typeof buildEntry> & { dispose: () => void }

	const entryByEntity = new Map<Entity, PoseEntry>()
	let entries = $state.raw<PoseEntry[]>([])

	/**
	 * Reconcile the query map against the live frame set: a newly-added frame
	 * gets a fresh `$effect.root`, a departed one is disposed, and a tick that
	 * doesn't change membership is a no-op. `entries` is only reassigned when
	 * the set actually changes, so stable frames keep their query instances.
	 */
	$effect(() => {
		const present = new Set(frameEntities.current)
		let changed = false

		for (const entity of frameEntities.current) {
			if (entryByEntity.has(entity)) continue

			let built!: ReturnType<typeof buildEntry>
			const dispose = $effect.root(() => {
				built = buildEntry(entity)
			})
			entryByEntity.set(entity, { ...built, dispose })
			changed = true
		}

		for (const [entity, entry] of entryByEntity) {
			if (present.has(entity)) continue
			entry.dispose()
			entryByEntity.delete(entity)
			changed = true
		}

		if (changed) {
			entries = [...entryByEntity.values()]
		}
	})

	// Dispose every entry's root when the provider unmounts. Reads nothing
	// reactive, so it runs once and only its teardown fires — the reconcile
	// effect above must not dispose on its per-run cleanup.
	$effect(() => () => {
		for (const entry of entryByEntity.values()) entry.dispose()
		entryByEntity.clear()
	})

	// Register every query with the manual-refetch registry so the
	// ConnectionSettings "refetch poses" action reaches each one.
	$effect(() => {
		const unsubs = entries.map(({ query }) => addQueryToRefetch(query))
		return () => {
			for (const unsub of unsubs) unsub()
		}
	})

	// Kick an initial fetch for every frame once connected in a live mode.
	$effect(() => {
		if (
			environment.isLive &&
			frames.current &&
			connectionStatus.current === MachineConnectionEvent.CONNECTED
		) {
			// Read `entries` inside `untrack` so this fires on the connect edge,
			// not every time a frame is added — new entries auto-fetch on creation.
			untrack(() => {
				for (const { query } of entries) query.refetch()
			})
		}
	})

	// Per-frame fetch/error logging. A single message at high refresh rates
	// avoids one log line per frame per tick.
	$effect(() => {
		if (interval === RefetchRates.FPS_30 || interval === RefetchRates.FPS_60) {
			return logs.add(`Fetching poses every ${interval}ms...`)
		}

		for (const { name, query } of entries) {
			untrack(() => {
				$effect(() => {
					if (query.isFetching) {
						logs.add(`Fetching pose for ${name.current}...`)
					} else if (query.error) {
						logs.add(`Error fetching pose for ${name.current}: ${query.error.message}`, 'error')
					}
				})
			})
		}
	})

	/**
	 * Mirror each resolved pose into `LiveMatrix`. One nested effect per frame
	 * so a single pose update only rewrites that frame's matrix — and only its
	 * subtree re-composes in `provideWorldMatrix` — rather than every frame's.
	 * The write signals `entity.changed(LiveMatrix)`, which drives the
	 * microtask-deferred WorldMatrix walk, so a plain `$effect` suffices (same
	 * as the `Matrix` write in `provideGeometries`).
	 */
	$effect(() => {
		for (const { entity, query } of entries) {
			untrack(() => {
				$effect(() => {
					if (!environment.isLive) return

					const pose = query.data?.pose
					if (!pose || !entity.isAlive()) return

					const live = entity.get(traits.LiveMatrix)
					if (live) {
						tempPose.copy(pose).toMatrix4(live)

						entity.changed(traits.LiveMatrix)
					} else {
						entity.add(traits.LiveMatrix(tempPose.copy(pose).toMatrix4()))
					}
				})
			})
		}
	})

	return {
		get isReady() {
			return entries.length === frames.current.length
		},
		refetch: () => Promise.allSettled(entries.map(({ query }) => query.refetch())),
	} satisfies PoseSnapshotSource
}
