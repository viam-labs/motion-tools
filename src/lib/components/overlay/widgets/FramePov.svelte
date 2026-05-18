<script lang="ts">
	import { useTask, useThrelte } from '@threlte/core'
	import { Matrix4, PerspectiveCamera, Vector4 } from 'three'

	import { traits, useQuery, useTrait } from '$lib/ecs'
	import { usePartID } from '$lib/hooks/usePartID.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

	import { useOrigin } from '../../xr/useOrigin.svelte'
	import FloatingPanel from '../FloatingPanel.svelte'

	interface Props {
		frameName: string
	}

	const { frameName }: Props = $props()

	const { renderer, scene, renderStage, invalidate } = useThrelte()
	const settings = useSettings()
	const partID = usePartID()
	const origin = useOrigin()

	// Three.js cameras look down -Z; Viam camera frames conventionally have the
	// optical axis along +Z with image-down along +Y. A 180° rotation around X
	// flips both axes so a Three.js render matches "what a sensor at this frame
	// would see." If empirical testing shows the view is rolled, swap to
	// makeRotationY for an X-flip instead.
	const VIAM_TO_THREE_CAMERA = new Matrix4().makeRotationX(Math.PI)

	const namedEntities = useQuery(traits.Name)
	const entity = $derived(namedEntities.current.find((e) => e.get(traits.Name) === frameName))
	const worldMatrix = useTrait(() => entity, traits.WorldMatrix)

	const povCamera = new PerspectiveCamera(60, 1, 0.01, 1000)
	povCamera.up.set(0, 0, 1)

	let isOpen = $state(true)
	let viewportEl = $state.raw<HTMLDivElement>()

	const composed = new Matrix4()
	const originMat = new Matrix4()
	const savedViewport = new Vector4()
	const savedScissor = new Vector4()

	$effect(() => {
		void worldMatrix.current
		invalidate()
	})

	$effect(() => {
		if (!viewportEl) return
		const ro = new ResizeObserver(() => invalidate())
		ro.observe(viewportEl)
		return () => ro.disconnect()
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
			const el = viewportEl
			if (!el || !entity) return
			const worldMat = entity.get(traits.WorldMatrix)
			if (!worldMat) return

			const rect = el.getBoundingClientRect()
			const canvasRect = renderer.domElement.getBoundingClientRect()
			if (rect.width <= 0 || rect.height <= 0) return
			if (
				rect.right <= canvasRect.left ||
				rect.left >= canvasRect.right ||
				rect.bottom <= canvasRect.top ||
				rect.top >= canvasRect.bottom
			) {
				return
			}

			// Compose origin × worldMatrix × VIAM_TO_THREE_CAMERA. The frame
			// entities' WorldMatrix lives in ECS world space; the rendered scene
			// is wrapped in a T.Group that applies `origin` on top, so the POV
			// camera needs the same origin transform to share coordinate space
			// with the meshes it's rendering.
			originMat
				.makeRotationZ(origin.rotation)
				.setPosition(origin.position[0], origin.position[1], origin.position[2])
			composed.copy(originMat).multiply(worldMat).multiply(VIAM_TO_THREE_CAMERA)
			composed.decompose(povCamera.position, povCamera.quaternion, povCamera.scale)

			povCamera.aspect = rect.width / rect.height
			povCamera.updateProjectionMatrix()
			povCamera.updateMatrixWorld(true)

			// Three.js's setViewport / setScissor multiply by the renderer's
			// pixel ratio internally, so pass CSS pixels not buffer pixels.
			const left = rect.left - canvasRect.left
			const bottom = canvasRect.bottom - rect.bottom
			const width = rect.width
			const height = rect.height

			renderer.getViewport(savedViewport)
			renderer.getScissor(savedScissor)
			const savedTest = renderer.getScissorTest()
			const savedAutoClear = renderer.autoClear

			renderer.setViewport(left, bottom, width, height)
			renderer.setScissor(left, bottom, width, height)
			renderer.setScissorTest(true)
			renderer.autoClear = false
			renderer.clear(true, true, true)
			renderer.render(scene, povCamera)

			renderer.setViewport(savedViewport)
			renderer.setScissor(savedScissor)
			renderer.setScissorTest(savedTest)
			renderer.autoClear = savedAutoClear
		},
		{ stage: renderStage, autoInvalidate: false }
	)
</script>

<FloatingPanel
	title={`POV: ${frameName}`}
	bind:isOpen
	defaultSize={{ width: 320, height: 240 }}
	resizable
	bodyClass="bg-transparent"
	onPositionChange={() => invalidate()}
	onSizeChange={() => invalidate()}
>
	<div
		bind:this={viewportEl}
		class="absolute inset-0"
	></div>
</FloatingPanel>
