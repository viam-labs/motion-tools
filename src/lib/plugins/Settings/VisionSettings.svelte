<script lang="ts">
	import { Switch } from '@viamrobotics/prime-core'
	import { useResourceNames } from '@viamrobotics/svelte-sdk'

	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	const partID = usePartID()

	const visionServices = useResourceNames(() => partID.current, 'vision')
	const settings = useSettings()
	const { disabledVisionServices } = $derived(settings.current)
</script>

<div class="text-gray-9 flex flex-col gap-1 text-xs">
	<h3 class="border-gray-3 border-b py-1 text-sm"><strong>Enabled vision services</strong></h3>

	{#each visionServices.current as visionService (visionService)}
		<div class="flex items-center justify-between py-0.5">
			{visionService.name}
			<Switch
				on={disabledVisionServices[visionService.name] !== true}
				on:change={(event) => {
					disabledVisionServices[visionService.name] = !event.detail
				}}
			/>
		</div>
	{:else}
		No vision services detected
	{/each}
</div>
