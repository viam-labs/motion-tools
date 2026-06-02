import { getContext, setContext } from 'svelte'

import {
	type FrameDelta,
	type UpdateError,
	validateProposedFrameDeltas,
} from '$lib/components/overlay/SceneBuilder/frameDeltaAdapter'

import { usePartConfig } from './usePartConfig.svelte'

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

export const provideSceneBuilder = (): void => {
	const partConfig = usePartConfig()

	let uiState = $state<UIState>('idle')
	let deltas = $state<FrameDelta[]>([])
	let explanation = $state('')
	let errorMessage = $state('')

	// Re-derived whenever deltas or the current config changes (e.g. from a drag).
	// confirm() therefore always applies the LLM's intent against the latest config —
	// drag changes to unspecified axes are preserved, not overwritten.
	const validation = $derived.by(() =>
		deltas.length > 0
			? validateProposedFrameDeltas(deltas, partConfig.current)
			: { prepared: [], errors: [] }
	)

	const updateErrors = $derived(validation.errors)

	const diffGroups = $derived(
		validation.prepared.flatMap((u): DiffGroup[] => {
			const changes: FieldChange[] = []
			const fmt = (p: typeof u.pose) => `(${p.oX}, ${p.oY}, ${p.oZ}) @ ${p.theta}°`

			if (u.parent !== u.previousParent) {
				changes.push({ field: 'parent', oldValue: u.previousParent, newValue: u.parent })
			}
			if (u.pose.x !== u.previousPose.x) {
				changes.push({ field: 'translation.x', oldValue: String(u.previousPose.x), newValue: String(u.pose.x) })
			}
			if (u.pose.y !== u.previousPose.y) {
				changes.push({ field: 'translation.y', oldValue: String(u.previousPose.y), newValue: String(u.pose.y) })
			}
			if (u.pose.z !== u.previousPose.z) {
				changes.push({ field: 'translation.z', oldValue: String(u.previousPose.z), newValue: String(u.pose.z) })
			}
			if (
				u.pose.oX !== u.previousPose.oX ||
				u.pose.oY !== u.previousPose.oY ||
				u.pose.oZ !== u.previousPose.oZ ||
				u.pose.theta !== u.previousPose.theta
			) {
				changes.push({ field: 'orientation', oldValue: fmt(u.previousPose), newValue: fmt(u.pose) })
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

			const components = partConfig.current.components
				.filter((c) => c.frame !== undefined)
				.map(({ name, frame }) => ({ name, frame }))

			try {
				const res = await fetch('/api/scene-builder', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ prompt: prompt.trim(), components }),
				})

				if (!res.ok) {
					throw new Error(`${res.status}: ${await res.text()}`)
				}

				const data = (await res.json()) as { updates: FrameDelta[]; explanation: string }

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
