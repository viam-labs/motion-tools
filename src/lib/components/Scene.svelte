<script lang="ts">
	import { Color, Vector3 } from 'three'
	import { T } from '@threlte/core'
	import { Gizmo, Grid, interactivity } from '@threlte/extras'
	import Frames from '$lib/components/Frames.svelte'
	import Pointclouds from '$lib/components/Pointclouds.svelte'
	import CameraControls from '$lib/components/CameraControls.svelte'
	import Selection from '$lib/components/Selection.svelte'
	import Focus from '$lib/components/Focus.svelte'
	import XR from '$lib/components/XR.svelte'
	import StaticGeometries from '$lib/components/StaticGeometries.svelte'
	import Shapes from '$lib/components/Shapes.svelte'
	import Camera from '$lib/components/Camera.svelte'
	import { useFocus } from '$lib/hooks/useSelection.svelte'
	import type { Snippet } from 'svelte'

	interface Props {
		children?: Snippet
	}

	let { children }: Props = $props()

	interactivity({
		filter: (items) => {
			const item = items.find((item) => {
				return item.object.visible === undefined || item.object.visible === true
			})

			return item ? [item] : []
		},
	})

	const focus = useFocus()
</script>

<T.Color
	attach="background"
	args={[new Color('white')]}
/>

{#if focus.current === undefined}
	<Camera position={[3, 3, 3]}>
		<CameraControls>
			<Gizmo />
		</CameraControls>
	</Camera>

	<StaticGeometries />
	<Frames />
	<Pointclouds />
	<Selection />

	<Shapes />

	<Grid
		plane="xy"
		sectionColor="lightgrey"
		infiniteGrid
		fadeOrigin={new Vector3()}
		fadeDistance={25}
	/>
{:else}
	<Focus />
{/if}

{@render children?.()}

<T.DirectionalLight position={[3, 3, 3]} />
<T.DirectionalLight position={[-3, -3, -3]} />
<T.AmbientLight />

<XR />
