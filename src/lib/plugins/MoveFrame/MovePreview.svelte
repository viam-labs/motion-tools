<script lang="ts">
	import { Button } from '@viamrobotics/prime-core'

	import type { PreviewMove } from './usePreviewMove.svelte'

	interface Props {
		preview: PreviewMove
		/** No goal staged, or a move already running, so there is nothing worth planning. */
		disabled?: boolean
	}

	const { preview, disabled = false }: Props = $props()

	const planning = $derived(preview.status === 'planning')
	const ready = $derived(preview.status === 'ready')
</script>

<div class="flex flex-col gap-2">
	<Button
		variant="outline-success"
		disabled={disabled || planning}
		progress={planning ? 'indeterminate' : undefined}
		onclick={() => preview.requestPreview()}
	>
		{ready ? 'Re-plan preview' : 'Preview move'}
	</Button>

	{#if preview.status === 'error' && preview.message}
		<p
			class="text-danger-dark"
			role="alert"
		>
			{preview.message}
		</p>
	{:else if preview.status === 'already-at-goal' && preview.message}
		<!--
			`status` rather than `alert`, and not styled as a failure: the planner answered, and its
			answer was "nothing to do". A correct result in danger red teaches people to distrust
			the ones that are real.
		-->
		<p
			class="text-subtle-1"
			role="status"
		>
			{preview.message}
		</p>
	{/if}

	{#if ready}
		<!--
			Information rather than a warning: a plan is a validated path and nothing more, so the
			caveat is true of every plan, always, and nothing has gone wrong when it is.
		-->
		<div class="border-info-medium bg-info-light border px-2 py-1.5">
			<p class="text-info-dark font-medium">This preview is an approximation</p>
			<p class="text-subtle-1 mt-0.5">
				The arm may deviate from the planned waypoints. How it moves between them is the component's
				decision, not the planner's.
			</p>
		</div>

		<p
			class="text-subtle-1"
			role="status"
		>
			Planned {preview.plannedSteps} waypoint{preview.plannedSteps === 1 ? '' : 's'}.
		</p>
	{/if}
</div>
