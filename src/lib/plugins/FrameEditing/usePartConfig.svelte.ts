import type { JsonValue } from '@viamrobotics/sdk'

import { Pose, Struct } from '@viamrobotics/sdk'
import { createAppMutation, createAppQuery } from '@viamrobotics/svelte-sdk'
import { getContext, setContext } from 'svelte'

import { createFrame, type Frame } from '$lib/frame'
import { createPoseFromFrame } from '$lib/transform'

import { useFragmentInfo } from './useFragmentInfo.svelte'

const key = Symbol('part-config-context')

export interface PartConfig {
	components: { name: string; api?: string; frame?: Frame }[]
	fragment_mods?: {
		fragment_id: string
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		mods: any[]
	}[]
}

interface LocalPartConfig {
	isDirty: boolean
	hasPendingSave: boolean
	hasEditPermissions: boolean
	current: Struct

	set: (config: PartConfig) => void
	save?: () => void
	discardChanges?: () => void
	clearPendingSave: () => void
	setPendingSave: () => void
}

interface PartConfigContext {
	current: PartConfig
	isDirty: boolean
	hasPendingSave: boolean
	hasEditPermissions: boolean

	updateFrame: (
		componentName: string,
		referenceFrame: string,
		pose: Pose,
		geometry?: Frame['geometry']
	) => void
	deleteFrame: (componentName: string) => void
	createFrame: (componentName: string) => void
	save: () => void
	discardChanges: () => void
	clearPendingSave: () => void
	setPendingSave: () => void
}

export const providePartConfig = (
	partID: () => string,
	params: () => AppEmbeddedPartConfigProps | undefined
) => {
	const props = $derived(params())
	const config = $derived(props ? useEmbeddedPartConfig(props) : useStandalonePartConfig(partID))
	const fragmentInfo = useFragmentInfo()

	const getCurrent = () => {
		return (config.current?.toJson?.() ?? { components: [] }) as unknown as PartConfig
	}

	const current = $derived(getCurrent())

	const createFragmentFrame = (fragmentId: string, componentName: string) => {
		const newConfig = getCurrent()
		newConfig.fragment_mods ??= []

		let fragmentMod = newConfig.fragment_mods.find((mod) => mod.fragment_id === fragmentId)
		if (fragmentMod === undefined) {
			fragmentMod = {
				fragment_id: fragmentId,
				mods: [],
			}
			newConfig.fragment_mods.push(fragmentMod)
		}

		const modSetPath = `components.${componentName}.frame`
		const frame = {
			['$set']: {
				[modSetPath]: createFrame(),
			},
		}

		fragmentMod.mods.push(frame)
		config.set(newConfig)
	}

	const createPartFrame = (componentName: string) => {
		const newConfig = getCurrent()
		const component = newConfig?.components?.find((comp) => comp.name === componentName)
		if (component) {
			component.frame = createFrame()
		}
		config.set(newConfig)
	}

	const updateFragmentFrame = (
		fragmentId: string,
		componentName: string,
		referenceFrame: string,
		framePosition: Pose,
		frameGeometry?: Frame['geometry']
	) => {
		const newConfig = getCurrent()
		newConfig.fragment_mods ??= []

		let fragmentMod = newConfig.fragment_mods.find(
			(mod: { fragment_id: string }) => mod.fragment_id === fragmentId
		)
		if (fragmentMod === undefined) {
			fragmentMod = {
				fragment_id: fragmentId,
				mods: [],
			}
			newConfig.fragment_mods.push(fragmentMod)
		}

		const modSetPath = `components.${componentName}.frame`
		const frame = {
			['$set']: {
				[modSetPath]: {
					translation: {
						x: framePosition.x,
						y: framePosition.y,
						z: framePosition.z,
					},
					parent: referenceFrame,
					orientation: {
						type: 'ov_degrees',
						value: {
							x: framePosition.oX,
							y: framePosition.oY,
							z: framePosition.oZ,
							th: framePosition.theta,
						},
					},
					geometry:
						frameGeometry && frameGeometry.type !== 'none' ? { ...frameGeometry } : undefined,
				},
			},
		}
		if (frameGeometry === undefined || frameGeometry.type === 'none') {
			delete frame['$set'][modSetPath].geometry
		}

		const existingFrameIndex = fragmentMod.mods.findLastIndex(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(mod: any) => mod?.['$set']?.[modSetPath] !== undefined
		)
		if (existingFrameIndex === -1) {
			fragmentMod.mods.push(frame)
		} else {
			const existingGeometry = fragmentMod.mods[existingFrameIndex]['$set']?.[modSetPath].geometry
			if (existingGeometry && !frameGeometry) {
				frame['$set'][modSetPath].geometry = existingGeometry
			}
			fragmentMod.mods[existingFrameIndex] = frame
		}

		config.set(newConfig)
	}

	const updatePartFrame = (
		componentName: string,
		referenceFrame: string,
		pose: Pose,
		geometry?: Frame['geometry']
	) => {
		const newConfig = getCurrent()
		const component = newConfig.components?.find(({ name }) => name === componentName)

		if (!component) {
			return
		}

		if (component.frame) {
			const currentPose = createPoseFromFrame(component.frame)

			component.frame.parent = referenceFrame
			component.frame.translation = {
				x: pose.x ?? currentPose.x,
				y: pose.y ?? currentPose.y,
				z: pose.z ?? currentPose.z,
			}

			component.frame.orientation = {
				type: 'ov_degrees',
				value: {
					x: pose.oX ?? currentPose.oX,
					y: pose.oY ?? currentPose.oY,
					z: pose.oZ ?? currentPose.oZ,
					th: pose.theta ?? currentPose.theta,
				},
			}

			if (geometry) {
				if (geometry.type === 'none') {
					delete component.frame.geometry
				} else {
					component.frame.geometry = { ...geometry }
				}
			}
		}

		config.set(newConfig)
	}

	const deletePartFrame = (componentName: string) => {
		const newConfig = getCurrent()
		const component = newConfig?.components?.find(({ name }) => name === componentName)

		if (component) {
			delete component.frame
			config.set(newConfig)
		}
	}

	const deleteFragmentFrame = (fragmentId: string, componentName: string) => {
		const newConfig = getCurrent()
		newConfig.fragment_mods ??= []

		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		let fragmentMod = newConfig.fragment_mods.find((mod: any) => mod.fragment_id === fragmentId)
		if (fragmentMod === undefined) {
			fragmentMod = {
				fragment_id: fragmentId,
				mods: [],
			}
			newConfig.fragment_mods.push(fragmentMod)
		}

		const modUnSetPath = `components.${componentName}.frame`
		fragmentMod.mods.push({
			['$unset']: {
				[modUnSetPath]: '',
			},
		})
		config.set(newConfig)
	}

	setContext<PartConfigContext>(key, {
		get current() {
			return current
		},
		get isDirty() {
			return config.isDirty
		},
		get hasPendingSave() {
			return config.hasPendingSave
		},
		get hasEditPermissions() {
			return config.hasEditPermissions
		},

		updateFrame: (
			componentName: string,
			referenceFrame: string,
			framePosition: Pose,
			frameGeometry?: Frame['geometry']
		) => {
			const fragmentId = fragmentInfo.current[componentName]?.id
			if (fragmentId === undefined) {
				updatePartFrame(componentName, referenceFrame, framePosition, frameGeometry)
			} else {
				updateFragmentFrame(fragmentId, componentName, referenceFrame, framePosition, frameGeometry)
			}
		},

		deleteFrame: (componentName: string) => {
			const fragmentId = fragmentInfo.current[componentName]?.id
			if (fragmentId === undefined) {
				deletePartFrame(componentName)
			} else {
				deleteFragmentFrame(fragmentId, componentName)
			}
		},
		createFrame: (componentName: string) => {
			const fragmentId = fragmentInfo.current[componentName]?.id
			if (fragmentId === undefined) {
				createPartFrame(componentName)
			} else {
				createFragmentFrame(fragmentId, componentName)
			}
		},
		save: () => config.save?.(),
		discardChanges: () => config.discardChanges?.(),
		clearPendingSave: () => config.clearPendingSave(),
		setPendingSave: () => config.setPendingSave(),
	})
}

export const usePartConfig = (): PartConfigContext => {
	return getContext<PartConfigContext>(key)
}

interface AppEmbeddedPartConfigProps {
	current: Struct
	isDirty: boolean

	setLocalPartConfig: (config: Struct) => void
}

const useEmbeddedPartConfig = (props: AppEmbeddedPartConfigProps): LocalPartConfig => {
	let hasPendingSave = $state(false)
	let prevIsDirty = false
	let cleanSnapshot: string | undefined

	const snapshot = (current: Struct | undefined): string | undefined => {
		const json = current?.toJson?.()
		return json === undefined ? undefined : JSON.stringify(json)
	}

	/**
	 * The host app owns saving, and we aren't notified directly. Set hasPendingSave
	 * to watch isDirty: true -> false transitions, representing a save.
	 *
	 * `useFrames` clears the flag on the next `revision` change
	 * once the server reports the new framesystem.
	 */
	$effect.pre(() => {
		const dirty = props.isDirty
		const current = props.current

		if (prevIsDirty && !dirty) {
			const next = snapshot(current)
			if (next !== undefined && cleanSnapshot !== undefined && next !== cleanSnapshot) {
				hasPendingSave = true
			}
			cleanSnapshot = next
		} else if (!prevIsDirty && !dirty) {
			cleanSnapshot = snapshot(current)
		}

		prevIsDirty = dirty
	})

	return {
		hasEditPermissions: true,
		get hasPendingSave() {
			return hasPendingSave
		},
		get isDirty() {
			return props.isDirty
		},

		get current() {
			return props.current ?? new Struct()
		},

		set(config: PartConfig): void {
			const struct = Struct.fromJson(config as unknown as JsonValue)
			return props.setLocalPartConfig(struct)
		},

		clearPendingSave() {
			hasPendingSave = false
		},
		setPendingSave() {
			hasPendingSave = true
		},
	}
}

const useStandalonePartConfig = (partID: () => string): LocalPartConfig => {
	const partQuery = createAppQuery('getRobotPart', () => [partID()] as const, {
		refetchInterval: false,
	})
	const partName = $derived(partQuery.data?.part?.name)

	// Use part.robotConfig (the stored Struct config) as the authoritative source.
	// configJson is the compiled running config from the robot daemon and may be empty
	// even when the stored config exists and the API key has edit permissions.
	let networkPartConfig = $derived(partQuery.data?.part?.robotConfig)
	let current = $state.raw<Struct>()
	let isDirty = $state(false)
	let hasPendingSave = $state(false)

	const hasEditPermissions = $derived(networkPartConfig !== undefined)

	let lastPartID: string | undefined
	$effect.pre(() => {
		const id = partID()
		if (lastPartID !== undefined && lastPartID !== id) {
			// Part changed: drop any in-memory edits/pending-save state from the
			// previous part, and clear `current` so consumers don't keep
			// rendering the old config's frames while the new part loads
			// (offline parts may never load, leaving the old frames forever).
			isDirty = false
			hasPendingSave = false
			current = undefined
		}
		lastPartID = id

		if (!networkPartConfig || isDirty) {
			return
		}

		current = networkPartConfig
	})

	const updateRobotPartMutation = createAppMutation('updateRobotPart')

	return {
		get current() {
			return current ?? new Struct()
		},
		get isDirty() {
			return isDirty
		},
		get hasPendingSave() {
			return hasPendingSave
		},
		get hasEditPermissions() {
			return hasEditPermissions
		},

		set(config: PartConfig): void {
			current = Struct.fromJson(config as unknown as JsonValue)
			isDirty = true
		},

		async save() {
			if (!current || !partName) {
				return
			}

			networkPartConfig = current
			await updateRobotPartMutation.mutateAsync([partID(), partName, current])
			isDirty = false
			hasPendingSave = true
		},

		discardChanges() {
			current = networkPartConfig
			isDirty = false
		},

		clearPendingSave() {
			hasPendingSave = false
		},

		setPendingSave() {
			hasPendingSave = true
		},
	}
}
