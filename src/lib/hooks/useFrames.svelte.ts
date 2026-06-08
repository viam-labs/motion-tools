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

		// Prefer config frames when the user has touched anything, has a pending
		// save, or has no live connection. isDirty covers the first edit
		// synchronously before didRecentlyEdit (set in a plain $effect) flips.
		// The undefined connection case covers offline parts whose embedder never
		// provides a dial config.
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

			// Optimistic deletions and fragment overrides
			for (const name of configFrames.unsetFrames) {
				delete mergedFrames[name]
			}

			return mergedFrames
		}

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

	// Pose.svelte updates LiveMatrix in its own flush, independent of the ECS
	// baseline update. While edits or a save are pending the two can race:
	// the robot moves to apply the new config (live shifts) before the baseline
	// has caught up, causing WorldMatrix = live × baseline⁻¹ × edited to
	// double-apply the delta. Keeping baseline equal to live during these states
	// collapses the formula to just edited — the correct preview.
	$effect(() => {
		return world.onChange(traits.LiveMatrix, (entity) => {
			if (!partConfig.isDirty && !partConfig.hasPendingSave) return
			const baseline = entity.get(traits.Matrix)
			const live = entity.get(traits.LiveMatrix)
			if (baseline && live) {
				baseline.copy(live)
				entity.changed(traits.Matrix)
			}
		})
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
					// Re-syncing Parent mid-drag re-mounts the gizmo's portal and
					// detaches the drag target — skip the entire update while the
					// session owns this entity.
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

					// Freeze the baseline while the user has unsaved edits so the
					// WorldMatrix formula (live × baseline⁻¹ × edited) previews the
					// edited position rather than amplifying any robot movement.
					// isDirty is used rather than isEditMode because isDirty is $state
					// and updates synchronously; isEditMode derives from viewerMode via
					// a plain $effect and lags by one flush.
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

					// Don't overwrite EditedMatrix while a drag is active — the session
					// writes it directly via stagePose() and this would fight it.
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
