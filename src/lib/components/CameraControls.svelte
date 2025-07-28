<script lang="ts">
	import { CameraControls, type CameraControlsRef, Gizmo } from '@threlte/extras'
	import { useTransformControls } from '$lib/hooks/useControls.svelte'
	import KeyboardControls from './KeyboardControls.svelte'
	import Portal from './portal/Portal.svelte'
	import Button from './dashboard/Button.svelte'
	import { useShapes } from '$lib/hooks/useShapes.svelte'

	const shapes = useShapes()
	const transformControls = useTransformControls()

	let ref = $state.raw<CameraControlsRef>()

	$effect(() => {
		if (shapes.camera) {
			const { position, lookAt, animate } = shapes.camera
			ref?.setPosition(position.x, position.y, position.z, animate)
			ref?.setLookAt(position.x, position.y, position.z, lookAt.x, lookAt.y, lookAt.z, animate)
		}
	})
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
