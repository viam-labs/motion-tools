<script lang="ts">
	import { Select } from '@viamrobotics/prime-core'
	import RefreshRate from '../RefreshRate.svelte'
	import { useMotionClient } from '$lib/hooks/useMotionClient.svelte'
	import Drawer from './Drawer.svelte'

	const motionClient = useMotionClient()
</script>

<Drawer name="Settings">
	<div class="flex flex-col gap-2 p-3">
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
</Drawer>
