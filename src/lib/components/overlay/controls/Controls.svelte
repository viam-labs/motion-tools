<script lang="ts">
	import { PortalTarget } from '@threlte/extras'

	import Button from '$lib/components/overlay/dashboard/Button.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	const settings = useSettings()

	const isOrthographic = $derived(settings.current.cameraMode === 'orthographic')
</script>

<div class="absolute right-2 bottom-26 z-4 flex flex-col items-end gap-2">
	<PortalTarget id="controls" />

	<fieldset class="flex flex-col">
		<Button
			active
			class="rounded-lg"
			icon={isOrthographic ? 'grid-orthographic' : 'grid-perspective'}
			description={isOrthographic ? 'Switch to perspective view' : 'Switch to orthographic view'}
			hotkey="C"
			tooltipLocation="left"
			onclick={() => {
				settings.current.cameraMode = isOrthographic ? 'perspective' : 'orthographic'
			}}
		/>
	</fieldset>
</div>
