<script lang="ts">
	import type { Pose } from '@viamrobotics/sdk'
	import type { Entity } from 'koota'

	import { T, type Props as ThrelteProps, useThrelte } from '@threlte/core'
	import { type Snippet } from 'svelte'
	import { Color, DoubleSide, FrontSide, Mesh, MeshToonMaterial } from 'three'

	import { asColor } from '$lib/buffer'
	import { colors, darkenColor } from '$lib/color'
	import { traits, useTrait } from '$lib/ecs'
	import { poseToObject3d } from '$lib/transform'

	interface Props extends Omit<ThrelteProps<Mesh>, 'ref'> {
		entity: Entity
		color?: string
		center?: Pose
		children?: Snippet
	}

	const { entity, color: overrideColor, center, children, ...rest }: Props = $props()

	const { invalidate } = useThrelte()
	const name = useTrait(() => entity, traits.Name)
	const entityColors = useTrait(() => entity, traits.Colors)
	const entityColor = useTrait(() => entity, traits.Color)
	const opacity = useTrait(() => entity, traits.Opacity)
	const bufferGeometry = useTrait(() => entity, traits.BufferGeometry)
	const materialProps = useTrait(() => entity, traits.Material)
	const renderOrder = useTrait(() => entity, traits.RenderOrder)

	const color = $derived.by(() => {
		if (overrideColor) {
			return overrideColor
		}

		if (entityColors.current) {
			return asColor(entityColors.current, new Color())
		}

		if (entityColor.current) {
			return new Color().setRGB(entityColor.current.r, entityColor.current.g, entityColor.current.b)
		}

		return colors.default
	})

	const hasVertexColors = $derived(bufferGeometry.current?.getAttribute('color') !== undefined)

	const currentOpacity = $derived(opacity.current ?? 0.7)

	const material = new MeshToonMaterial()

	$effect(() => {
		const isTransparent = currentOpacity < 1
		material.depthWrite = !isTransparent
		material.opacity = currentOpacity
		if (material.transparent !== isTransparent) {
			material.transparent = isTransparent
			material.needsUpdate = true
		}
		invalidate()
	})

	const mesh = new Mesh()

	$effect(() => {
		if (center) {
			poseToObject3d(center, mesh)
			invalidate()
		}
	})
</script>

<T
	is={mesh}
	name={entity}
	userData.name={name}
	renderOrder={renderOrder.current}
	{...rest}
>
	{#if bufferGeometry.current}
		<T is={bufferGeometry.current}>
			{#snippet children({ ref: geo })}
				<!--
					TODO(mp) currently some bufferGeometries are coming in empty,
					this is a quick fix but this should be handled upstream
				-->
				{#if geo.getAttribute('position').array.length > 0}
					<T.LineSegments
						raycast={() => null}
						bvh={{ enabled: false }}
					>
						<T.EdgesGeometry args={[geo, 0]} />
						<T.LineBasicMaterial color={darkenColor(color, 10)} />
					</T.LineSegments>
				{/if}
			{/snippet}
		</T>
	{/if}

	<T
		is={material}
		color={hasVertexColors ? 0xffffff : color}
		vertexColors={hasVertexColors}
		side={bufferGeometry.current ? DoubleSide : FrontSide}
		depthTest={materialProps.current?.depthTest ?? true}
	/>

	{@render children?.()}
</T>
