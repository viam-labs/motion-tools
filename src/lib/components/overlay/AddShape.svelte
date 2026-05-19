<script lang="ts">
	import { Portal } from '@threlte/extras'
	import { Button } from '@viamrobotics/prime-core'
	import { Axis3d, Box, Circle, Pill, Square } from 'lucide-svelte'
	import { PressedKeys } from 'runed'

	import { type ShapeKind, spawners, traits, useWorld } from '$lib/ecs'
	import { useSelectedEntity } from '$lib/hooks/useSelection.svelte'

	import DashboardButton from './dashboard/Button.svelte'
	import Popover from './Popover.svelte'
	import ToggleGroup from './ToggleGroup.svelte'

	const world = useWorld()
	const selectedEntity = useSelectedEntity()

	let isOpen = $state(false)

	const keys = new PressedKeys()
	keys.onKeys('=', () => {
		isOpen = !isOpen
	})

	const kinds: { value: ShapeKind; label: string; icon: unknown }[] = [
		{ value: 'box', label: 'Box', icon: Box },
		{ value: 'sphere', label: 'Sphere', icon: Circle },
		{ value: 'capsule', label: 'Capsule', icon: Pill },
		{ value: 'plane', label: 'Plane', icon: Square },
		{ value: 'frame', label: 'Frame', icon: Axis3d },
	]

	let counters = $state<Record<ShapeKind, number>>({
		box: 0,
		sphere: 0,
		capsule: 0,
		plane: 0,
		frame: 0,
	})

	let kind = $state<ShapeKind>('box')

	// Writable derived: tracks `${kind} ${count + 1}` until the user edits the
	// input, then preserves their override until kind or counters change again.
	let name = $derived(`${kind} ${counters[kind] + 1}`)

	const isValid = $derived(name.trim().length > 0)

	const handleAdd = () => {
		const trimmed = name.trim()
		if (!trimmed) return

		const entity = spawners[kind](world)
		entity.set(traits.Name, trimmed)
		selectedEntity.set(entity)

		// Bumping the counter re-derives `name` to the next default.
		counters[kind] += 1
	}
</script>

<Portal id="dashboard">
	<fieldset>
		<Popover bind:open={isOpen}>
			{#snippet trigger(triggerProps)}
				<DashboardButton
					{...triggerProps}
					active
					icon="plus"
					description="Add shape"
					hotkey="="
				/>
			{/snippet}

			<div class="border-medium m-2 flex flex-col gap-2 border bg-white p-2 text-xs">
				<div class="flex flex-col gap-1">
					Type
					<ToggleGroup
						options={kinds.map((k) => ({
							label: k.label,
							value: k.value,
							icon: k.icon,
							selected: k.value === kind,
						}))}
						onSelect={(values) => {
							const next = values[0]
							if (next) kind = next as ShapeKind
						}}
					/>
				</div>

				<label class="flex flex-col gap-1">
					Name
					<input
						class="border-light hover:border-gray-6 focus:border-gray-9 h-7.5 w-full border bg-white px-2 py-1.5 text-xs leading-tight"
						type="text"
						required
						bind:value={name}
					/>
				</label>

				<Button
					icon="plus"
					disabled={!isValid}
					onclick={handleAdd}
				>
					Add shape
				</Button>
			</div>
		</Popover>
	</fieldset>
</Portal>
