<script lang="ts">
	import { Switch } from '@viamrobotics/prime-core'
	import { useResourceNames } from '@viamrobotics/svelte-sdk'

	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	const partID = usePartID()
	const arms = useResourceNames(() => partID.current, 'arm')
	const cameras = useResourceNames(() => partID.current, 'camera')
	const settings = useSettings()

	const currentRobotArmWidgets = $derived(settings.current.openArmWidgets[partID.current] || [])
	const currentRobotCameraWidgets = $derived(
		settings.current.openCameraWidgets[partID.current] || []
	)
</script>

<div class="text-gray-9 flex flex-col gap-1 text-xs">
	<h3 class="border-gray-3 border-b py-1 text-sm"><strong>Arm widgets</strong></h3>

	{#each arms.current as arm (arm)}
		{@const isWidgetOpen = currentRobotArmWidgets.includes(arm.name)}
		<div class="flex items-center justify-between gap-2 py-0.5">
			<span class="min-w-0 truncate">{arm.name}</span>
			<Switch
				on={isWidgetOpen}
				on:change={(event) => {
					settings.current.openArmWidgets = event.detail
						? {
								...settings.current.openArmWidgets,
								[partID.current]: [...currentRobotArmWidgets, arm.name],
							}
						: {
								...settings.current.openArmWidgets,
								[partID.current]: currentRobotArmWidgets.filter((widget) => widget !== arm.name),
							}
				}}
			/>
		</div>
	{:else}
		No arms detected
	{/each}

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
