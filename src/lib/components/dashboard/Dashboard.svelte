<script>
	import { useSettings } from '$lib/hooks/useSettings.svelte'
	import Button from './Button.svelte'

	const settings = useSettings()
</script>

<svelte:window
	onkeydown={({ key }) => {
		if (key.toLowerCase() === 'c') {
			settings.current.cameraMode =
				settings.current.cameraMode === 'perspective' ? 'orthographic' : 'perspective'
		}
	}}
/>

<div class="absolute top-2 flex w-full justify-center">
	<!-- transform -->
	<!-- <fieldset>
    <Button
      icon="cursor-move"
      active={$transformMode === TransformModes.TRANSLATE}
      description="Translate"
      hotkey="T"
      onclick={() => transformMode.set(TransformModes.TRANSLATE)}
    />
    <Button
      icon="sync"
      active={$transformMode === TransformModes.ROTATE}
      description="Rotate"
      hotkey="R"
      class="-my-px"
      onclick={() => transformMode.set(TransformModes.ROTATE)}
    />
    <Button
      icon="resize"
      active={$transformMode === TransformModes.SCALE}
      description="Scale"
      hotkey="S"
      onclick={() => transformMode.set(TransformModes.SCALE)}
    />
  </fieldset> -->

	<!-- snapping -->
	<!-- <fieldset>
    <Button
      icon={$snapMode ? 'magnet' : 'magnet-off'}
      active={$snapMode === true}
      description="Snapping"
      hotkey="Spacebar"
      onClick={() => snapMode.set(!$snapMode)}
    />
  </fieldset> -->

	<!-- camera view -->
	<fieldset class="flex">
		<Button
			icon="grid-orthographic"
			active={settings.current.cameraMode === 'orthographic'}
			description="Orthographic view"
			hotkey="C"
			onclick={() => {
				settings.current.cameraMode = 'orthographic'
			}}
		/>
		<Button
			icon="grid-perspective"
			active={settings.current.cameraMode === 'perspective'}
			description="Perspective view"
			hotkey="C"
			class="-ml-px"
			onclick={() => {
				settings.current.cameraMode = 'perspective'
			}}
		/>
	</fieldset>
</div>
