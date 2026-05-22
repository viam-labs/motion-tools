import { getContext, setContext } from 'svelte'

import { type FileDropperResult } from '$lib/components/FileDrop/file-dropper'
import { createPlanRequestDropper } from '$lib/components/FileDrop/plan-request-dropper'

interface Context {
	readonly currentStep: number
	readonly totalSteps: number
	readonly steppingPlan: boolean
	readonly drawServerURL: string
	loadPlan: (name: string, content: string) => Promise<FileDropperResult>
	stepPlan: (direction: 'prev' | 'next') => Promise<{ ok: true } | { ok: false; error: string }>
}

const key = Symbol('plan-controller-context')

export const providePlanController = (drawServerURL: () => string) => {
	let currentStep = $state(-1)
	let totalSteps = $state(0)
	let steppingPlan = $state(false)

	const loadPlan = async (name: string, content: string): Promise<FileDropperResult> => {
		const dropper = createPlanRequestDropper(drawServerURL())
		const result = await dropper({ name, content })
		if (result.success) {
			totalSteps = result.totalSteps
			currentStep = result.currentStep
		}
		return result
	}

	const stepPlan = async (
		direction: 'prev' | 'next'
	): Promise<{ ok: true } | { ok: false; error: string }> => {
		if (steppingPlan || totalSteps <= 0) return { ok: true }
		steppingPlan = true
		try {
			const resp = await fetch(`${drawServerURL()}/plan-request/step`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ direction }),
			})
			if (!resp.ok) {
				const text = await resp.text()
				return { ok: false, error: text || 'failed to step plan' }
			}

			const body = (await resp.json()) as { current_step: number; total_steps: number }
			currentStep = body.current_step ?? currentStep
			totalSteps = body.total_steps ?? totalSteps
			return { ok: true }
		} catch (error) {
			return {
				ok: false,
				error: error instanceof Error ? error.message : 'unknown error',
			}
		} finally {
			steppingPlan = false
		}
	}

	const context: Context = {
		get currentStep() {
			return currentStep
		},
		get totalSteps() {
			return totalSteps
		},
		get steppingPlan() {
			return steppingPlan
		},
		get drawServerURL() {
			return drawServerURL()
		},
		loadPlan,
		stepPlan,
	}

	setContext<Context>(key, context)

	return context
}

export const usePlanController = (): Context => {
	return getContext<Context>(key)
}
