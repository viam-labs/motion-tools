<script lang="ts">
	import { Button } from '@viamrobotics/prime-core'

	import TrajectoryScrubber from '$lib/components/motion/TrajectoryScrubber.svelte'

	import type { PreviewMove } from './usePreviewMove.svelte'

	interface Props {
		preview: PreviewMove
		/** The frame this previews, for labelling the controls when several panels are open. */
		frameName: string
		/** No goal staged, or a move already running — nothing worth planning. */
		disabled?: boolean
	}

	const { preview, frameName, disabled = false }: Props = $props()

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
			Not styled as a failure, and `status` rather than `alert`: the planner answered, and its
			answer was "there is nothing to do". An assertive live region in danger red for a correct
			result teaches people to distrust the ones that are real.
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
			The most important thing on this panel: the two ways a preview differs from the move.
			Both come from the same root — a plan is a validated path and nothing more, and every
			decision about how to actually fly it is made later, by the component.

			Timing is the obvious one. The deviation is the easy one to miss and the one worth being
			careful about: what the planner guarantees is that this path is collision-free, not that
			the arm traces it exactly. `builtin.execute` hands the whole waypoint list to the
			component in one batch precisely so it can blend between them (`builtin.go`), and
			what it does with them is its own decision. Saying "the path is exactly what will happen"
			would be the same kind of overclaim as implying the speed is real.

			The copy said "as it rounds corners during execution", which named a mechanism RDK does
			not have: there is no path tolerance anywhere in the tree, and the only in-tree arm steps
			the waypoints sequentially. The batching is sourced; the cornering was not.

			One paragraph rather than labelled lines: "Speed" and "Path" read as fields with values,
			and this panel has no such fields. Informational rather than a warning, too — it is true
			of every plan, always, and nothing has gone wrong. Styling a permanent fact as a problem
			just teaches people to skip it.
		-->
		<div class="border-info-medium bg-info-light border px-2 py-1.5">
			<p class="text-info-dark font-medium">This preview is an approximation</p>
			<p class="text-subtle-1 mt-0.5">
				Plans carry no timing, so this plays at a fixed rate. The arm may also deviate from the
				planned waypoints: how it moves between them is the component's decision, not the planner's.
			</p>
		</div>

		<!--
			No `markers`: every frame here is a planned waypoint, and the scrubber's own doc says to
			omit them in that case because the marks would be noise. They arrive with the mode that
			puts frames between the waypoints.
		-->
		<TrajectoryScrubber
			player={preview.player}
			label="{frameName} preview"
		/>
	{/if}
</div>
