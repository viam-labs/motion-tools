<script lang="ts">
	import { PersistedState } from 'runed'
	import { Icon, Select } from '@viamrobotics/prime-core'
	import RefreshRate from '../RefreshRate.svelte'
	import { useMotionClient } from '$lib/hooks/useMotionClient.svelte'

	const showSettings = new PersistedState('show-settings', false)

	const motionClient = useMotionClient()
</script>

<button
	class="border-medium w-full border-t p-2 text-left"
	onclick={() => (showSettings.current = !showSettings.current)}
>
	<h3 class="text-default flex items-center gap-1.5">
		<Icon
			name={showSettings.current ? 'unfold-more-horizontal' : 'unfold-less-horizontal'}
			label="unfold more icon"
			variant="ghost"
			cx="size-6"
			on:click={() => (showSettings.current = !showSettings.current)}
		/>
		Settings
	</h3>
</button>

{#if showSettings.current}
	<div class="border-medium flex flex-col gap-2 border-t p-3">
		<RefreshRate name="Frames">
			<option value="0">Do not fetch</option>
			<option value="1">Fetch on reconfigure</option>
		</RefreshRate>
		<RefreshRate name="Pointclouds" />
		<RefreshRate name="Geometries" />
		<RefreshRate name="Poses" />

		<label class="flex flex-col gap-1">
			Motion client
			<Select
				onchange={(event: InputEvent) => {
					if (event.target instanceof HTMLSelectElement) {
						motionClient.set(event.target.value)
					}
				}}
				value={motionClient.current}
			>
				{#each motionClient.names as name (name)}
					<option>{name}</option>
				{/each}
			</Select>
		</label>
	</div>
{/if}
