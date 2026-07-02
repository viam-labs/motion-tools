<script lang="ts">
	import { useTask, useThrelte } from '@threlte/core'
	import { Slider, type SliderChangeEvent } from 'svelte-tweakpane-ui'
	import { Matrix4, OrthographicCamera, PerspectiveCamera, WebGLRenderer } from 'three'

	import { traits, useQuery } from '$lib/ecs'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import Button from '../dashboard/Button.svelte'
	import FloatingPanel from '../FloatingPanel.svelte'

	interface Props {
		frameName: string
	}

	const { frameName }: Props = $props()

	const { scene, renderer: mainRenderer, renderStage, invalidate } = useThrelte()
	const settings = useSettings()
	const partID = usePartID()

	// Three.js cameras look down -Z; Viam camera frames conventionally have the
	// optical axis along +Z with image-down along +Y. A 180° rotation around X
	// flips both axes so a Three.js render matches "what a sensor at this frame
	// would see." If empirical testing shows the view is rolled, swap to
	// makeRotationY for an X-flip instead.
	const VIAM_TO_THREE_CAMERA = new Matrix4().makeRotationX(Math.PI)

	const PERSPECTIVE_FOV_DEG = 60
	// Ortho frustum vertical extent at zoom=1, sized to match what the
	// perspective camera sees at 1 m. zoom > 1 narrows the frustum (zoom in);
	// zoom < 1 widens it (zoom out).
	const BASE_ORTHO_HEIGHT = 2 * Math.tan((PERSPECTIVE_FOV_DEG * Math.PI) / 360)

	const namedEntities = useQuery(traits.Name)
	const entity = $derived(namedEntities.current.find((e) => e.get(traits.Name) === frameName))

	const perspectiveCamera = new PerspectiveCamera(PERSPECTIVE_FOV_DEG, 1, 0.01, 1000)
	perspectiveCamera.up.set(0, 0, 1)

	const orthographicCamera = new OrthographicCamera(-1, 1, 1, -1, 0.01, 1000)
	orthographicCamera.up.set(0, 0, 1)

	let isOpen = $state(true)
	let cameraMode = $state<'perspective' | 'orthographic'>('perspective')
	let orthoZoom = $state(1)
	let canvasEl = $state.raw<HTMLCanvasElement>()
	let povRenderer = $state.raw<WebGLRenderer | undefined>()

	const orthoHeight = $derived(BASE_ORTHO_HEIGHT / orthoZoom)

	const composed = new Matrix4()

	$effect(() => {
		if (!canvasEl) return
		const r = new WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: true })
		// Match the main renderer so colors/tone/transparency are consistent
		// with the main view.
		r.outputColorSpace = mainRenderer.outputColorSpace
		r.toneMapping = mainRenderer.toneMapping
		r.toneMappingExposure = mainRenderer.toneMappingExposure
		r.setPixelRatio(mainRenderer.getPixelRatio())
		r.setSize(canvasEl.clientWidth, canvasEl.clientHeight, false)
		povRenderer = r
		invalidate()
		return () => {
			r.dispose()
			povRenderer = undefined
		}
	})

	$effect(() => {
		if (!canvasEl) return
		const ro = new ResizeObserver(() => {
			const r = povRenderer
			if (!r || !canvasEl) return
			r.setSize(canvasEl.clientWidth, canvasEl.clientHeight, false)
			invalidate()
		})
		ro.observe(canvasEl)
		return () => ro.disconnect()
	})

	$effect(() => {
		void cameraMode
		void orthoZoom
		invalidate()
	})

	$effect(() => {
		if (entity === undefined) {
			isOpen = false
		}
	})

	$effect(() => {
		if (isOpen) return
		const list = settings.current.openFramePovWidgets[partID.current] ?? []
		const next = list.filter((n) => n !== frameName)
		if (next.length === list.length) return
		settings.current.openFramePovWidgets = {
			...settings.current.openFramePovWidgets,
			[partID.current]: next,
		}
	})

	useTask(
		() => {
			const r = povRenderer
			if (!r || !canvasEl || !entity) return
			const worldMat = entity.get(traits.WorldMatrix)
			if (!worldMat) return

			const width = canvasEl.clientWidth
			const height = canvasEl.clientHeight
			if (width <= 0 || height <= 0) return

			const povCamera = cameraMode === 'perspective' ? perspectiveCamera : orthographicCamera

			composed.multiplyMatrices(worldMat, VIAM_TO_THREE_CAMERA)
			composed.decompose(povCamera.position, povCamera.quaternion, povCamera.scale)

			const aspect = width / height
			if (povCamera === perspectiveCamera) {
				perspectiveCamera.aspect = aspect
			} else {
				const halfH = orthoHeight / 2
				const halfW = halfH * aspect
				orthographicCamera.left = -halfW
				orthographicCamera.right = halfW
				orthographicCamera.top = halfH
				orthographicCamera.bottom = -halfH
			}
			povCamera.updateProjectionMatrix()
			povCamera.updateMatrixWorld(true)

			r.render(scene, povCamera)
		},
		{ stage: renderStage, autoInvalidate: false }
	)

	const handleZoomChange = (event: SliderChangeEvent) => {
		if (event.detail.origin !== 'internal') return
		orthoZoom = event.detail.value as number
	}
</script>

<FloatingPanel
	title={`POV: ${frameName}`}
	bind:isOpen
	defaultSize={{ width: 320, height: 240 }}
	resizable
	onPositionChange={invalidate}
	onSizeChange={invalidate}
>
	<canvas
		bind:this={canvasEl}
		class="absolute inset-0 block h-full w-full"
	></canvas>

	<fieldset class="absolute top-1 right-1 z-1 flex">
		<Button
			icon="grid-orthographic"
			active={cameraMode === 'orthographic'}
			description="Orthographic view"
			onclick={() => (cameraMode = 'orthographic')}
		/>
		<Button
			icon="grid-perspective"
			active={cameraMode === 'perspective'}
			description="Perspective view"
			class="-ml-px"
			onclick={() => (cameraMode = 'perspective')}
		/>
	</fieldset>

	{#if cameraMode === 'orthographic'}
		<div class="absolute right-1 bottom-1 left-1 z-1 rounded bg-white/85 p-1">
			<Slider
				label="zoom"
				value={orthoZoom}
				min={0.25}
				max={5}
				step={0.05}
				format={(v) => `${v.toFixed(2)}×`}
				on:change={handleZoomChange}
			/>
		</div>
	{/if}
</FloatingPanel>
