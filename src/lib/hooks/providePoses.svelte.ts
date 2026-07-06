import { commonApi, MachineConnectionEvent } from '@viamrobotics/sdk'
import { createRobotQuery, useConnectionStatus, useRobotClient } from '@viamrobotics/svelte-sdk'
import { untrack } from 'svelte'
import { Matrix4 } from 'three'

import { RefetchRates } from '$lib/components/overlay/RefreshRate.svelte'
import { traits, useParentName, useQuery, useTrait } from '$lib/ecs'
import { useLogs } from '$lib/plugins'
import { poseToMatrix } from '$lib/transform'

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

/**
 * Mirrors each live-machine frame's kinematics-resolved pose into its
 * `LiveMatrix` trait. Watches every entity with `FramesAPI` and drives one
 * `getPose` poll per frame, writing the result so `Frame.svelte` can compose
 * the rendered transform via `composeLocalMatrix(live, baseline, edited)`.
 *
 * Replaces the former per-entity `<Pose>` wrapper component with a single
 * reactor mounted alongside the other `provide*` hooks, following the
 * `provideGeometries` shape: hooks hoisted to init, one query per entity built
 * in a top-level `$derived`, consumed in effects.
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
		enabled: interval !== RefetchRates.OFF && environment.current.viewerMode === 'monitor',
		refetchInterval: interval === RefetchRates.MANUAL ? (false as const) : interval,
	})

	/**
	 * One `getPose` query per frame entity. Rebuilt when query membership
	 * changes; within a stable set, name / parent / subtype reactivity flows
	 * through each query's args closure, so a reparent or subtype update
	 * refetches without rebuilding the list.
	 */
	const poseQueries = $derived(
		frameEntities.current.map((entity) => {
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
					const parentResource = parentFrameName
						? resourceByName.current[parentFrameName]
						: undefined

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
		})
	)

	// Register every query with the manual-refetch registry so the
	// ConnectionSettings "refetch poses" action reaches each one.
	$effect(() => {
		const unsubs = poseQueries.map(({ query }) => addQueryToRefetch(query))
		return () => {
			for (const unsub of unsubs) unsub()
		}
	})

	// Kick an initial fetch for every frame once connected in monitor mode.
	$effect(() => {
		if (
			environment.current.viewerMode === 'monitor' &&
			frames.current &&
			connectionStatus.current === MachineConnectionEvent.CONNECTED
		) {
			const queries = poseQueries
			untrack(() => {
				for (const { query } of queries) query.refetch()
			})
		}
	})

	// Per-frame fetch/error logging. A single message at high refresh rates
	// avoids one log line per frame per tick.
	$effect(() => {
		if (interval === RefetchRates.FPS_30 || interval === RefetchRates.FPS_60) {
			return logs.add(`Fetching poses every ${interval}ms...`)
		}

		for (const { name, query } of poseQueries) {
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
		for (const { entity, query } of poseQueries) {
			untrack(() => {
				$effect(() => {
					if (environment.current.viewerMode !== 'monitor') return

					const pose = query.data?.pose
					if (!pose || !entity.isAlive()) return

					const live = entity.get(traits.LiveMatrix)
					if (live) {
						poseToMatrix(pose, live)
						entity.changed(traits.LiveMatrix)
					} else {
						entity.add(traits.LiveMatrix(poseToMatrix(pose, new Matrix4())))
					}
				})
			})
		}
	})
}
