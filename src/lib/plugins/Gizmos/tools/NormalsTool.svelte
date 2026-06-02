<script lang="ts">
	import { asRGB } from '$lib/buffer'
	import { relations, traits, useWorld } from '$lib/ecs'

	import type { NormalsKind } from '../gizmos'

	import { selectOnly } from '../selection'
	import { spawnGizmo, SURFACE_NORMALS_COLOR, VERTEX_NORMALS_COLOR } from '../spawn'
	import { findSurfaceHit } from '../surface'
	import SurfacePoint from '../SurfacePoint.svelte'
	import { SurfaceNormals, VertexNormals } from '../traits'
	import { useGizmos } from '../useGizmos.svelte'
	import { usePlace } from '../usePlace.svelte'

	interface Props {
		kind: NormalsKind
	}

	const { kind }: Props = $props()

	const world = useWorld()
	const gizmos = useGizmos()
	const place = usePlace(() => ({
		findHit: (intersections) => findSurfaceHit(world, intersections),
		onPlace: ({ entity: source }) => {
			const isSurface = kind === 'surface'
			const lengthTrait = isSurface
				? SurfaceNormals({ length: gizmos.surfaceNormalsLength })
				: VertexNormals({ length: gizmos.vertexNormalsLength })

			const colorBytes = isSurface ? SURFACE_NORMALS_COLOR : VERTEX_NORMALS_COLOR
			const entity = spawnGizmo(world, {
				kind: isSurface ? 'surface normals' : 'vertex normals',
				traits: [
					lengthTrait,
					traits.Color(asRGB(colorBytes, { r: 0, g: 0, b: 0 })),
					relations.ChildOf(source),
				],
			})

			selectOnly(world, entity)
			gizmos.exit()
		},
	}))
</script>

{#if place.current}
	<SurfacePoint
		entity={place.current.entity}
		position={place.current.position.toArray()}
	/>
{/if}
