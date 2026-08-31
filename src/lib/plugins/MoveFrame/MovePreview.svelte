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
	{:else if ready}
		<p
			class="text-subtle-1"
			role="status"
		>
			Planned {preview.plannedSteps} waypoint{preview.plannedSteps === 1 ? '' : 's'}.
		</p>
	{/if}
</div>
