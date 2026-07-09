<script lang="ts">
	import { T, useThrelte } from '@threlte/core'
	import { Gizmo, TrackballControls } from '@threlte/extras'
	import { untrack } from 'svelte'
	import { Box3, Vector3 } from 'three'

	import Camera from '$lib/components/Camera.svelte'
	import { expandBoxByEntity } from '$lib/components/Entities/expandBoxByEntity'
	import { traits, useQuery } from '$lib/ecs'
	import { useCameraControls } from '$lib/hooks/useControls.svelte'

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
			expandBoxByEntity(box, entity, scene)
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
