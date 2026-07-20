<script lang="ts">
	import type { Entity } from 'koota'

	import { useThrelte } from '@threlte/core'
	import { SvelteMap } from 'svelte/reactivity'
	import { Color } from 'three'

	import { STRIDE } from '$lib/buffer'
	import { traits, useWorld } from '$lib/ecs'
	import { InstancedArrows } from '$lib/three/InstancedArrows/InstancedArrows'

	import Arrows from './Arrows.svelte'

	const world = useWorld()
	const { invalidate } = useThrelte()

	const map = new SvelteMap<Entity, InstancedArrows>()

	const colorUtil = new Color()

	const onAdd = (entity: Entity) => {
		const poses = entity.get(traits.Positions)
		const color = entity.get(traits.Color)
		const colors = entity.get(traits.Colors)
		const { headAtPose } = entity.get(traits.Arrows) ?? {}

		if (!poses) return

		const total = poses.length / STRIDE.ARROWS
		const uniformColor = color ? colorUtil.setRGB(color.r, color.g, color.b) : undefined

		const arrows = new InstancedArrows({ count: total, uniformColor })
		map.set(entity, arrows)
		arrows.update({ poses, colors, headAtPose })

		// DEBUG(draw-event): remove once the same-UUID arrow update path is confirmed.
		console.info('[draw-event] arrows.onAdd', { count: total, firstPoseXmm: poses[0] })
	}

	/**
	 * Re-drawing an arrows entity in place (same UUID) rewrites its Positions/Colors
	 * traits. Push the new buffers straight into the already-mounted InstancedArrows so it
	 * re-renders without a remount — mirroring how points mutate their live BufferGeometry.
	 * Rebuilding and swapping `<T is={...}>` under the same {#each} key does not re-mount,
	 * which is why the arrows previously stayed frozen at their first-drawn pose. Only fall
	 * back to a rebuild when the instance count or color layout changes, since both are
	 * fixed when the instanced mesh is constructed.
	 */
	const onChange = (entity: Entity) => {
		if (!entity.has(traits.Arrows)) return

		const existing = map.get(entity)
		const poses = entity.get(traits.Positions)
		if (!existing || !poses) {
			onRemove(entity)
			onAdd(entity)
			return
		}

		const colors = entity.get(traits.Colors)
		const countChanged = poses.length / STRIDE.ARROWS !== existing.count
		const colorLayoutChanged =
			(colors !== undefined) !== (existing.attributes.instanceColor !== undefined)

		if (countChanged || colorLayoutChanged) {
			// DEBUG(draw-event): remove once the same-UUID arrow update path is confirmed.
			console.info('[draw-event] arrows.onChange rebuild', {
				count: poses.length / STRIDE.ARROWS,
				firstPoseXmm: poses[0],
			})
			onRemove(entity)
			onAdd(entity)
			return
		}

		existing.update({ poses, colors, headAtPose: entity.get(traits.Arrows)?.headAtPose })
		invalidate()

		// DEBUG(draw-event): remove once the same-UUID arrow update path is confirmed.
		console.info('[draw-event] arrows.onChange inPlace', {
			count: existing.count,
			firstPoseXmm: poses[0],
		})
	}

	const onRemove = (entity: Entity) => {
		map.get(entity)?.dispose()
		map.delete(entity)
	}

	$effect(() => {
		const unsubAdd = world.onAdd(traits.Arrows, onAdd)
		const unsubRemove = world.onRemove(traits.Arrows, onRemove)
		// onAdd/onChange read Positions/Color/Colors as well as Arrows, so rebuild when any
		// of them changes. In-place redraws (same UUID) mutate Positions/Colors without
		// touching Arrows, so watching Arrows alone leaves the arrows frozen.
		const unsubArrowsChange = world.onChange(traits.Arrows, onChange)
		const unsubPositionsChange = world.onChange(traits.Positions, onChange)
		const unsubColorChange = world.onChange(traits.Color, onChange)
		const unsubColorsChange = world.onChange(traits.Colors, onChange)

		return () => {
			unsubAdd()
			unsubRemove()
			unsubArrowsChange()
			unsubPositionsChange()
			unsubColorChange()
			unsubColorsChange()
		}
	})
</script>

{#each map as [entity, arrows] (arrows)}
	<Arrows
		{entity}
		{arrows}
	/>
{/each}
