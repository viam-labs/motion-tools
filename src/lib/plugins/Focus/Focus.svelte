<script lang="ts">
	import Button from '$lib/components/overlay/dashboard/Button.svelte'
	import DashboardPortal from '$lib/components/overlay/Portals/DashboardPortal.svelte'
	import { traits, useQuery } from '$lib/ecs'
	import { useHotkey } from '$lib/hooks/useHotkeys.svelte'

	import FocusBox from './FocusBox.svelte'
	import { provideFocus } from './provideFocus.svelte'

	let focusing = $state(false)

	provideFocus(() => focusing)

	const selected = useQuery(traits.Selected)

	const canFocus = $derived(selected.current.length > 0 || focusing)

	useHotkey({
		key: '/',
		description: 'Focus selection',
		when: () => canFocus,
		run: () => (focusing = !focusing),
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
