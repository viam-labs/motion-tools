<script lang="ts">
	import { Not } from 'koota'

	import { traits, useQuery } from '$lib/ecs'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import Arrows from './Arrows/ArrowGroups.svelte'
	import AxesHelpers from './AxesHelpers.svelte'
	import Boxes from './Boxes.svelte'
	import Capsules from './Capsules.svelte'
	import Frame from './Frame.svelte'
	import Geometry from './Geometry.svelte'
	import GLTF from './GLTF.svelte'
	import Labels from './Labels.svelte'
	import Line from './Line.svelte'
	import Points from './Points.svelte'
	import Spheres from './Spheres.svelte'

	const resourceGeometriesEntities = useQuery(traits.GeometriesAPI)
	const meshEntities = useQuery(Not(traits.Points), traits.BufferGeometry)
	const points = useQuery(traits.Points)
	const lines = useQuery(traits.LinePositions)
	const gltfs = useQuery(traits.GLTF)

	const settings = useSettings()

	const enableLabels = $derived(settings.current.enableLabels)
</script>

{#each resourceGeometriesEntities.current as entity (entity)}
	<Geometry {entity} />
{/each}

{#each meshEntities.current as entity (entity)}
	<Frame {entity} />
{/each}

{#each points.current as entity (entity)}
	<Points {entity} />
{/each}

{#each lines.current as entity (entity)}
	<Line {entity} />
{/each}

{#each gltfs.current as entity (entity)}
	<GLTF {entity} />
{/each}

<Arrows />
<AxesHelpers />
<Boxes />
<Capsules />
<Spheres />

{#if enableLabels}
	<Labels />
{/if}
