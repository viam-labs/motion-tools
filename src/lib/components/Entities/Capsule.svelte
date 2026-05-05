<!--
@component

Compound capsule. Renders a shared open-ended unit cylinder + two unit
hemispheres, each scaled per `r` and `l`, so dimension changes update
transforms only — no geometry rebuild.

Viam's capsule `l` is the *total* length including the rounded caps, so the
cylindrical midsection has length `l - 2r` (clamped at 0 for degenerate
capsules, where it collapses to a single sphere visual).

Axis is +Z to match Viam's convention (`CapsuleGeometry.ts:21`).

The cylinder is open-ended and the hemispheres are open at their equator,
so under semi-transparent rendering you don't see internal disk caps or
the back-half of cap spheres through the cylinder wall. Edges match the
`<Mesh>` look (built once from the same shared unit geometries).
-->
<script
	module
	lang="ts"
>
	import { CylinderGeometry, EdgesGeometry, SphereGeometry } from 'three'

	const unitCylinder = new CylinderGeometry(1, 1, 1, 16, 1, true)
	unitCylinder.rotateX(Math.PI / 2)

	// Hemisphere with rounded part toward +Z, open boundary on the XY plane.
	// 6 height segments matches the existing sphere's per-hemisphere density
	// (`Mesh.svelte` uses `SphereGeometry(1, 16, 12)`).
	const unitHemisphere = new SphereGeometry(1, 16, 6, 0, Math.PI * 2, 0, Math.PI / 2)
	unitHemisphere.rotateX(Math.PI / 2)

	const unitCylinderEdges = new EdgesGeometry(unitCylinder, 0)
	const unitHemisphereEdges = new EdgesGeometry(unitHemisphere, 0)
</script>

<script lang="ts">
	import type { ColorRepresentation } from 'three'

	import { T } from '@threlte/core'
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

	const material = new MeshToonMaterial()
	const lineMaterial = new LineBasicMaterial()

	$effect(() => {
		material.color.set(color)
		lineMaterial.color.set(darkenColor(color, 10))
	})

	$effect(() => {
		material.opacity = opacity
		material.transparent = opacity < 1
		material.depthWrite = opacity === 1
		material.depthTest = depthTest
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
