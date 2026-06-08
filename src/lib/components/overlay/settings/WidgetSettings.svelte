<script lang="ts">
	import { Switch } from '@viamrobotics/prime-core'
	import { useResourceNames } from '@viamrobotics/svelte-sdk'

	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	const partID = usePartID()
	const cameras = useResourceNames(() => partID.current, 'camera')
	const settings = useSettings()

	const currentRobotCameraWidgets = $derived(
		settings.current.openCameraWidgets[partID.current] || []
	)
</script>

<div class="text-gray-9 flex flex-col gap-1 text-xs">
	<label class="flex items-center justify-between gap-2 py-1">
		Arm positions
		<Switch bind:on={settings.current.enableArmPositionsWidget} />
	</label>

	<h3 class="border-gray-3 border-b py-1 text-sm"><strong>Camera widgets</strong></h3>

	{#each cameras.current as camera (camera)}
		{@const isWidgetOpen = currentRobotCameraWidgets.includes(camera.name)}
		<div class="flex items-center justify-between gap-2 py-0.5">
			<span class="min-w-0 truncate">{camera.name}</span>
			<Switch
				on={isWidgetOpen}
				on:change={(event) => {
					settings.current.openCameraWidgets = event.detail
						? {
								...settings.current.openCameraWidgets,
								[partID.current]: [...currentRobotCameraWidgets, camera.name],
							}
						: {
								...settings.current.openCameraWidgets,
								[partID.current]: currentRobotCameraWidgets.filter(
									(widget) => widget !== camera.name
								),
							}
				}}
			/>
		</div>
	{:else}
		No cameras detected
	{/each}
</div>
