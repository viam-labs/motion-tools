<script lang="ts">
	import { PortalTarget } from '@threlte/extras'

	import ViewerModeToggle from './ViewerModeToggle.svelte'

	let { ...rest } = $props()
</script>

<div
	class="absolute top-2 right-2 z-4 flex items-center gap-2"
	{...rest}
>
	<ViewerModeToggle />

	<PortalTarget id="workspace" />
</div>
