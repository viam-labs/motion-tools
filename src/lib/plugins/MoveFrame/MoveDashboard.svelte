<script lang="ts">
	import { PressedKeys } from 'runed'

	import { DashboardPortal } from '$lib'
	import Button from '$lib/components/overlay/dashboard/Button.svelte'

	import { moveGizmoOptions } from './moveGizmoOptions.svelte'

	// The same keys the build dashboard uses for its gizmo — they reach the move
	// gizmo here because this only mounts in move mode.
	const keys = new PressedKeys()

	keys.onKeys('1', () => {
		moveGizmoOptions.mode = 'translate'
	})

	keys.onKeys('2', () => {
		moveGizmoOptions.mode = 'rotate'
	})
</script>

<DashboardPortal>
	<!-- transform -->
	<fieldset class="flex">
		<Button
			icon="cursor-move"
			class="rounded-r-none"
			active={moveGizmoOptions.mode === 'translate'}
			description="Translate"
			hotkey="1"
			onclick={() => {
				moveGizmoOptions.mode = 'translate'
			}}
		/>
		<Button
			icon="sync"
			class="-ml-px rounded-l-none"
			active={moveGizmoOptions.mode === 'rotate'}
			description="Rotate"
			hotkey="2"
			onclick={() => {
				moveGizmoOptions.mode = 'rotate'
			}}
		/>
	</fieldset>

	<!-- space -->
	<fieldset class="flex">
		<Button
			icon="axis-arrow"
			class="rounded-r-none"
			active={moveGizmoOptions.space === 'local'}
			description="Local space"
			onclick={() => {
				moveGizmoOptions.space = 'local'
			}}
		/>
		<Button
			icon="earth"
			class="-ml-px rounded-l-none"
			active={moveGizmoOptions.space === 'world'}
			description="World space"
			onclick={() => {
				moveGizmoOptions.space = 'world'
			}}
		/>
	</fieldset>
</DashboardPortal>
