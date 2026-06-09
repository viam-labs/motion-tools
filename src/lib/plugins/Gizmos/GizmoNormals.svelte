<script
	lang="ts"
	module
>
	import { Color, LineBasicMaterial } from 'three'

	const sharedLineMaterial = new LineBasicMaterial({ toneMapped: false })
	const colorUtil = new Color()
</script>

<script lang="ts">
	import type { Entity } from 'koota'

	import { T, useThrelte } from '@threlte/core'
	import { onDestroy, untrack } from 'svelte'
	import { LineSegments, type Mesh } from 'three'
	import { VertexNormalsHelper } from 'three/examples/jsm/helpers/VertexNormalsHelper.js'

	import { hierarchy, relations, traits, useTarget, useTrait, useWorld } from '$lib/ecs'

	import type { NormalsKind } from './gizmos'

	import { buildNormalsMesh } from './buildNormalsMesh'
	import { buildSurfaceNormalsGeometry } from './buildSurfaceNormalsGeometry'
	import { SurfaceNormals, VertexNormals } from './traits'

	interface Props {
		entity: Entity
		kind: NormalsKind
	}

	const { entity, kind }: Props = $props()

	const world = useWorld()
	const { invalidate } = useThrelte()
	const sourceTarget = useTarget(() => entity, relations.ChildOf)
	const surfaceConfig = useTrait(() => entity, SurfaceNormals)
	const vertexConfig = useTrait(() => entity, VertexNormals)
	const colorTrait = useTrait(() => entity, traits.Color)

	const source = $derived(sourceTarget.current)
	const sourceMatrix = useTrait(() => source, traits.WorldMatrix)
	const sourceBox = useTrait(() => source, traits.Box)
	const sourceSphere = useTrait(() => source, traits.Sphere)
	const sourceCapsule = useTrait(() => source, traits.Capsule)
	const sourceBuffer = useTrait(() => source, traits.BufferGeometry)

	let helper = $state.raw<LineSegments | VertexNormalsHelper>()
	let sourceMesh: Mesh | undefined

	const length = $derived(
		(kind === 'surface' ? surfaceConfig.current?.length : vertexConfig.current?.length) ?? 100
	)

	$effect(() => {
		if (!source) return

		void sourceBox.current
		void sourceSphere.current
		void sourceCapsule.current
		void sourceBuffer.current
		if (!sourceMatrix.current) return

		untrack(disposeHelper)

		const next = buildNormalsMesh(source)
		if (!next) {
			helper = undefined
			sourceMesh = undefined
			return
		}

		sourceMesh = next
		const color = untrack(() => colorTrait.current)
		if (kind === 'surface') {
			const segments = buildSurfaceNormalsGeometry(
				next.geometry,
				length * 0.001,
				sourceMatrix.current
			)

			next.geometry.dispose()
			const material = sharedLineMaterial.clone()
			if (color) material.color.copy(colorUtil.setRGB(color.r, color.g, color.b))
			helper = new LineSegments(segments, material)
		} else {
			colorUtil.setRGB(color?.r ?? 1, color?.g ?? 0, color?.b ?? 0)
			helper = new VertexNormalsHelper(next, length * 0.001, colorUtil.getHex())
		}

		invalidate()
	})

	$effect(() => {
		if (!colorTrait.current) return
		if (!helper) return

		colorUtil.setRGB(colorTrait.current.r, colorTrait.current.g, colorTrait.current.b)
		const material = helper instanceof LineSegments ? helper.material : undefined
		if (material instanceof LineBasicMaterial) material.color.copy(colorUtil)
		invalidate()
	})

	$effect(() => {
		if (kind !== 'vertex') return
		if (!sourceMatrix.current) return
		if (!sourceMesh) return
		if (!(helper instanceof VertexNormalsHelper)) return

		sourceMesh.matrixWorld.copy(sourceMatrix.current)
		helper.update()
		invalidate()
	})

	let previousSource: Entity | undefined = undefined
	$effect(() => {
		if (source !== undefined && source.isAlive()) {
			previousSource = source
			return
		}

		if (previousSource !== undefined && entity.isAlive()) {
			hierarchy.destroyEntityTree(world, entity)
		}
	})

	const disposeHelper = () => {
		if (!helper) return
		if (helper instanceof VertexNormalsHelper) helper.dispose()
		else if (helper instanceof LineSegments) {
			helper.geometry.dispose()
			if (helper.material instanceof LineBasicMaterial) helper.material.dispose()
		}
	}

	onDestroy(disposeHelper)
</script>

{#if helper}
	<T
		is={helper}
		raycast={() => null}
		bvh={{ enabled: false }}
	/>
{/if}
