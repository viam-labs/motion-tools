<script>
	import { PortalTarget } from '@threlte/extras'

	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import Button from './Button.svelte'

	let { dashboard, ...rest } = $props()

	const settings = useSettings()
</script>

<div
	class="absolute top-2 z-4 flex w-full items-center justify-center gap-2"
	{...rest}
>
	<!-- transform -->
	<fieldset class="flex">
		<Button
			icon="mouse-pointer"
			class="rounded-r-none"
			active={settings.current.transformMode === 'none'}
			description="No transform controls"
			hotkey="0"
			onclick={() => {
				settings.current.transformMode = 'none'
			}}
		/>
		<Button
			icon="cursor-move"
			class="-ml-px rounded-none"
			active={settings.current.transformMode === 'translate'}
			description="Translate"
			hotkey="1"
			onclick={() => {
				settings.current.transformMode = 'translate'
			}}
		/>
		<Button
			icon="sync"
			class="-ml-px rounded-none"
			active={settings.current.transformMode === 'rotate'}
			description="Rotate"
			hotkey="2"
			onclick={() => {
				settings.current.transformMode = 'rotate'
			}}
		/>
		<Button
			icon="resize"
			class="-ml-px rounded-l-none"
			active={settings.current.transformMode === 'scale'}
			description="Scale"
			hotkey="3"
			onclick={() => {
				settings.current.transformMode = 'scale'
			}}
		/>
	</fieldset>

	<!-- snapping -->

	<fieldset class="flex">
		<Button
			icon={settings.current.snapping ? 'magnet' : 'magnet-off'}
			active={settings.current.snapping}
			description="Snapping"
			onclick={() => {
				settings.current.snapping = !settings.current.snapping
			}}
		/>
	</fieldset>

	<PortalTarget id="dashboard" />

	{@render dashboard?.()}
</div>
