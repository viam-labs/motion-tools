import { getContext, setContext } from 'svelte'

import {
	type PlanRequestLoadResult,
	createPlanRequestLoader,
} from '$lib/loaders/plan-request-loader'

type StepResult = { ok: true } | { ok: false; error: string }

interface Context {
	readonly currentStep: number
	readonly totalSteps: number
	readonly steppingPlan: boolean
	readonly drawServerURL: string
	loadPlan: (name: string, content: string, prefix?: string) => Promise<PlanRequestLoadResult>
	stepPlan: (direction: 'prev' | 'next') => Promise<StepResult>
	setStep: (index: number) => Promise<StepResult>
}

const key = Symbol('plan-controller-context')

export const providePlanController = (drawServerURL: () => string) => {
	let currentStep = $state(-1)
	let totalSteps = $state(0)
	let steppingPlan = $state(false)

	const loadPlan = async (
		name: string,
		content: string,
		prefix = ''
	): Promise<PlanRequestLoadResult> => {
		const loadPlanRequest = createPlanRequestLoader(drawServerURL(), prefix)
		const result = await loadPlanRequest({ name, content })
		if (result.success) {
			totalSteps = result.totalSteps
			currentStep = result.currentStep
		}
		return result
	}

	const stepPlan = (direction: 'prev' | 'next'): Promise<StepResult> =>
		sendStep({ direction })

	const setStep = (index: number): Promise<StepResult> => sendStep({ step: index })

	const sendStep = async (
		body: { direction: 'prev' | 'next' } | { step: number }
	): Promise<StepResult> => {
		if (steppingPlan || totalSteps <= 0) return { ok: true }
		steppingPlan = true
		try {
			const resp = await fetch(`${drawServerURL()}/plan-request/step`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body),
			})
			if (!resp.ok) {
				const text = await resp.text()
				return { ok: false, error: text || 'failed to step plan' }
			}

			const json = (await resp.json()) as { current_step: number; total_steps: number }
			currentStep = json.current_step ?? currentStep
			totalSteps = json.total_steps ?? totalSteps
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
		setStep,
	}

	setContext<Context>(key, context)

	return context
}

export const usePlanController = (): Context => {
	return getContext<Context>(key)
}
