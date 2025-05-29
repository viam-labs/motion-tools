<script lang="ts">
	import { Color, Vector3 } from 'three'
	import { T } from '@threlte/core'
	import { Gizmo, Grid, interactivity } from '@threlte/extras'
	import { PortalTarget } from './portal'
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
	import { useTransformControls } from '$lib/hooks/useControls.svelte'

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
	const transformControls = useTransformControls()

	const { isPresenting } = useXR()
</script>

<T.Color
	attach="background"
	args={[new Color('white')]}
/>

<T.Group rotation.x={$isPresenting ? -Math.PI / 2 : 0}>
	{#if focused.current === undefined}
		{#if !$isPresenting}
			<Camera position={[3, 3, 3]}>
				<CameraControls enabled={!transformControls.active}>
					<Gizmo />
				</CameraControls>
			</Camera>
		{/if}

		<PortalTarget id="world" />

		<StaticGeometries />
		<Frames />
		<Pointclouds />
		<Shapes />

		<Selected />

		{#if !$isPresenting}
			<Grid
				plane="xy"
				sectionColor="lightgrey"
				infiniteGrid
				fadeOrigin={new Vector3()}
				fadeDistance={25}
			/>
		{/if}
	{:else}
		<Focus />
	{/if}

	{@render children?.()}

	<T.DirectionalLight position={[3, 3, 3]} />
	<T.DirectionalLight position={[-3, -3, -3]} />
	<T.AmbientLight />
</T.Group>
