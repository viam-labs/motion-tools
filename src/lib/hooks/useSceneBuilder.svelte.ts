import { getContext, setContext } from 'svelte'

import { backendIP, websocketPort } from '$lib/defines'
import {
	applyPreparedUpdates,
	validateProposedFrameDeltas,
	type FrameDelta,
	type PreparedUpdate,
	type UpdateError,
} from '$lib/components/overlay/SceneBuilder/frameDeltaAdapter'

import { usePartConfig } from './usePartConfig.svelte'

const key = Symbol('scene-builder-context')

type UIState = 'idle' | 'loading' | 'diff' | 'error'

interface DiffRow {
	componentName: string
	field: string
	oldValue: string
	newValue: string
}

interface SceneBuilderContext {
	readonly uiState: UIState
	readonly pendingUpdates: PreparedUpdate[]
	readonly updateErrors: UpdateError[]
	readonly explanation: string
	readonly errorMessage: string
	readonly diffRows: DiffRow[]
	submit(prompt: string): Promise<void>
	confirm(): void
	cancel(): void
	resetError(): void
}

export const provideSceneBuilder = (): void => {
	const partConfig = usePartConfig()

	let uiState = $state<UIState>('idle')
	let pendingUpdates = $state<PreparedUpdate[]>([])
	let updateErrors = $state<UpdateError[]>([])
	let explanation = $state('')
	let errorMessage = $state('')

	const diffRows = $derived(
		pendingUpdates.flatMap((u) => {
			const rows: DiffRow[] = []
			const fmt = (p: typeof u.pose) => `(${p.oX}, ${p.oY}, ${p.oZ}) @ ${p.theta}°`

			if (u.parent !== u.previousParent) {
				rows.push({ componentName: u.componentName, field: 'parent', oldValue: u.previousParent, newValue: u.parent })
			}
			if (u.pose.x !== u.previousPose.x) {
				rows.push({ componentName: u.componentName, field: 'translation.x', oldValue: String(u.previousPose.x), newValue: String(u.pose.x) })
			}
			if (u.pose.y !== u.previousPose.y) {
				rows.push({ componentName: u.componentName, field: 'translation.y', oldValue: String(u.previousPose.y), newValue: String(u.pose.y) })
			}
			if (u.pose.z !== u.previousPose.z) {
				rows.push({ componentName: u.componentName, field: 'translation.z', oldValue: String(u.previousPose.z), newValue: String(u.pose.z) })
			}
			if (u.pose.oX !== u.previousPose.oX || u.pose.oY !== u.previousPose.oY || u.pose.oZ !== u.previousPose.oZ || u.pose.theta !== u.previousPose.theta) {
				rows.push({ componentName: u.componentName, field: 'orientation', oldValue: fmt(u.previousPose), newValue: fmt(u.pose) })
			}

			return rows
		})
	)

	const clear = () => {
		pendingUpdates = []
		updateErrors = []
		explanation = ''
		errorMessage = ''
	}

	setContext<SceneBuilderContext>(key, {
		get uiState() { return uiState },
		get pendingUpdates() { return pendingUpdates },
		get updateErrors() { return updateErrors },
		get explanation() { return explanation },
		get errorMessage() { return errorMessage },
		get diffRows() { return diffRows },

		async submit(prompt: string) {
			uiState = 'loading'

			const components = partConfig.current.components
				.filter((c) => c.frame !== undefined)
				.map(({ name, frame }) => ({ name, frame }))

			try {
				const res = await fetch(`http://${backendIP}:${websocketPort}/scene-builder`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ prompt: prompt.trim(), components }),
				})

				if (!res.ok) {
					throw new Error(`${res.status}: ${await res.text()}`)
				}

				const data = (await res.json()) as { updates: FrameDelta[]; explanation: string }
				const result = validateProposedFrameDeltas(data.updates, partConfig.current)

				pendingUpdates = result.prepared
				updateErrors = result.errors
				explanation = data.explanation
				uiState = 'diff'
			} catch (error) {
				errorMessage = error instanceof Error ? error.message : String(error)
				uiState = 'error'
			}
		},

		confirm() {
			applyPreparedUpdates(pendingUpdates, { updateFrame: partConfig.updateFrame })
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
