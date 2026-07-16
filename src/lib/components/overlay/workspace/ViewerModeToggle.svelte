<script lang="ts">
	import Button from '$lib/components/overlay/dashboard/Button.svelte'
	import { useEnvironment } from '$lib/hooks/useEnvironment.svelte'

	const environment = useEnvironment()
</script>

<fieldset class="flex">
	<Button
		class="rounded-r-none"
		icon="eye-outline"
		active={environment.current.viewerMode === 'monitor'}
		description="Monitor live machine data"
		onclick={() => {
			environment.current.viewerMode = 'monitor'
		}}
	/>
	<Button
		class="-ml-px rounded-l-none"
		icon="hammer"
		active={environment.current.viewerMode === 'build'}
		description="Build the scene"
		onclick={() => {
			environment.current.viewerMode = 'build'
		}}
	/>
</fieldset>
