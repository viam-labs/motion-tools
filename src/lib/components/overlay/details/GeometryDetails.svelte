<script lang="ts">
	import type { Entity } from 'koota'

	import {
		Point,
		type PointChangeEvent,
		type PointValue3dObject,
		Slider,
		type SliderChangeEvent,
		TabGroup,
		TabPage,
	} from 'svelte-tweakpane-ui'

	import { traits, useTrait } from '$lib/ecs'
	import { FrameEditor } from '$lib/plugins/FrameEditing/FrameEditor'
	import { usePartConfig } from '$lib/plugins/FrameEditing/usePartConfig.svelte'

	interface Props {
		entity: Entity
		/** When false, dimensions render as read-only text instead of editable controls. */
		editable: boolean
	}

	const { entity, editable }: Props = $props()

	const partConfig = usePartConfig()

	const frameEditor = new FrameEditor(partConfig.updateFrame, partConfig.deleteFrame)

	const box = useTrait(() => entity, traits.Box)
	const sphere = useTrait(() => entity, traits.Sphere)
	const capsule = useTrait(() => entity, traits.Capsule)

	const geometryType = $derived.by(() => {
		if (box.current) return 'box'
		if (sphere.current) return 'sphere'
		if (capsule.current) return 'capsule'
		return 'none'
	})

	const geometryTypes = ['none', 'box', 'sphere', 'capsule'] as const

	let geometryTabIndex = $derived(geometryTypes.indexOf(geometryType))

	$effect(() => {
		const nextType = geometryTypes[geometryTabIndex]

		/**
		 * geometryTabIndex is derived from the entity's geometry traits, so on
		 * selection (or any trait-driven recompute) nextType already equals
		 * geometryType — firing then would call updateFrame, dirtying the part
		 * config and resetting the geometry to default dimensions. Only a user
		 * tab pick sets geometryTabIndex ahead of the trait, so guard on the two
		 * differing to fire solely for user-initiated changes.
		 */
		if (nextType === geometryType) return

		frameEditor.setGeometryType(entity, nextType)
	})

	const handleBoxChange = (event: PointChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		const next = event.detail.value as PointValue3dObject
		frameEditor.setGeometry(entity, {
			type: 'box',
			x: next.x,
			y: next.y,
			z: next.z,
		})
	}

	const handleSphereRChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		frameEditor.setGeometry(entity, { type: 'sphere', r: event.detail.value })
	}

	const handleCapsuleRChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		frameEditor.setGeometry(entity, { type: 'capsule', r: event.detail.value })
	}

	const handleCapsuleLChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		frameEditor.setGeometry(entity, { type: 'capsule', l: event.detail.value })
	}
</script>

{#snippet ImmutableField({
	label,
	value,
	ariaLabel,
}: {
	label?: string
	value?: number | string
	ariaLabel: string
})}
	<div>
		<span
			class="text-subtle-2"
			aria-label={`immutable ${ariaLabel}`}
		>
			{label}
		</span>

		{typeof value === 'number' ? value.toFixed(2) : (value ?? '-')}
	</div>
{/snippet}

{#if editable}
	<div>
		<strong class="font-semibold">geometry</strong>
		<span class="text-subtle-2">(mm)</span>
		<div aria-label="mutable geometry">
			<TabGroup bind:selectedIndex={geometryTabIndex}>
				<TabPage title="None" />
				<TabPage title="Box">
					{#if box.current}
						<div aria-label="mutable box dimensions">
							<Point
								value={{
									x: box.current.x,
									y: box.current.y,
									z: box.current.z,
								}}
								min={0}
								on:change={handleBoxChange}
							/>
						</div>
					{/if}
				</TabPage>
				<TabPage title="Sphere">
					{#if sphere.current}
						<div aria-label="mutable sphere dimensions">
							<Slider
								label="r"
								value={sphere.current.r}
								min={0}
								on:change={handleSphereRChange}
							/>
						</div>
					{/if}
				</TabPage>
				<TabPage title="Capsule">
					{#if capsule.current}
						<div aria-label="mutable capsule dimensions">
							<Slider
								label="r"
								value={capsule.current.r}
								min={0}
								on:change={handleCapsuleRChange}
							/>
							<Slider
								label="l"
								value={capsule.current.l}
								min={0}
								on:change={handleCapsuleLChange}
							/>
						</div>
					{/if}
				</TabPage>
			</TabGroup>
		</div>
	</div>
{:else if box.current}
	<div>
		<strong class="font-semibold">dimensions</strong>
		<span class="text-subtle-2">(box) (mm)</span>
		<div class="mt-0.5 flex items-center gap-2">
			{@render ImmutableField({
				label: 'x',
				ariaLabel: 'box dimensions x value input',
				value: box.current.x,
			})}
			{@render ImmutableField({
				label: 'y',
				ariaLabel: 'box dimensions y value input',
				value: box.current.y,
			})}
			{@render ImmutableField({
				label: 'z',
				ariaLabel: 'box dimensions z value input',
				value: box.current.z,
			})}
		</div>
	</div>
{:else if capsule.current}
	<div>
		<strong class="font-semibold">dimensions</strong>
		<span class="text-subtle-2">(capsule) (mm)</span>
		<div class="mt-0.5 flex items-center gap-2">
			{@render ImmutableField({
				label: 'r',
				ariaLabel: 'capsule dimensions radius value input',
				value: capsule.current.r,
			})}
			{@render ImmutableField({
				label: 'l',
				ariaLabel: 'capsule dimensions length value input',
				value: capsule.current.l,
			})}
		</div>
	</div>
{:else if sphere.current}
	<div>
		<strong class="font-semibold">dimensions (sphere)</strong>
		<div class="flex items-center gap-2">
			{@render ImmutableField({
				label: 'r',
				ariaLabel: 'sphere dimensions radius value',
				value: sphere.current.r,
			})}
		</div>
	</div>
{/if}
