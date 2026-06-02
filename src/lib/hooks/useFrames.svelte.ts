import { MachineConnectionEvent, Transform } from '@viamrobotics/sdk'
import {
	createRobotQuery,
	useConnectionStatus,
	useMachineStatus,
	useRobotClient,
} from '@viamrobotics/svelte-sdk'
import { type ConfigurableTrait, type Entity } from 'koota'
import { getContext, setContext, untrack } from 'svelte'
import { Matrix4 } from 'three'

import { resourceNameToColor, subtypeToColor } from '$lib/color'
import { hierarchy, traits, useWorld } from '$lib/ecs'
import { createPose, isPoseEqual, poseToMatrix } from '$lib/transform'

import { useConfigFrames } from './useConfigFrames.svelte'
import { useEnvironment } from './useEnvironment.svelte'
import { useFrameEditSession } from './useFrameEditSession.svelte'
import { useLogs } from './useLogs.svelte'
import { usePartConfig } from './usePartConfig.svelte'
import { useResourceByName } from './useResourceByName.svelte'

interface FramesContext {
	current: Transform[]
}

const key = Symbol('frames-context')

export const provideFrames = (partID: () => string) => {
	const configFrames = useConfigFrames()
	const partConfig = usePartConfig()
	const editSession = useFrameEditSession()
	const environment = useEnvironment()
	const world = useWorld()
	const resourceByName = useResourceByName()
	const client = useRobotClient(partID)
	const connectionStatus = useConnectionStatus(partID)
	const machineStatus = useMachineStatus(partID)
	const logs = useLogs()

	const pendingSaveKey = $derived(`viam-pending-save-revision:${partID()}`)

	let didRecentlyEdit = $state(false)

	let lastPartID: string | undefined
	$effect.pre(() => {
		const id = partID()
		if (lastPartID !== undefined && lastPartID !== id) {
			// Don't let an edited flag from the previous part bleed into the
			// new one — the merge condition would otherwise stay forced on for
			// a freshly-switched part the user hasn't touched.
			didRecentlyEdit = false
		}
		lastPartID = id
	})

	const isEditMode = $derived(environment.current.viewerMode === 'edit')
	const query = createRobotQuery(client, 'frameSystemConfig', () => ({
		refetchOnWindowFocus: false,
		enabled: partID() !== '' && !isEditMode,
	}))

	const revision = $derived(machineStatus.current?.config?.revision)

	$effect(() => {
		if (query.isFetching) {
			logs.add('Fetching frames...')
		} else if (query.error) {
			logs.add(`Frames: ${query.error.message}`, 'error')
		}
	})

	const frames = $derived.by(() => {
		const frames: Record<string, Transform> = {}

		if (!partConfig.hasPendingSave) {
			for (const { frame } of query.data ?? []) {
				if (frame === undefined) {
					continue
				}

				frames[frame.referenceFrame] = frame
			}
		}

		// Let config frames take priority if the user has made edits, has a
		// pending save, or we don't have a live robot connection. The latter
		// covers DISCONNECTED, CONNECTING, and the undefined case where the
		// embedder never provided a dial config (e.g. the Viam app's
		// dialConfigsForParts filters to live parts only, so offline parts
		// never transition through DISCONNECTED).
		//
		// isDirty is included alongside didRecentlyEdit because didRecentlyEdit
		// is set by a plain $effect (runs after DOM) and lags by one flush on
		// the first edit from monitor mode. isDirty is $state and flips
		// synchronously in updateFrame(), so configFrames becomes a tracked
		// dependency of this derivation the moment the user makes any edit.
		if (
			didRecentlyEdit ||
			partConfig.isDirty ||
			partConfig.hasPendingSave ||
			connectionStatus.current !== MachineConnectionEvent.CONNECTED
		) {
			const mergedFrames = {
				...frames,
				...configFrames.current,
			}

			/**
			 * Remove frames that have just been deleted locally for optimistic updates,
			 * or frames that have been removed by fragment overrides
			 */
			for (const name of configFrames.unsetFrames) {
				delete mergedFrames[name]
			}

			return mergedFrames
		}

		/**
		 * If we haven't edited and we have a robot connection,
		 * we only use frames reported by the machine
		 */
		return frames
	})

	const current = $derived(Object.values(frames))

	const entities = new Map<string, Entity | undefined>()

	$effect(() => {
		if (revision) {
			untrack(() => query.refetch())
		}
	})

	$effect(() => {
		const key = pendingSaveKey
		const storedRevision = sessionStorage.getItem(key)

		if (!storedRevision) {
			return
		}

		if (!revision) {
			if (!partConfig.hasPendingSave) {
				partConfig.setPendingSave()
			}
			return
		}

		if (revision === storedRevision) {
			if (!partConfig.hasPendingSave) {
				partConfig.setPendingSave()
			}
			return
		}

		sessionStorage.removeItem(key)
		partConfig.clearPendingSave()
		didRecentlyEdit = true
	})

	$effect(() => {
		if (partConfig.hasPendingSave && revision) {
			sessionStorage.setItem(pendingSaveKey, revision)
		}
	})

	const componentSubtypeByName = $derived.by(() => {
		const result: Record<string, string> = {}
		for (const { name, api } of partConfig.current.components ?? []) {
			if (api) {
				const subtype = api.split(':').at(-1)
				if (subtype) {
					result[name] = subtype
				}
			}
		}
		return result
	})

	$effect(() => {
		if (isEditMode) {
			didRecentlyEdit = true
		}
	})

	$effect.pre(() => {
		const currentResourcesByName = resourceByName.current
		const currentPartID = partID()
		const currentComponentSubtypeByName = componentSubtypeByName

		// We only want to update whenever "current" or "resourceByName.current" changes
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		current.length

		untrack(() => {
			const active: Record<string, boolean> = {}

			for (const frame of current) {
				const name = frame.referenceFrame
				const entityKey = `${currentPartID}:${name}`
				active[entityKey] = true

				const parent = frame.poseInObserverFrame?.referenceFrame
				const pose = createPose(frame.poseInObserverFrame?.pose)

				const center = frame.physicalObject?.center
					? createPose(frame.physicalObject.center)
					: undefined
				const resourceName = currentResourcesByName[frame.referenceFrame]
				const color =
					resourceNameToColor(resourceName) ??
					subtypeToColor(currentComponentSubtypeByName[frame.referenceFrame])

				const existing = entities.get(entityKey)

				if (existing) {
					// Active edit session owns the entity's traits for the duration of
					// the user's gesture. Skip the entire re-sync — re-setting Parent
					// would re-evaluate the <Portal> id and re-mount the group,
					// detaching the gizmo's drag target mid-stroke.
					if (editSession.current?.owns(existing)) {
						continue
					}

					hierarchy.setParent(existing, parent)

					if (color) {
						const cur = existing.get(traits.Color)
						if (!cur || cur.r !== color.r || cur.g !== color.g || cur.b !== color.b) {
							existing.set(traits.Color, color)
						}
					}

					if (center && !isPoseEqual(existing.get(traits.Center), center)) {
						existing.set(traits.Center, center)
					}

					traits.updateGeometryTrait(existing, frame.physicalObject)

					// Matrix is the "baseline" — the robot's config position before
					// the current round of edits. The world matrix formula is:
					//   WorldMatrix = live × baseline⁻¹ × edited
					// When live ≈ baseline (robot at rest), this simplifies to `edited`,
					// which is the user's desired position. Keeping baseline stale while
					// the user has unsaved edits is what makes the 3D preview work.
					//
					// We use isDirty (not isEditMode) because isEditMode is driven by
					// viewerMode, which is set in a plain $effect that runs *after*
					// $effect.pre — so isEditMode is stale on the first update from
					// monitor mode. isDirty is $state and updates synchronously with
					// updateFrame(), so it's always current here.
					//
					// !isDirty also handles the post-save case: standalone save() clears
					// isDirty synchronously after the mutation resolves (at the same time
					// hasPendingSave is set), so the baseline unlocks to the saved config
					// as soon as the save completes. If the user edits again before the
					// robot confirms (isDirty=true again), the baseline re-freezes,
					// keeping the new preview correct.
					if (!partConfig.isDirty) {
						const baseline = existing.get(traits.Matrix)
						if (baseline) {
							poseToMatrix(pose, baseline)
							existing.changed(traits.Matrix)
						}
					}

					if (!existing.has(traits.LiveMatrix)) {
						existing.add(traits.LiveMatrix(poseToMatrix(pose, new Matrix4())))
					}

					// EditedMatrix is the user's desired local pose. It must stay in
					// sync with the config so that previews (frame builder confirm,
					// arm-tab edits) appear immediately in the 3D view.
					//
					// The one exception: while a drag gesture is active, the session
					// owns the entity and writes EditedMatrix directly via stagePose().
					// Overwriting it here mid-drag would fight the gizmo and snap the
					// frame to an intermediate config value.
					if (!isEditMode || !editSession.current) {
						const edited = existing.get(traits.EditedMatrix)
						if (edited) {
							poseToMatrix(pose, edited)
							existing.changed(traits.EditedMatrix)
						}
					}

					continue
				}

				const entityTraits: ConfigurableTrait[] = [
					traits.Name(name),
					traits.Matrix(poseToMatrix(pose, new Matrix4())),
					traits.EditedMatrix(poseToMatrix(pose, new Matrix4())),
					traits.LiveMatrix(poseToMatrix(pose, new Matrix4())),
					traits.FramesAPI,
					traits.Transformable,
					traits.ShowAxesHelper,
					...hierarchy.parentTraits(parent),
				]

				if (color) {
					entityTraits.push(traits.Color(color))
				}

				if (center) {
					entityTraits.push(traits.Center(center))
				}

				if (frame.physicalObject) {
					entityTraits.push(traits.Geometry(frame.physicalObject))
				}

				const entity = world.spawn(...entityTraits)

				entities.set(entityKey, entity)
			}

			// Clean up non-active entities
			for (const [entityKey, entity] of entities) {
				if (!active[entityKey]) {
					entity?.destroy()
					entities.delete(entityKey)
				}
			}
		})
	})

	// Clear all entities on unmount
	$effect(() => {
		return () => {
			for (const [, entity] of entities) {
				entity?.destroy()
			}

			entities.clear()
		}
	})

	setContext<FramesContext>(key, {
		get current() {
			return current
		},
	})
}

export const useFrames = (): FramesContext => {
	return getContext<FramesContext>(key)
}
