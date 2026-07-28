import type { Entity, World } from 'koota'

import type { Frame } from '$lib/frame'
import type { FragmentInfo } from '$lib/hooks/useFragmentInfo.svelte'

import { hierarchy, traits } from '$lib/ecs'
import { Pose } from '$lib/math'

import { applyGeometryTrait, type EditableFrameGeometry } from './FrameEditor'

type JsonObject = Record<string, unknown>

export interface FrameHistoryPartConfig {
	components?: { name: string; frame?: Frame }[]
	fragment_mods?: {
		fragment_id: string
		mods: JsonObject[]
	}[]
}

interface ConfigLike {
	toJson?: () => unknown
}

const emptyPartConfig = { components: [] }

const toJsonValue = (value: unknown): unknown => {
	if (Array.isArray(value)) {
		return value.map((item) => toJsonValue(item))
	}

	if (value && typeof value === 'object') {
		const sorted: JsonObject = {}
		for (const key of Object.keys(value as JsonObject).toSorted()) {
			sorted[key] = toJsonValue((value as JsonObject)[key])
		}
		return sorted
	}

	return value
}

export const serializePartConfig = (
	config: ConfigLike | FrameHistoryPartConfig | undefined
): string => {
	if (!config) {
		return JSON.stringify(emptyPartConfig)
	}

	if (typeof (config as ConfigLike).toJson === 'function') {
		return JSON.stringify(toJsonValue((config as ConfigLike).toJson?.() ?? emptyPartConfig))
	}

	return JSON.stringify(toJsonValue(config))
}

export const parsePartConfigSnapshot = (snapshot: string): FrameHistoryPartConfig => {
	try {
		return JSON.parse(snapshot) as FrameHistoryPartConfig
	} catch {
		return emptyPartConfig
	}
}

const frameModPath = (componentName: string) => `components.${componentName}.frame`

const getRecord = (value: unknown): JsonObject | undefined =>
	value && typeof value === 'object' ? (value as JsonObject) : undefined

export const collectFrameHistoryFrames = (
	config: FrameHistoryPartConfig,
	fragmentInfo: Record<string, FragmentInfo>
): { frames: Map<string, Frame>; unsetFrameNames: Set<string> } => {
	const frames = new Map<string, Frame>()
	const unsetFrameNames = new Set<string>()

	for (const component of config.components ?? []) {
		if (component.frame) {
			frames.set(component.name, component.frame)
		} else {
			unsetFrameNames.add(component.name)
		}
	}

	for (const [componentName, info] of Object.entries(fragmentInfo)) {
		const fragmentMod = config.fragment_mods?.find((mod) => mod.fragment_id === info.id)
		if (!fragmentMod) {
			if (info.frame) {
				frames.set(componentName, info.frame)
				unsetFrameNames.delete(componentName)
			}
			continue
		}

		const path = frameModPath(componentName)
		const setFrameIndex = fragmentMod.mods.findLastIndex(
			(mod) => getRecord(getRecord(mod)?.['$set'])?.[path] !== undefined
		)
		const unsetFrameIndex = fragmentMod.mods.findLastIndex(
			(mod) => getRecord(getRecord(mod)?.['$unset'])?.[path] !== undefined
		)

		if (setFrameIndex < unsetFrameIndex) {
			unsetFrameNames.add(componentName)
			continue
		}

		if (unsetFrameIndex < setFrameIndex) {
			const set = getRecord(fragmentMod.mods[setFrameIndex]?.['$set'])
			const frame = set?.[path] as Frame | undefined
			if (frame) {
				frames.set(componentName, frame)
				unsetFrameNames.delete(componentName)
			}
		} else if (info.frame) {
			frames.set(componentName, info.frame)
			unsetFrameNames.delete(componentName)
		}
	}

	return { frames, unsetFrameNames }
}

const writeMatrixTrait = (
	entity: Entity,
	trait: typeof traits.Matrix | typeof traits.LiveMatrix | typeof traits.EditedMatrix,
	frame: Frame
): void => {
	const pose = new Pose().setFromFrame(frame)
	const current = entity.get(trait)

	if (current) {
		pose.toMatrix4(current)
		entity.changed(trait)
		return
	}

	entity.add(trait(pose.toMatrix4()))
}

export const applyFrameHistorySnapshotToWorld = (
	world: World,
	config: FrameHistoryPartConfig,
	fragmentInfo: Record<string, FragmentInfo>,
	options: { keepEditedMatrices: boolean }
): void => {
	const { frames, unsetFrameNames } = collectFrameHistoryFrames(config, fragmentInfo)

	for (const entity of world.query(traits.FramesAPI)) {
		const name = entity.get(traits.Name)
		if (!name) {
			continue
		}

		const frame = frames.get(name)

		if (!frame) {
			if (!options.keepEditedMatrices || unsetFrameNames.has(name)) {
				entity.remove(traits.EditedMatrix)
			}
			continue
		}

		if (options.keepEditedMatrices) {
			writeMatrixTrait(entity, traits.EditedMatrix, frame)
		} else {
			writeMatrixTrait(entity, traits.Matrix, frame)
			writeMatrixTrait(entity, traits.LiveMatrix, frame)
			entity.remove(traits.EditedMatrix)
		}

		hierarchy.setParent(entity, frame.parent)
		applyGeometryTrait(entity, (frame.geometry ?? { type: 'none' }) as EditableFrameGeometry)
	}
}
