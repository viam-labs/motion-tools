<script lang="ts">
	import { Select, Switch, Input } from '@viamrobotics/prime-core'
	import RefreshRate from '../RefreshRate.svelte'
	import { useMotionClient } from '$lib/hooks/useMotionClient.svelte'
	import Drawer from './Drawer.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	const settings = useSettings()
	const motionClient = useMotionClient()
</script>

<Drawer
	name="Settings"
	defaultOpen
>
	<div class="flex h-100 flex-col gap-2 overflow-scroll p-3">
		<h3 class="text-base"><strong>Refresh rates</strong></h3>

		<RefreshRate name="Frames">
			<option value="0">Do not fetch</option>
			<option value="1">Fetch on reconfigure</option>
		</RefreshRate>
		<RefreshRate name="Pointclouds" />
		<RefreshRate name="Geometries" />
		<RefreshRate name="Poses" />

		<h3 class="text-base"><strong>Motion</strong></h3>

		<label class="flex flex-col gap-1">
			Client
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

		<h3 class="text-base"><strong>Grid</strong></h3>
		<div class="flex flex-col gap-2.5">
			<label class="flex items-center justify-between gap-2">
				Enabled <Switch bind:on={settings.current.grid} />
			</label>

			<label class="flex items-center justify-between gap-2">
				Cell size (m)

				<div class="w-20">
					<Input
						bind:value={settings.current.gridCellSize}
						on:keydown={(event) => event.stopImmediatePropagation()}
					/>
				</div>
			</label>

			<label class="flex items-center justify-between gap-2">
				Section size (m)

				<div class="w-20">
					<Input
						bind:value={settings.current.gridSectionSize}
						on:keydown={(event) => event.stopImmediatePropagation()}
					/>
				</div>
			</label>

			<label class="flex items-center justify-between gap-2">
				Fade distance (m)

				<div class="w-20">
					<Input
						bind:value={settings.current.gridFadeDistance}
						on:keydown={(event) => event.stopImmediatePropagation()}
					/>
				</div>
			</label>
		</div>
	</div>
</Drawer>
