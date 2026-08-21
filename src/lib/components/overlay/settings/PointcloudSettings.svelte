<script lang="ts">
	import { Input, Switch } from '@viamrobotics/prime-core'
	import { useResourceNames } from '@viamrobotics/svelte-sdk'
	import { Color } from 'three'

	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	const partID = usePartID()
	const cameras = useResourceNames(() => partID.current, 'camera')
	const settings = useSettings()

	const { disabledCameras } = $derived(settings.current)

	const colorHex = $derived(`#${new Color(settings.current.pointColor).getHexString()}`)
</script>

<div class="flex flex-col gap-1 text-xs">
	<label class="flex items-center justify-between gap-2">
		Default point size

		<div class="w-20">
			<Input
				bind:value={settings.current.pointSize}
				on:keydown={(event) => event.stopImmediatePropagation()}
			/>
		</div>
	</label>

	<label class="flex items-center justify-between gap-2">
		Default point color

		<div class="w-20">
			<Input
				type="color"
				value={colorHex}
				on:change={(event) => {
					const value = (event.target as HTMLInputElement).value
					settings.current.pointColor = value
				}}
				on:keydown={(event) => event.stopImmediatePropagation()}
			/>
		</div>
	</label>

	<label class="flex items-center justify-between gap-2">
		Point budget while moving

		<div class="w-20">
			<Input
				type="number"
				bind:value={settings.current.pointBudget}
				on:keydown={(event) => event.stopImmediatePropagation()}
			/>
		</div>
	</label>

	<p class="text-subtle-2">Full detail returns when the camera settles. 0 disables.</p>

	<label class="flex items-center justify-between gap-2">
		Max point size (px)

		<div class="w-20">
			<Input
				type="number"
				min={0}
				bind:value={settings.current.maxPointSize}
				on:keydown={(event) => event.stopImmediatePropagation()}
			/>
		</div>
	</label>

	<h3 class="border-gray-3 border-b py-1 text-sm"><strong>Enabled cameras</strong></h3>

	{#each cameras.current as camera (camera)}
		<div class="flex items-center justify-between py-0.5 text-xs">
			{camera.name}
			<Switch
				on={disabledCameras[camera.name] !== true}
				on:change={(event) => {
					disabledCameras[camera.name] = !event.detail
				}}
			/>
		</div>
	{:else}
		No cameras detected
	{/each}
</div>
