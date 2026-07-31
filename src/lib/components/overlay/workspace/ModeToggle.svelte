<script lang="ts">
	import { PortalTarget } from '@threlte/extras'

	import ModeButton from './ModeButton.svelte'
</script>

<fieldset class="flex">
	<ModeButton
		class="rounded-r-none"
		mode="monitor"
		icon="eye-outline"
		description="Monitor live machine data"
	/>
	<ModeButton
		class="-ml-px rounded-none"
		mode="build"
		icon="hammer"
		description="Build the scene"
	/>

	<PortalTarget id="mode-toggle" />
</fieldset>
