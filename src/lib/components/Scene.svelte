<script lang="ts">
	import { Color, Vector3 } from 'three'
	import { T } from '@threlte/core'
	import { Gizmo, Grid, PortalTarget, interactivity } from '@threlte/extras'
	import Frames from '$lib/components/Frames.svelte'
	import Pointclouds from '$lib/components/Pointclouds.svelte'
	import CameraControls from '$lib/components/CameraControls.svelte'
	import Selected from '$lib/components/Selected.svelte'
	import Focus from '$lib/components/Focus.svelte'
	import StaticGeometries from '$lib/components/StaticGeometries.svelte'
	import Shapes from '$lib/components/Shapes.svelte'
	import Camera from '$lib/components/Camera.svelte'
	import { useFocused } from '$lib/hooks/useSelection.svelte'
	import type { Snippet } from 'svelte'
	import { useXR } from '@threlte/xr'

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

	const focused = useFocused()

	const { isPresenting } = useXR()
</script>

<T.Color
	attach="background"
	args={[new Color('white')]}
/>

{#if focused.current === undefined}
	<Camera position={[3, 3, 3]}>
		{#if !$isPresenting}
			<CameraControls>
				<Gizmo />
			</CameraControls>
		{/if}
	</Camera>

	<PortalTarget id="world" />

	<StaticGeometries />
	<Frames />
	<Pointclouds />
	<Shapes />

	<Selected />

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
