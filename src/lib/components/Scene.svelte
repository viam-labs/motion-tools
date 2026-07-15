<script lang="ts">
	import type { Snippet } from 'svelte'

	import { T, useThrelte } from '@threlte/core'
	import { Environment, Grid, interactivity, PerfMonitor, PortalTarget } from '@threlte/extras'
	import { useXR } from '@threlte/xr'
	import { ShaderMaterial } from 'three'

	import Camera from '$lib/components/Camera.svelte'
	import Entities from '$lib/components/Entities/Entities.svelte'
	import Selected from '$lib/components/Selected.svelte'
	import StaticGeometries from '$lib/components/StaticGeometries.svelte'
	import { bvh } from '$lib/hooks/plugins/bvh.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import hdrImage from '../assets/ferndale_studio_11_1k.hdr'
	import BatchedArrows from './BatchedArrows.svelte'
	import CameraControls from './CameraControls.svelte'
	import KeyboardBindings from './KeyboardBindings.svelte'
	import PointerMissBox from './PointerMissBox.svelte'

	interface Props {
		children?: Snippet
	}

	let { children }: Props = $props()

	const threlte = useThrelte()
	const settings = useSettings()

	// @ts-expect-error This is for debugging
	globalThis.__threlte__ = threlte

	const { raycaster, enabled } = interactivity({
		filter: (intersections) => {
			const match = intersections.find((intersection) => {
				return intersection.object.visible === undefined || intersection.object.visible === true
			})

			return match ? [match] : []
		},
	})

	$effect(() => {
		enabled.set(settings.current.interactionMode === 'navigate')
	})

	const bvhEnabled = $derived(
		settings.current.renderSubEntityHoverDetail ||
			settings.current.interactionMode === 'measure' ||
			settings.current.interactionMode === 'select' ||
			settings.current.interactionMode === 'gizmo'
	)

	bvh(raycaster, () => ({ helper: false, enabled: bvhEnabled }))

	const { isPresenting } = useXR()
</script>

{#if settings.current.renderStats}
	<PerfMonitor anchorX="right" />
{/if}

<KeyboardBindings />
<Environment url={hdrImage} />

<PointerMissBox />

{#if !$isPresenting && settings.current.grid}
	<Grid
		oncreate={(ref) => {
			const material = ref.material as ShaderMaterial
			material.depthWrite = false
		}}
		raycast={() => null}
		bvh={{ enabled: false }}
		plane="xy"
		sectionColor="#333"
		infiniteGrid
		cellSize={settings.current.gridCellSize}
		sectionSize={settings.current.gridSectionSize}
		fadeOrigin={[0, 0, 0]}
		fadeDistance={settings.current.gridFadeDistance}
	/>
{/if}

{#if !$isPresenting}
	<Camera position={[3, 3, 3]}>
		<CameraControls />
	</Camera>
{/if}

<StaticGeometries />
<Selected />

<PortalTarget />

<Entities />
<BatchedArrows />

{@render children?.()}

<T.DirectionalLight position={[3, 3, 3]} />
<T.AmbientLight />
