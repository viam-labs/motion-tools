<script lang="ts">
	import { T, useThrelte } from '@threlte/core'
	import { Gizmo, TrackballControls } from '@threlte/extras'
	import { untrack } from 'svelte'
	import { Box3, Matrix4, Vector3 } from 'three'

	import Camera from '$lib/components/Camera.svelte'
	import { composeBoxMatrix } from '$lib/components/Entities/composeBoxMatrix'
	import { traits, useQuery } from '$lib/ecs'
	import { useCameraControls } from '$lib/hooks/useControls.svelte'
	import { expandBoxByTransformedBox } from '$lib/three/OBBHelper'

	const { scene } = useThrelte()
	const cameraControls = useCameraControls()
	const selected = useQuery(traits.Selected)

	/**
	 * Save the main camera controls and their state the instant focus begins —
	 * this runs before the TrackballControls below swaps the shared context, so
	 * `current` is still the main controls. On teardown we hand `current` back to
	 * them (the trackball never restores it) and reset them to the saved view, so
	 * exiting focus returns the camera to where it was. camera-controls exposes
	 * saveState()/reset(); TrackballControls does not, which also narrows the type.
	 */
	$effect.pre(() => {
		const previousControls = untrack(() => cameraControls.current)
		const restorableControls =
			previousControls && 'saveState' in previousControls ? previousControls : undefined
		restorableControls?.saveState()

		return () => {
			if (!restorableControls) return
			cameraControls.set(restorableControls)
			restorableControls.reset(false)
		}
	})

	const box = new Box3()
	const vec = new Vector3()
	const unitBox = new Box3(new Vector3(-0.5, -0.5, -0.5), new Vector3(0.5, 0.5, 0.5))
	const boxMatrix = new Matrix4()

	let center = $state.raw<[number, number, number]>([0, 0, 0])
	let size = $state.raw<[number, number, number]>([0, 0, 0])

	/**
	 * Frame the camera on the selection captured when focus was entered. Reading
	 * the selection untracked leaves this effect with no reactive dependencies,
	 * so it runs once on mount and the framing stays put — changing the selection
	 * while focused must not re-frame or reset the camera.
	 */
	$effect(() => {
		box.makeEmpty()
		for (const entity of untrack(() => selected.current)) {
			// Boxes render instanced, so the entity's named scene object
			// carries no geometry — frame them from traits instead.
			if (composeBoxMatrix(entity, boxMatrix)) {
				expandBoxByTransformedBox(box, unitBox, boxMatrix)
				continue
			}

			const object3d = scene.getObjectByName(entity as unknown as string)
			if (object3d) {
				box.expandByObject(object3d)
			}
		}

		size = box.getSize(vec).toArray()
		center = box.getCenter(vec).toArray()
	})
</script>

<Camera position={[size[0] + 1, size[0] + 1, size[0] + 1]}>
	<TrackballControls
		target={center}
		oncreate={(ref) => cameraControls.set(ref)}
	>
		<Gizmo placement="bottom-right" />
	</TrackballControls>
</Camera>

<T.Box3Helper
	args={[box, 'red']}
	bvh={{ enabled: false }}
	raycast={() => null}
/>
