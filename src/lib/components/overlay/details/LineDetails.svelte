<script lang="ts">
	import type { Entity } from 'koota'

	import {
		Color,
		type ColorChangeEvent,
		type ColorValueRgbObject,
		Point,
		type PointValue3dObject,
		Slider,
		type SliderChangeEvent,
	} from 'svelte-tweakpane-ui'

	import { traits, useTrait } from '$lib/ecs'

	interface Props {
		entity: Entity
	}

	let { entity }: Props = $props()

	const linePositions = useTrait(() => entity, traits.LinePositions)
	const lineWidth = useTrait(() => entity, traits.LineWidth)
	const dotSize = useTrait(() => entity, traits.DotSize)
	const dotColors = useTrait(() => entity, traits.DotColors)

	const linePositionList = $derived.by<PointValue3dObject[]>(() => {
		const positions = linePositions.current
		if (!positions) return []
		const out: PointValue3dObject[] = []
		for (let i = 0; i + 2 < positions.length; i += 3) {
			out.push({ x: positions[i]!, y: positions[i + 1]!, z: positions[i + 2]! })
		}
		return out
	})

	const dotColorValue = $derived.by<ColorValueRgbObject | undefined>(() => {
		const colors = dotColors.current
		if (!colors || colors.length < 3) return undefined
		return { r: colors[0]! / 255, g: colors[1]! / 255, b: colors[2]! / 255 }
	})

	const writeLinePosition = (index: number, value: PointValue3dObject) => {
		const current = linePositions.current
		if (!current) return
		const next = new Float32Array(current)
		next[index * 3 + 0] = value.x
		next[index * 3 + 1] = value.y
		next[index * 3 + 2] = value.z
		entity.set(traits.LinePositions, next)
	}

	const appendLinePosition = () => {
		const current = linePositions.current ?? new Float32Array()
		const next = new Float32Array(current.length + 3)
		next.set(current)
		const lastIndex = current.length - 3
		if (lastIndex >= 0) {
			next[current.length + 0] = current[lastIndex]! + 0.1
			next[current.length + 1] = current[lastIndex + 1]!
			next[current.length + 2] = current[lastIndex + 2]!
		}
		entity.set(traits.LinePositions, next)
	}

	const removeLinePosition = (index: number) => {
		const current = linePositions.current
		if (!current || current.length <= 6) return
		const next = new Float32Array(current.length - 3)
		next.set(current.subarray(0, index * 3), 0)
		next.set(current.subarray((index + 1) * 3), index * 3)
		entity.set(traits.LinePositions, next)
	}

	const handleLineWidthChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		entity.set(traits.LineWidth, event.detail.value)
	}

	const handleDotSizeChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		entity.set(traits.DotSize, event.detail.value)
	}

	const handleDotColorChange = (event: ColorChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		const next = event.detail.value as ColorValueRgbObject
		entity.set(
			traits.DotColors,
			new Uint8Array([Math.round(next.r * 255), Math.round(next.g * 255), Math.round(next.b * 255)])
		)
	}
</script>

{#if linePositions.current}
	<div>
		<strong class="font-semibold">line positions</strong>
		<span class="text-subtle-2">(m)</span>
		<div aria-label="mutable line positions">
			<div class="flex max-h-64 flex-col gap-1 overflow-y-auto">
				{#each linePositionList as position, index (index)}
					<div class="flex items-end gap-1">
						<div class="flex-1">
							<Point
								value={position}
								on:change={(event) => {
									if (event.detail.origin !== 'internal') return
									writeLinePosition(index, event.detail.value as PointValue3dObject)
								}}
							/>
						</div>
						<button
							class="text-subtle-2 px-1 py-0.5 text-[10px] hover:text-red-500"
							type="button"
							aria-label={`remove position ${index + 1}`}
							disabled={linePositionList.length <= 2}
							onclick={() => removeLinePosition(index)}
						>
							×
						</button>
					</div>
				{/each}
			</div>
			<button
				class="border-medium hover:bg-light mt-1 border px-2 py-1 text-xs"
				type="button"
				onclick={appendLinePosition}
			>
				Add position
			</button>
		</div>
	</div>

	<div>
		<strong class="font-semibold">line width</strong>
		<Slider
			value={lineWidth.current ?? 5}
			min={0.1}
			max={50}
			step={0.1}
			on:change={handleLineWidthChange}
		/>
	</div>

	<div>
		<strong class="font-semibold">dot size</strong>
		<Slider
			value={dotSize.current ?? 10}
			min={0}
			max={50}
			step={0.1}
			on:change={handleDotSizeChange}
		/>
	</div>

	{#if dotColorValue}
		<div>
			<strong class="font-semibold">dot color</strong>
			<Color
				value={dotColorValue}
				type="float"
				on:change={handleDotColorChange}
			/>
		</div>
	{/if}
{/if}
