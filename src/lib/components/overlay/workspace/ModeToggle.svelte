<script lang="ts">
	import { PortalTarget } from '@threlte/extras'

	import ModeButton from './ModeButton.svelte'
</script>

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
	<ModeButton
		class="-ml-px rounded-none"
		mode="build"
		description="Build the scene"
	/>

	<PortalTarget id="mode-toggle" />
</fieldset>
