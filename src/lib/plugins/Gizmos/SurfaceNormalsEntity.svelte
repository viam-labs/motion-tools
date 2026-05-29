<script
	lang="ts"
	module
>
	import { Color } from 'three'

	const colorUtil = new Color()
</script>

<script lang="ts">
	import type { Entity } from 'koota'

	import { T, useThrelte } from '@threlte/core'
	import { onDestroy, untrack } from 'svelte'
	import { type Mesh } from 'three'
	import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js'

	import { hierarchy, relations, traits, useTrait, useWorld } from '$lib/ecs'

	import { buildNormalsMesh } from './buildNormalsMesh'
	import { SurfaceNormals } from './traits'

	interface Props {
		entity: Entity
	}

	let { entity }: Props = $props()

	const world = useWorld()
	const { invalidate } = useThrelte()

	const source = $derived(entity.targetFor(relations.ChildOf))

	const sourceMatrix = useTrait(() => source, traits.WorldMatrix)
	const sourceBox = useTrait(() => source, traits.Box)
	const sourceSphere = useTrait(() => source, traits.Sphere)
	const sourceCapsule = useTrait(() => source, traits.Capsule)
	const sourceBuffer = useTrait(() => source, traits.BufferGeometry)
	const config = useTrait(() => entity, SurfaceNormals)
	const colorTrait = useTrait(() => entity, traits.Color)

	let helper = $state.raw<VertexNormalsHelper>()
	let mesh: Mesh | undefined

	$effect.pre(() => {
		if (!source) return

		void sourceBox.current
		void sourceSphere.current
		void sourceCapsule.current
		void sourceBuffer.current
		const c = colorTrait.current
		const lengthMm = config.current?.length ?? 100

		untrack(() => {
			helper?.dispose()
			mesh?.geometry.dispose()
		})

		const next = buildNormalsMesh(source)
		if (!next) {
			helper = undefined
			mesh = undefined
			return
		}

		if (c) colorUtil.setRGB(c.r, c.g, c.b)
		else colorUtil.setRGB(1, 0, 0)

		mesh = next
		helper = new VertexNormalsHelper(next, lengthMm * 0.001, colorUtil.getHex())
		invalidate()
	})

	$effect.pre(() => {
		if (!helper || !mesh) return
		const matrix = sourceMatrix.current
		if (!matrix) return

		mesh.matrixWorld.copy(matrix)
		helper.update()
		invalidate()
	})

	$effect(() => {
		void sourceMatrix.current
		if (source && !source.isAlive() && entity.isAlive()) {
			hierarchy.destroyEntityTree(world, entity)
		}
	})

	onDestroy(() => {
		helper?.dispose()
		mesh?.geometry.dispose()
	})
</script>

{#if helper}
	<T is={helper} />
{/if}
