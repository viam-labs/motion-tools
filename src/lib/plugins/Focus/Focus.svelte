<script lang="ts">
	import { Portal } from '@threlte/extras'
	import { PressedKeys } from 'runed'

	import Button from '$lib/components/overlay/dashboard/Button.svelte'
	import { traits, useQuery } from '$lib/ecs'

	import FocusBox from './FocusBox.svelte'
	import { provideFocus } from './provideFocus.svelte'

	let focusing = $state(false)

	provideFocus(() => focusing)

	const selected = useQuery(traits.Selected)

	const canFocus = $derived(selected.current.length > 0 || focusing)

	const keys = new PressedKeys()

	keys.onKeys('/', () => {
		if (selected.current.length > 0 && !focusing) {
			focusing = true
		} else if (focusing) {
			focusing = false
		}
	})
</script>

<Portal id="dashboard">
	<fieldset class="flex">
		<Button
			icon="focus"
			active={focusing}
			disabled={!canFocus}
			description="Focus selection"
			hotkey="/"
			onclick={() => (focusing = !focusing)}
		/>
	</fieldset>
</Portal>

{#if focusing}
	<FocusBox />
{/if}
