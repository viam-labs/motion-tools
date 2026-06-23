import { getContext, setContext } from 'svelte'

import { useConfigFrames } from '$lib/hooks/useConfigFrames.svelte'
import { useFragmentInfo } from '$lib/hooks/useFragmentInfo.svelte'
import { useFrames } from '$lib/hooks/useFrames.svelte'
import { usePartConfig } from '$lib/hooks/usePartConfig.svelte'
import { createPoseFromFrame, poseToEulerDegrees } from '$lib/transform'

import {
	type FrameDelta,
	resolveFragmentCurrentFrames,
	type UpdateError,
	validateProposedFrameDeltas,
} from './frameDeltaAdapter'

const key = Symbol('scene-builder-context')

type UIState = 'idle' | 'loading' | 'diff' | 'error'

interface FieldChange {
	field: string
	oldValue: string
	newValue: string
}

interface DiffGroup {
	componentName: string
	explanation?: string
	changes: FieldChange[]
}

interface SceneBuilderContext {
	readonly uiState: UIState
	readonly updateErrors: UpdateError[]
	readonly explanation: string
	readonly errorMessage: string
	readonly diffGroups: DiffGroup[]
	submit(prompt: string): Promise<void>
	confirm(): void
	cancel(): void
	resetError(): void
}

export interface ComponentFrameInfo {
	name: string
	frame: {
		parent: string | undefined
		translation: { x?: number; y?: number; z?: number } | undefined
		orientation: { roll: number; pitch: number; yaw: number }
	}
}

export type InferCallback = (
	prompt: string,
	components: ComponentFrameInfo[]
) => Promise<{ updates: FrameDelta[]; explanation: string }>

export const provideSceneBuilder = (onInfer: InferCallback): void => {
	const partConfig = usePartConfig()
	const fragmentInfo = useFragmentInfo()
	const configFrames = useConfigFrames()
	const frames = useFrames()

	let uiState = $state<UIState>('idle')
	let deltas = $state<FrameDelta[]>([])
	let explanation = $state('')
	let errorMessage = $state('')

	// Fragment-defined components aren't in partConfig.components; resolve their
	// current frames from the live scene so the LLM can move them and confirm()
	// can write fragment overrides.
	const fragmentFrames = $derived(
		resolveFragmentCurrentFrames(
			Object.keys(fragmentInfo.current),
			frames.current,
			configFrames.current
		)
	)

	// Re-derived whenever deltas or the current config changes (e.g. from a drag).
	// confirm() therefore always applies the LLM's intent against the latest config —
	// drag changes to unspecified axes are preserved, not overwritten.
	const validation = $derived.by(() =>
		deltas.length > 0
			? validateProposedFrameDeltas(deltas, partConfig.current, fragmentFrames)
			: { prepared: [], errors: [] }
	)

	const updateErrors = $derived(validation.errors)

	const diffGroups = $derived(
		validation.prepared.flatMap((u): DiffGroup[] => {
			const changes: FieldChange[] = []
			const roundMm = (v: number) => `${Math.round(v * 100) / 100}mm`
			const roundDeg = (v: number) => `${Math.round(v * 100) / 100}°`

			if (u.parent !== u.previousParent) {
				changes.push({ field: 'parent', oldValue: u.previousParent, newValue: u.parent })
			}
			if (u.pose.x !== u.previousPose.x) {
				changes.push({
					field: 'translation.x',
					oldValue: roundMm(u.previousPose.x),
					newValue: roundMm(u.pose.x),
				})
			}
			if (u.pose.y !== u.previousPose.y) {
				changes.push({
					field: 'translation.y',
					oldValue: roundMm(u.previousPose.y),
					newValue: roundMm(u.pose.y),
				})
			}
			if (u.pose.z !== u.previousPose.z) {
				changes.push({
					field: 'translation.z',
					oldValue: roundMm(u.previousPose.z),
					newValue: roundMm(u.pose.z),
				})
			}
			if (
				u.pose.oX !== u.previousPose.oX ||
				u.pose.oY !== u.previousPose.oY ||
				u.pose.oZ !== u.previousPose.oZ ||
				u.pose.theta !== u.previousPose.theta
			) {
				const prev = poseToEulerDegrees(u.previousPose)
				const next = poseToEulerDegrees(u.pose)
				for (const axis of ['yaw', 'pitch', 'roll'] as const) {
					if (Math.abs(next[axis] - prev[axis]) > 0.01) {
						changes.push({
							field: axis,
							oldValue: roundDeg(prev[axis]),
							newValue: roundDeg(next[axis]),
						})
					}
				}
			}

			return changes.length > 0
				? [{ componentName: u.componentName, explanation: u.explanation, changes }]
				: []
		})
	)

	const clear = () => {
		deltas = []
		explanation = ''
		errorMessage = ''
	}

	setContext<SceneBuilderContext>(key, {
		get uiState() {
			return uiState
		},
		get updateErrors() {
			return updateErrors
		},
		get explanation() {
			return explanation
		},
		get errorMessage() {
			return errorMessage
		},
		get diffGroups() {
			return diffGroups
		},

		async submit(prompt: string) {
			uiState = 'loading'

			const partComponents = partConfig.current.components
				.filter((c) => c.frame !== undefined)
				.map(({ name, frame }) => {
					const pose = createPoseFromFrame(frame!)
					const { roll, pitch, yaw } = poseToEulerDegrees(pose)
					return {
						name,
						frame: {
							parent: frame!.parent,
							translation: frame!.translation,
							orientation: { roll, pitch, yaw },
						},
					}
				})

			// Fragment components never appear in partConfig.components, so there's
			// no name overlap with partComponents.
			const fragmentComponents = Object.entries(fragmentFrames).map(([name, current]) => {
				const { roll, pitch, yaw } = poseToEulerDegrees(current.previousPose)
				return {
					name,
					frame: {
						parent: current.previousParent,
						translation: {
							x: current.previousPose.x,
							y: current.previousPose.y,
							z: current.previousPose.z,
						},
						orientation: { roll, pitch, yaw },
					},
				}
			})

			const components = [...partComponents, ...fragmentComponents]

			try {
				const data = await onInfer(prompt.trim(), components)
				deltas = data.updates
				explanation = data.explanation
				uiState = 'diff'
			} catch (error) {
				errorMessage = error instanceof Error ? error.message : String(error)
				uiState = 'error'
			}
		},

		confirm() {
			for (const update of validation.prepared) {
				partConfig.updateFrame(update.componentName, update.parent, update.pose, update.geometry)
			}
			clear()
			uiState = 'idle'
		},

		cancel() {
			clear()
			uiState = 'idle'
		},

		resetError() {
			errorMessage = ''
			uiState = 'idle'
		},
	})
}

export const useSceneBuilder = (): SceneBuilderContext => {
	return getContext<SceneBuilderContext>(key)
}
