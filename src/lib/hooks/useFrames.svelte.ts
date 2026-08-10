import { MachineConnectionEvent, Transform } from '@viamrobotics/sdk'
import {
	createRobotQuery,
	useConnectionStatus,
	useMachineStatus,
	useRobotClient,
} from '@viamrobotics/svelte-sdk'
import { type ConfigurableTrait, type Entity } from 'koota'
import { getContext, setContext, untrack } from 'svelte'

import type { RawKinematicsModel } from '$lib/kinematicsTransform'

import { resourceNameToColor, subtypeToColor } from '$lib/color'
import { hierarchy, setOrAddTrait, traits, useWorld } from '$lib/ecs'
import {
	componentOfOriginFrame,
	deriveKinematicsFrames,
	originFrameName,
	ownerOfInternalFrame,
} from '$lib/kinematicsFrames'
import { Pose } from '$lib/math'
import { useLogs } from '$lib/plugins'

import { useConfigFrames } from './useConfigFrames.svelte'
import { useEnvironment } from './useEnvironment.svelte'
import { usePartConfig } from './usePartConfig.svelte'
import { useResourceByName } from './useResourceByName.svelte'

interface FramesContext {
	current: Transform[]
	/** Whether the current part's frame set has been reconciled into the world. */
	readonly isReady: boolean
}

const key = Symbol('frames-context')

export const provideFrames = (partID: () => string) => {
	const configFrames = useConfigFrames()
	const partConfig = usePartConfig()
	const environment = useEnvironment()
	const world = useWorld()
	const resourceByName = useResourceByName()
	const client = useRobotClient(partID)
	const connectionStatus = useConnectionStatus(partID)
	const machineStatus = useMachineStatus(partID)
	const logs = useLogs()

	// In build mode the user authors the scene from the part config, so config
	// frames win and the live frame-system query is paused (see the merge below).
	const isBuildMode = $derived(environment.current.mode === 'build')
	const query = createRobotQuery(client, 'frameSystemConfig', () => ({
		refetchOnWindowFocus: false,
		enabled: partID() !== '' && !isBuildMode,
	}))

	const revision = $derived(machineStatus.current?.config?.revision)

	$effect(() => {
		if (query.isFetching) {
			logs.add('Fetching frames...')
		} else if (query.error) {
			logs.add(`Frames: ${query.error.message}`, 'error')
		}
	})

	const kinematicsByComponent = $derived.by(() => {
		const result: Record<string, RawKinematicsModel> = {}
		for (const fsConfig of query.data ?? []) {
			const componentName = fsConfig.frame?.referenceFrame
			if (
				componentName === undefined ||
				componentName === '' ||
				fsConfig.kinematics === undefined ||
				Object.keys(fsConfig.kinematics.fields).length === 0
			) {
				continue
			}
			result[componentName] = fsConfig.kinematics.toJson() as RawKinematicsModel
		}
		return result
	})

	const kinematicsDerivedFrames = $derived.by(() => {
		const frames: Record<string, Transform> = {}

		for (const [componentName, model] of Object.entries(kinematicsByComponent)) {
			for (const frame of deriveKinematicsFrames(componentName, model)) {
				frames[frame.referenceFrame] = frame
			}
		}

		return frames
	})

	/**
	 * A component that supplies kinematics owns two frames in rdk: `<name>_origin`
	 * carries the config `frame`'s placement, and `<name>` is the model frame at
	 * the end effector. Renaming the incoming entry frees `<name>` for the frame
	 * {@link deriveKinematicsFrames} synthesizes, which is what lets a child
	 * configured `parent: arm-1` mount to the tip without any special case.
	 *
	 * Only a frame's *own* name is rewritten. Parent references are left alone
	 * precisely so they keep resolving to the tip.
	 */
	const toOriginName = $derived((name: string) =>
		name in kinematicsByComponent ? originFrameName(name) : name
	)

	/**
	 * The component a derived frame belongs to — `arm-1` for both `arm-1_origin`
	 * and `arm-1:upper_arm` — or the name itself for an ordinary frame. Both
	 * lookups are gated on the name actually being a kinematics component, so a
	 * component genuinely called `foo_origin` isn't mistaken for one.
	 */
	const ownerComponent = $derived((frameName: string) => {
		const namespaced = ownerOfInternalFrame(frameName)
		if (namespaced !== undefined && namespaced in kinematicsByComponent) {
			return namespaced
		}

		const origin = componentOfOriginFrame(frameName)
		if (origin !== undefined && origin in kinematicsByComponent) {
			return origin
		}

		return frameName
	})

	const frames = $derived.by(() => {
		const frames: Record<string, Transform> = {}

		for (const { frame } of query.data ?? []) {
			if (frame === undefined) {
				continue
			}

			const name = toOriginName(frame.referenceFrame)
			frames[name] = name === frame.referenceFrame ? frame : { ...frame, referenceFrame: name }
		}

		// Let config frames take priority in build mode (the user is authoring
		// the scene) or when we don't have a live robot connection. The latter
		// covers DISCONNECTED, CONNECTING, and the undefined case where the
		// embedder never provided a dial config (e.g. the Viam app's
		// dialConfigsForParts filters to live parts only, so offline parts
		// never transition through DISCONNECTED).
		if (isBuildMode || connectionStatus.current !== MachineConnectionEvent.CONNECTED) {
			const mergedFrames = { ...frames }

			// A config frame describes the component's mount, so it merges onto
			// `<name>_origin` for a kinematics component — the same key the live
			// frame system just wrote. Without the rename the two sources would
			// disagree on which node the config `frame` positions, and switching
			// modes would move the arm.
			for (const [name, frame] of Object.entries(configFrames.current)) {
				const originName = toOriginName(name)
				mergedFrames[originName] =
					originName === name ? frame : { ...frame, referenceFrame: originName }
			}

			/**
			 * Remove frames that have just been deleted locally for optimistic updates,
			 * or frames that have been removed by fragment overrides
			 */
			for (const name of configFrames.unsetFrames) {
				delete mergedFrames[toOriginName(name)]
			}

			return mergedFrames
		}

		/**
		 * If we haven't edited and we have a robot connection,
		 * we only use frames reported by the machine
		 */
		return frames
	})

	const current = $derived([...Object.values(frames), ...Object.values(kinematicsDerivedFrames)])

	const entities = new Map<string, Entity | undefined>()
	let reconciledFrames = $state.raw<Transform[]>()
	let reconciledPartID = $state<string>()

	$effect(() => {
		if (revision) {
			untrack(() => query.refetch())
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
		const currentResourcesByName = resourceByName.current
		const currentPartID = partID()
		const currentComponentSubtypeByName = componentSubtypeByName
		const currentFrames = current

		// We only want to update whenever "current" or "resourceByName.current" changes
		// eslint-disable-next-line @typescript-eslint/no-unused-expressions
		currentFrames.length

		untrack(() => {
			const active: Record<string, boolean> = {}

			for (const frame of currentFrames) {
				const name = frame.referenceFrame
				const entityKey = `${currentPartID}:${name}`
				active[entityKey] = true

				const parent = frame.poseInObserverFrame?.referenceFrame
				const pose = new Pose().copy(frame.poseInObserverFrame?.pose)

				const center = frame.physicalObject?.center
					? new Pose().copy(frame.physicalObject.center)
					: undefined
				// Colors resolve against the owning component, so an arm's links and
				// its origin keep the arm's color. Looking them up by their own name
				// finds nothing — neither is a resource.
				const owner = ownerComponent(name)
				const resourceName = currentResourcesByName[owner]
				const color =
					resourceNameToColor(resourceName) ?? subtypeToColor(currentComponentSubtypeByName[owner])

				const existing = entities.get(entityKey)

				if (existing) {
					// Sync the data-derived traits from config/live. EditedMatrix is
					// intentionally left untouched: it belongs to the editing layer
					// (FrameEditor), which creates it on edit and clears it on discard.
					// useFrames never reads or writes it, so this re-sync can't fight an
					// in-progress edit.
					hierarchy.setParent(existing, parent)

					if (color) {
						const cur = existing.get(traits.Color)
						if (!cur || cur.r !== color.r || cur.g !== color.g || cur.b !== color.b) {
							setOrAddTrait(existing, traits.Color, color)
						}
					}

					if (center && !center.equals(existing.get(traits.Center))) {
						setOrAddTrait(existing, traits.Center, center)
					}

					traits.updateGeometryTrait(existing, frame.physicalObject)

					// The baseline is the reference the WorldMatrix blend
					// (live × baseline⁻¹ × edited) composes the staged edit against.
					// Re-derive it from incoming config only while monitoring and clean:
					// freezing it in build mode (or with unsaved edits) keeps the blend
					// previewing the edit instead of collapsing to a stale LiveMatrix.
					if (!partConfig.isDirty && !isBuildMode) {
						const baseline = existing.get(traits.Matrix)
						if (baseline) {
							pose.toMatrix4(baseline)
							existing.changed(traits.Matrix)
						}
					}

					if (!existing.has(traits.LiveMatrix)) {
						existing.add(traits.LiveMatrix(pose.toMatrix4()))
					}

					continue
				}

				const entityTraits: ConfigurableTrait[] = [
					traits.Name(name),
					traits.Matrix(pose.toMatrix4()),
					traits.LiveMatrix(pose.toMatrix4()),
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

		reconciledFrames = currentFrames
		reconciledPartID = currentPartID
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
		get isReady() {
			return reconciledPartID === partID() && reconciledFrames === current
		},
	})
}

export const useFrames = (): FramesContext => {
	return getContext<FramesContext>(key)
}
