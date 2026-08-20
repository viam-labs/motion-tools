<script lang="ts">
	import { PortalTarget } from '@threlte/extras'

	import Button from '$lib/components/overlay/dashboard/Button.svelte'
	import { useCameraControls } from '$lib/hooks/useControls.svelte'
	import { useHotkey } from '$lib/hooks/useHotkeys.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	const settings = useSettings()
	const cameraControls = useCameraControls()

	const isOrthographic = $derived(settings.current.cameraMode === 'orthographic')

	const toggleProjection = () => {
		settings.current.cameraMode = isOrthographic ? 'perspective' : 'orthographic'
	}

	useHotkey({
		key: 'c',
		description: 'Toggle camera projection',
		run: toggleProjection,
	})
</script>

<div class="absolute right-2 bottom-26 z-4 flex flex-col items-end gap-2">
	<PortalTarget id="controls" />

	<fieldset class="flex flex-col">
		<Button
			class="rounded-b-none"
			icon="camera-outline"
			description="Reset camera"
			tooltipLocation="left"
			onclick={() => {
				cameraControls.setInitialPose()
			}}
		/>
		<Button
			class="-my-0.5 rounded-t-none"
			icon={isOrthographic ? 'grid-orthographic' : 'grid-perspective'}
			description={isOrthographic ? 'Switch to perspective view' : 'Switch to orthographic view'}
			hotkey="C"
			tooltipLocation="left"
			onclick={toggleProjection}
		/>
	</fieldset>
</div>
