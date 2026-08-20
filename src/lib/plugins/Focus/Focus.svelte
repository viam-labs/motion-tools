<script lang="ts">
	import { PressedKeys } from 'runed'

	import Button from '$lib/components/overlay/dashboard/Button.svelte'
	import DashboardPortal from '$lib/components/overlay/Portals/DashboardPortal.svelte'
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

<DashboardPortal>
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
</DashboardPortal>

{#if focusing}
	<FocusBox />
{/if}
