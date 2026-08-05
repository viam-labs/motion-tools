import { MachineConnectionEvent, Transform } from '@viamrobotics/sdk'
import {
	createRobotQuery,
	useConnectionStatus,
	useMachineStatus,
	useRobotClient,
} from '@viamrobotics/svelte-sdk'
import { type ConfigurableTrait, type Entity } from 'koota'
import { getContext, setContext, untrack } from 'svelte'
import { Vector3 } from 'three'

import { resourceNameToColor, subtypeToColor } from '$lib/color'
import { hierarchy, traits, useWorld } from '$lib/ecs'
import {
	createPoseFromOrientation,
	parseKinematicsGeometry,
	type RawKinematicsModel,
} from '$lib/kinematicsTransform'
import { Pose } from '$lib/math'
import { useLogs } from '$lib/plugins'

import { useConfigFrames } from './useConfigFrames.svelte'
import { useEnvironment } from './useEnvironment.svelte'
import { usePartConfig } from './usePartConfig.svelte'
import { useResourceByName } from './useResourceByName.svelte'

interface TransformMetadata {
	fromKinematics: boolean
	isEndEffector: boolean
}

interface FramesContext {
	current: (Transform & Partial<TransformMetadata>)[]
	/** Whether the current part's frame set has been reconciled into the world. */
	readonly isReady: boolean
}

interface KinematicNode {
	id: string
	parent?: string
	isLink: boolean
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
		const kinematicsFrames: Record<string, Transform & TransformMetadata> = {}

		for (const [componentName, kinematicJson] of Object.entries(kinematicsByComponent)) {
			const links = kinematicJson.links ?? []
			// Scoped per component: two arms of the same model share link ids.
			const nodes: Record<string, KinematicNode> = {}

			for (const link of links) {
				nodes[link.id] = {
					id: link.id,
					parent: link.parent,
					isLink: true,
				}
			}
			for (const joint of kinematicJson.joints ?? []) {
				nodes[joint.id] = {
					id: joint.id,
					parent: joint.parent,
					isLink: false,
				}
			}

			// A link nothing else hangs off of terminates the chain. Array order in
			// the model JSON is not a guarantee, so don't read it as one.
			const parentIds = new Set(Object.values(nodes).map((node) => node.parent))

			for (const link of links) {
				const frameName = `${componentName}:${link.id}`
				const pose = createPoseFromOrientation(link.translation, link.orientation)
				// Joints carry no static offset at zero configuration, so a link hangs
				// off its nearest link ancestor. `seen` guards against a malformed
				// model whose parent chain loops back on itself.
				let parent: KinematicNode | undefined =
					link.parent === undefined ? undefined : nodes[link.parent]
				const seen = new Set<string>()
				while (parent && !parent.isLink) {
					if (seen.has(parent.id)) {
						parent = undefined
						break
					}
					seen.add(parent.id)
					parent = parent.parent === undefined ? undefined : nodes[parent.parent]
				}
				const parentFrameName = parent ? `${componentName}:${parent.id}` : componentName

				kinematicsFrames[frameName] = {
					fromKinematics: true,
					isEndEffector: !parentIds.has(link.id),
					uuid: new Uint8Array(0),
					referenceFrame: frameName,
					poseInObserverFrame: {
						referenceFrame: parentFrameName,
						pose,
					},
				}

				if (link.geometry) {
					const geo = parseKinematicsGeometry(link.geometry)
					if (geo.center) {
						// `Center` renders local to this frame (`WorldMatrix × Center`), and
						// geometries only land correctly once the link's own rotation is
						// divided back out — so `link.geometry`'s pose behaves as though it
						// is expressed in the same frame as `link.translation`/`link.orientation`
						// rather than in the link's own rotated frame. Compute the link-local
						// pose as `P_link⁻¹ ∘ P_geometry`.
						//
						// This reads against rdk, where `LinkConfig.ParseConfig` passes the
						// geometry through untouched and `staticFrame.Geometries()` tags it
						// with the link's *own* frame name — which would make this a double
						// transform. Placement is correct in practice; revisit here first if
						// a link with both a rotation and a geometry offset looks wrong.

						const frameQuat = pose.toQuaternion()
						const invFrameQuat = frameQuat.clone().invert()

						const geoQuat = new Pose().copy(geo.center).toQuaternion()

						const offset = new Vector3(
							geo.center.x - pose.x,
							geo.center.y - pose.y,
							geo.center.z - pose.z
						).applyQuaternion(invFrameQuat)

						geo.center.x = offset.x
						geo.center.y = offset.y
						geo.center.z = offset.z

						invFrameQuat.multiply(geoQuat)

						// setFromQuaternion only updates orientation. Copy the center first so the
						// link-local translation calculated above is not reset to the origin.
						geo.center = new Pose().copy(geo.center).setFromQuaternion(invFrameQuat)
					}

					kinematicsFrames[frameName].physicalObject = geo
				}
			}
		}
		return kinematicsFrames
	})

	const frames = $derived.by(() => {
		const frames: Record<string, Transform> = {}

		for (const { frame } of query.data ?? []) {
			if (frame === undefined) {
				continue
			}

			frames[frame.referenceFrame] = frame
		}

		// Let config frames take priority in build mode (the user is authoring
		// the scene) or when we don't have a live robot connection. The latter
		// covers DISCONNECTED, CONNECTING, and the undefined case where the
		// embedder never provided a dial config (e.g. the Viam app's
		// dialConfigsForParts filters to live parts only, so offline parts
		// never transition through DISCONNECTED).
		if (isBuildMode || connectionStatus.current !== MachineConnectionEvent.CONNECTED) {
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
				const resourceName = currentResourcesByName[frame.referenceFrame]
				const color =
					resourceNameToColor(resourceName) ??
					subtypeToColor(currentComponentSubtypeByName[frame.referenceFrame])

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
							existing.set(traits.Color, color)
						}
					}

					if (center && !center.equals(existing.get(traits.Center))) {
						existing.set(traits.Center, center)
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
