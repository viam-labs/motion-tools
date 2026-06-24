<script
	module
	lang="ts"
>
	import { EdgesGeometry, SphereGeometry } from 'three'

	/**
	 * Shared unit geometries — every mesh references these and sets
	 * dimensions through `mesh.scale`, so resizing never rebuilds GPU buffers.
	 */
	const unitSphere = new SphereGeometry(1, 16, 12)
	const unitSphereEdges = new EdgesGeometry(unitSphere, 0)
</script>

<script lang="ts">
	import type { Pose } from '@viamrobotics/sdk'
	import type { Entity } from 'koota'

	import { T, type Props as ThrelteProps, useThrelte } from '@threlte/core'
	import { type Snippet } from 'svelte'
	import { Color, DoubleSide, FrontSide, Group, Material, Mesh } from 'three'

	import { asColor } from '$lib/buffer'
	import { colors, darkenColor } from '$lib/color'
	import { traits, useTrait } from '$lib/ecs'
	import { poseToObject3d } from '$lib/transform'

	import Capsule from './Capsule.svelte'

	interface Props extends Omit<ThrelteProps<Mesh>, 'ref'> {
		entity: Entity
		color?: string
		center?: Pose
		children?: Snippet
	}

	let { entity, color: overrideColor, center, children, ...rest }: Props = $props()

	const colorUtil = new Color()

	const { invalidate } = useThrelte()
	const name = useTrait(() => entity, traits.Name)
	const entityColors = useTrait(() => entity, traits.Colors)
	const entityColor = useTrait(() => entity, traits.Color)
	const opacity = useTrait(() => entity, traits.Opacity)
	const capsule = useTrait(() => entity, traits.Capsule)
	const sphere = useTrait(() => entity, traits.Sphere)
	const bufferGeometry = useTrait(() => entity, traits.BufferGeometry)
	const materialProps = useTrait(() => entity, traits.Material)
	const renderOrder = useTrait(() => entity, traits.RenderOrder)

	const color = $derived.by(() => {
		if (overrideColor) {
			return overrideColor
		}

		if (entityColors.current) {
			return asColor(entityColors.current, colorUtil)
		}

		if (entityColor.current) {
			return colorUtil.setRGB(entityColor.current.r, entityColor.current.g, entityColor.current.b)
		}

		return colors.default
	})

	const currentOpacity = $derived(opacity.current ?? 0.7)

	const isCapsule = $derived(capsule.current !== undefined)

	let material = $state.raw<Material>(new Material())
	$effect(() => {
		const isTransparent = currentOpacity < 1
		material.depthWrite = !isTransparent
		material.opacity = currentOpacity
		if (material.transparent !== isTransparent) {
			material.transparent = isTransparent
			material.needsUpdate = true
			invalidate()
		}
	})

	const mesh = new Mesh()
	const group = new Group()

	$effect(() => {
		const target = isCapsule ? group : mesh
		if (center) {
			poseToObject3d(center, target)
			invalidate()
		}
	})

	$effect(() => {
		if (sphere.current) {
			mesh.scale.setScalar((sphere.current.r ?? 0) * 0.001)
		} else {
			mesh.scale.set(1, 1, 1)
		}
		invalidate()
	})
</script>

{#if isCapsule}
	{@const { r, l } = capsule.current ?? { r: 0, l: 0 }}
	<T
		is={group}
		name={entity}
		userData.name={name}
		renderOrder={renderOrder.current}
		{...rest}
	>
		<Capsule
			r={r * 0.001}
			l={l * 0.001}
			{color}
			opacity={currentOpacity}
			depthTest={materialProps.current?.depthTest ?? true}
		/>

		{@render children?.()}
	</T>
{:else}
	<T
		is={mesh}
		name={entity}
		userData.name={name}
		renderOrder={renderOrder.current}
		{...rest}
	>
		{#if sphere.current}
			<!--
				Switch via a derived `is` on the same <T> so `useAttach`'s effect
				cleanup runs before the new attach. Splitting these across two
				branches of an {#if}/{:else if} races mount-new against unmount-old:
				the new attach saves `mesh.geometry`, then the old cleanup restores
				it to the pre-attach value (null), leaving the mesh geometryless.
			-->
			<T
				is={unitSphere}
				dispose={false}
			/>
			<T.LineSegments
				raycast={() => null}
				bvh={{ enabled: false }}
			>
				<T
					is={unitSphereEdges}
					dispose={false}
				/>
				<T.LineBasicMaterial color={darkenColor(color, 10)} />
			</T.LineSegments>
		{:else if bufferGeometry.current}
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

		<T.MeshToonMaterial
			{color}
			side={bufferGeometry.current ? DoubleSide : FrontSide}
			depthTest={materialProps.current?.depthTest ?? true}
			oncreate={(m) => {
				material = m
			}}
		/>

		{@render children?.()}
	</T>
{/if}
