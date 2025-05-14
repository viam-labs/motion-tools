<script lang="ts">
	import { Color, Vector3 } from 'three'
	import { T } from '@threlte/core'
	import { Gizmo, Grid, PortalTarget, interactivity } from '@threlte/extras'
	import Frames from './Frames.svelte'
	import Pointclouds from './Pointclouds.svelte'
	import CameraControls from './CameraControls.svelte'
	import Selected from './Selected.svelte'
	import Focus from './Focus.svelte'
	import StaticGeometries from './StaticGeometries.svelte'
	import Shapes from './Shapes.svelte'
	import Camera from './Camera.svelte'
	import { useFocused } from '../hooks/useSelection.svelte'
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
