<script lang="ts">
	import { PortalTarget } from '@threlte/extras'

	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'

	import ModeButton from './ModeButton.svelte'

	const environment = useEnvironment()

	// Every mode past `monitor` is contributed by a plugin, so with none of them
	// mounted this would render a lone button that only reselects the mode you are
	// already in. Hide the whole control instead.
	const hasChoice = $derived(environment.availableModes.length > 1)
</script>

{#if hasChoice}
	<fieldset
		class="flex"
		role="radiogroup"
		aria-label="Workspace mode"
	>
		<ModeButton
			class="rounded-r-none"
			mode="monitor"
			description="Monitor live machine data"
		/>

		<PortalTarget id="mode-toggle" />
	</fieldset>
{/if}
