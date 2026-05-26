<script lang="ts">
	import { Portal } from '@threlte/extras'
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
	import { useFocusedEntity, useSelectedEntity } from '$lib/hooks/useSelection.svelte'

	import { Gizmo } from './traits'

	const selectedEntity = useSelectedEntity()
	const focusedEntity = useFocusedEntity()

	const entity = $derived(focusedEntity.current ?? selectedEntity.current)

	const gizmo = useTrait(() => entity, Gizmo)
	const linePositions = useTrait(() => entity, traits.LinePositions)
	const lineWidth = useTrait(() => entity, traits.LineWidth)
	const dotSize = useTrait(() => entity, traits.DotSize)
	const color = useTrait(() => entity, traits.Color)
	const dotColors = useTrait(() => entity, traits.DotColors)

	const isGizmo = $derived(!!gizmo.current)
	const isLine = $derived(isGizmo && !!linePositions.current)

	const lineVertices = $derived.by<PointValue3dObject[]>(() => {
		const positions = linePositions.current
		if (!positions) return []
		const out: PointValue3dObject[] = []
		for (let i = 0; i + 2 < positions.length; i += 3) {
			out.push({ x: positions[i]!, y: positions[i + 1]!, z: positions[i + 2]! })
		}
		return out
	})

	// `traits.Color` stores normalized RGB (0–1) — feed straight to <Color
	// type="float">.
	const colorValue = $derived.by<ColorValueRgbObject | undefined>(() => {
		const c = color.current
		if (!c) return undefined
		return { r: c.r, g: c.g, b: c.b }
	})

	// `traits.DotColors` is a Uint8Array of 8-bit RGB bytes. A 3-byte array
	// means "one color for all dots". Normalize to 0–1 floats so the picker
	// presentation matches the line color picker — converted back to bytes on
	// write.
	const dotColorValue = $derived.by<ColorValueRgbObject | undefined>(() => {
		const dc = dotColors.current
		if (!dc || dc.length < 3) return undefined
		return { r: dc[0]! / 255, g: dc[1]! / 255, b: dc[2]! / 255 }
	})

	const writeLineVertex = (index: number, value: PointValue3dObject) => {
		if (!entity) return
		const current = linePositions.current
		if (!current) return
		const next = new Float32Array(current)
		next[index * 3 + 0] = value.x
		next[index * 3 + 1] = value.y
		next[index * 3 + 2] = value.z
		entity.set(traits.LinePositions, next)
	}

	const appendLineVertex = () => {
		if (!entity) return
		const current = linePositions.current ?? new Float32Array()
		const next = new Float32Array(current.length + 3)
		next.set(current)
		// Seed the new vertex from the previous one (or origin) so it's visible.
		const lastIndex = current.length - 3
		if (lastIndex >= 0) {
			next[current.length + 0] = current[lastIndex]! + 0.1
			next[current.length + 1] = current[lastIndex + 1]!
			next[current.length + 2] = current[lastIndex + 2]!
		}
		entity.set(traits.LinePositions, next)
	}

	const removeLineVertex = (index: number) => {
		if (!entity) return
		const current = linePositions.current
		if (!current || current.length <= 6) return
		const next = new Float32Array(current.length - 3)
		next.set(current.subarray(0, index * 3), 0)
		next.set(current.subarray((index + 1) * 3), index * 3)
		entity.set(traits.LinePositions, next)
	}

	const handleLineWidthChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal' || !entity) return
		entity.set(traits.LineWidth, event.detail.value)
	}

	const handleDotSizeChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal' || !entity) return
		entity.set(traits.DotSize, event.detail.value)
	}

	const handleColorChange = (event: ColorChangeEvent) => {
		if (event.detail.origin !== 'internal' || !entity) return
		const next = event.detail.value as ColorValueRgbObject
		entity.set(traits.Color, { r: next.r, g: next.g, b: next.b })
	}

	const handleDotColorChange = (event: ColorChangeEvent) => {
		if (event.detail.origin !== 'internal' || !entity) return
		const next = event.detail.value as ColorValueRgbObject
		entity.set(
			traits.DotColors,
			new Uint8Array([Math.round(next.r * 255), Math.round(next.g * 255), Math.round(next.b * 255)])
		)
	}
</script>

{#if isGizmo}
	<Portal id="details-header-extensions">
		<span
			class="border-info-dark text-info-dark rounded-sm border px-1 text-[10px] uppercase"
			aria-label="gizmo entity"
		>
			gizmo
		</span>
	</Portal>
{/if}

{#if isGizmo}
	<Portal id="details-extensions">
		<div class="mt-2 flex flex-col gap-2.5 text-xs">
			{#if isLine}
				<div>
					<strong class="font-semibold">line vertices</strong>
					<span class="text-subtle-2">(m)</span>
					<div
						class="flex flex-col gap-1"
						aria-label="mutable line vertices"
					>
						{#each lineVertices as vertex, index (index)}
							<div class="flex items-end gap-1">
								<div class="flex-1">
									<Point
										value={vertex}
										on:change={(event) => {
											if (event.detail.origin !== 'internal') return
											writeLineVertex(index, event.detail.value as PointValue3dObject)
										}}
									/>
								</div>
								<button
									class="text-subtle-2 px-1 py-0.5 text-[10px] hover:text-red-500"
									type="button"
									aria-label={`remove vertex ${index + 1}`}
									disabled={lineVertices.length <= 2}
									onclick={() => removeLineVertex(index)}
								>
									×
								</button>
							</div>
						{/each}
						<button
							class="border-medium hover:bg-light mt-1 border px-2 py-1 text-xs"
							type="button"
							onclick={appendLineVertex}
						>
							Add vertex
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
			{/if}

			{#if colorValue}
				<div>
					<strong class="font-semibold">{isLine ? 'line color' : 'color'}</strong>
					<Color
						value={colorValue}
						type="float"
						on:change={handleColorChange}
					/>
				</div>
			{/if}

			{#if isLine && dotColorValue}
				<div>
					<strong class="font-semibold">dot color</strong>
					<Color
						value={dotColorValue}
						type="float"
						on:change={handleDotColorChange}
					/>
				</div>
			{/if}
		</div>
	</Portal>
{/if}
