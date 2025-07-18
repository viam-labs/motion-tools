<script lang="ts">
	import { CameraControls, type CameraControlsRef, Gizmo } from '@threlte/extras'
	import { useTransformControls } from '$lib/hooks/useControls.svelte'
	import KeyboardControls from './KeyboardControls.svelte'
	import Portal from './portal/Portal.svelte'
	import Button from './dashboard/Button.svelte'

	const transformControls = useTransformControls()

	let ref = $state.raw<CameraControlsRef>()
</script>

<Portal id="dashboard">
	<fieldset>
		<Button
			active
			icon="camera-outline"
			description="Reset camera"
			onclick={() => {
				ref?.reset(true)
			}}
		/>
	</fieldset>
</Portal>

<CameraControls
	bind:ref
	enabled={!transformControls.active}
>
	{#snippet children({ ref }: { ref: CameraControlsRef })}
		<KeyboardControls cameraControls={ref} />
		<Gizmo />
	{/snippet}
</CameraControls>
