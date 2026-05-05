<!--
@component

A compound capsule via a shared open-ended unit cylinder and two
hemispheres, each scaled per `r` and `l`, so dimension changes update
transforms only and cause no geometry rebuild.

Viam's capsule `l` is the *total* length, including the rounded caps, so the 
midsection has length `l - 2r`.
-->
<script
	module
	lang="ts"
>
	import { CylinderGeometry, EdgesGeometry, SphereGeometry } from 'three'

	const unitCylinder = new CylinderGeometry(1, 1, 1, 16, 1, true)
	unitCylinder.rotateX(Math.PI / 2)

	/**
	 * Hemisphere with rounded part toward +Z and an open boundary on the XY plane.
	 * 6 height segments matches the existing sphere's density (`Mesh.svelte` uses `SphereGeometry(1, 16, 12)`).
	 */
	const unitHemisphere = new SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2)
	unitHemisphere.rotateX(Math.PI / 2)

	const unitCylinderEdges = new EdgesGeometry(unitCylinder, 0)
	const unitHemisphereEdges = new EdgesGeometry(unitHemisphere, 0)
</script>

<script lang="ts">
	import type { ColorRepresentation } from 'three'

	import { T, useThrelte } from '@threlte/core'
	import { LineBasicMaterial, MeshToonMaterial } from 'three'

	import { darkenColor } from '$lib/color'

	interface Props {
		r: number
		l: number
		color: ColorRepresentation
		opacity?: number
		depthTest?: boolean
	}

	let { r, l, color, opacity = 1, depthTest = true }: Props = $props()

	const { invalidate } = useThrelte()
	const material = new MeshToonMaterial()
	const lineMaterial = new LineBasicMaterial()

	$effect(() => {
		material.color.set(color)
		lineMaterial.color.set(darkenColor(color, 10))
		invalidate()
	})

	$effect(() => {
		const isTransparent = opacity < 1
		material.opacity = opacity
		material.depthWrite = opacity === 1
		material.depthTest = depthTest
		lineMaterial.depthTest = depthTest
		if (material.transparent !== isTransparent) {
			material.transparent = isTransparent
			material.needsUpdate = true
		}
		invalidate()
	})

	const midsection = $derived(Math.max(0, l - 2 * r))
	const halfMid = $derived(midsection / 2)
</script>

{#if midsection > 0}
	<T.Mesh scale={[r, r, midsection]}>
		<T
			is={unitCylinder}
			dispose={false}
		/>
		<T is={material} />
		<T.LineSegments
			raycast={() => null}
			bvh={{ enabled: false }}
		>
			<T
				is={unitCylinderEdges}
				dispose={false}
			/>
			<T is={lineMaterial} />
		</T.LineSegments>
	</T.Mesh>
{/if}

<T.Mesh
	position={[0, 0, halfMid]}
	scale={r}
>
	<T
		is={unitHemisphere}
		dispose={false}
	/>
	<T is={material} />
	<T.LineSegments
		raycast={() => null}
		bvh={{ enabled: false }}
	>
		<T
			is={unitHemisphereEdges}
			dispose={false}
		/>
		<T is={lineMaterial} />
	</T.LineSegments>
</T.Mesh>

<T.Mesh
	position={[0, 0, -halfMid]}
	rotation={[Math.PI, 0, 0]}
	scale={[r, r, r]}
>
	<T
		is={unitHemisphere}
		dispose={false}
	/>
	<T is={material} />
	<T.LineSegments
		raycast={() => null}
		bvh={{ enabled: false }}
	>
		<T
			is={unitHemisphereEdges}
			dispose={false}
		/>
		<T is={lineMaterial} />
	</T.LineSegments>
</T.Mesh>
