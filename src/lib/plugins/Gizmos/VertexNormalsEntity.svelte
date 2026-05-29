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

	import { hierarchy, relations, traits, useTarget, useTrait, useWorld } from '$lib/ecs'

	import { buildNormalsMesh } from './buildNormalsMesh'
	import { VertexNormals } from './traits'

	interface Props {
		entity: Entity
	}

	let { entity }: Props = $props()

	const world = useWorld()
	const { invalidate } = useThrelte()

	const sourceTarget = useTarget(() => entity, relations.ChildOf)
	const source = $derived(sourceTarget.current)

	const sourceMatrix = useTrait(() => source, traits.WorldMatrix)
	const sourceBox = useTrait(() => source, traits.Box)
	const sourceSphere = useTrait(() => source, traits.Sphere)
	const sourceCapsule = useTrait(() => source, traits.Capsule)
	const sourceBuffer = useTrait(() => source, traits.BufferGeometry)
	const config = useTrait(() => entity, VertexNormals)
	const colorTrait = useTrait(() => entity, traits.Color)

	let helper = $state.raw<VertexNormalsHelper>()
	let mesh: Mesh | undefined
	let hasHadSource = false

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
		if (source && source.isAlive()) {
			hasHadSource = true
		} else if (hasHadSource && entity.isAlive()) {
			hierarchy.destroyEntityTree(world, entity)
		}
	})

	onDestroy(() => {
		helper?.dispose()
		mesh?.geometry.dispose()
	})
</script>

{#if helper}
	<T
		is={helper}
		raycast={() => null}
		bvh={{ enabled: false }}
	/>
{/if}
