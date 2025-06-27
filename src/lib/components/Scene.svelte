<script lang="ts">
	import { Color, Vector3 } from 'three'
	import { T } from '@threlte/core'
	import {
		CameraControls,
		type CameraControlsRef,
		Gizmo,
		Grid,
		interactivity,
	} from '@threlte/extras'
	import { PortalTarget } from './portal'
	import Frames from '$lib/components/Frames.svelte'
	import Pointclouds from '$lib/components/Pointclouds.svelte'
	import Selected from '$lib/components/Selected.svelte'
	import Focus from '$lib/components/Focus.svelte'
	import StaticGeometries from '$lib/components/StaticGeometries.svelte'
	import Shapes from '$lib/components/Shapes.svelte'
	import Camera from '$lib/components/Camera.svelte'
	import { useFocused } from '$lib/hooks/useSelection.svelte'
	import type { Snippet } from 'svelte'
	import { useXR } from '@threlte/xr'
	import { useTransformControls } from '$lib/hooks/useControls.svelte'
	import KeyboardControls from './KeyboardControls.svelte'
	import { useOrigin } from './xr/useOrigin.svelte'

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
	const origin = useOrigin()

	const { isPresenting } = useXR()
</script>

<T.Color
	attach="background"
	args={[new Color('white')]}
/>

<T.Group
	position={origin.position}
	rotation.x={$isPresenting ? -Math.PI / 2 : 0}
	rotation.z={origin.rotation}
>
	{#if focused.current === undefined}
		{#if !$isPresenting}
			<Camera position={[3, 3, 3]}>
				<CameraControls enabled={!transformControls.active}>
					{#snippet children({ ref }: { ref: CameraControlsRef })}
						<KeyboardControls cameraControls={ref} />
						<Gizmo />
					{/snippet}
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
				sectionColor="#333"
				infiniteGrid
				cellSize={0.5}
				sectionSize={10}
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
