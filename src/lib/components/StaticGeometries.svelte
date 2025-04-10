<script lang="ts">
	import { TransformControls } from '@threlte/extras'
	import { useSelection } from '$lib/hooks/useSelection.svelte'
	import { useStaticGeometries } from '$lib/hooks/useStaticGeometries.svelte'
	import { useControls } from '$lib/hooks/useControls.svelte'
	import { Keybindings } from '$lib/keybindings'
	import Frame from './Frame.svelte'
	import { PersistedState } from 'runed'
	import { quaternionToPose, scaleToDimensions, vector3ToPose } from '$lib/transform'
	import { Quaternion, Vector3 } from 'three'

	type Modes = 'translate' | 'rotate' | 'scale'

	const controls = useControls()
	const geometries = useStaticGeometries()
	const selection = useSelection()

	let mode = new PersistedState<Modes>('transform-mode', 'translate')

	const quaternion = new Quaternion()
	const nullRotation = new Quaternion()
	const vector3 = new Vector3()
</script>

<svelte:window
	onkeydown={(event) => {
		if (event.metaKey || event.ctrlKey) {
			return
		}

		const key = event.key.toLowerCase()

		if (key === Keybindings.ADD_GEOMETRY) {
			geometries.add()
		} else if (key === Keybindings.REMOVE_GEOMETRY) {
			geometries.remove(selection.current ?? '')
		} else if (key === Keybindings.TRANSLATE) {
			mode.current = 'translate'
		} else if (key === Keybindings.ROTATE) {
			mode.current = 'rotate'
		} else if (key === Keybindings.SCALE) {
			mode.current = 'scale'
		}
	}}
/>

{#each geometries.current as frame (frame.name)}
	<Frame
		name={frame.name}
		pose={frame.pose}
		geometry={frame.geometry}
		color="hotpink"
	>
		{#snippet children({ ref })}
			{#if selection.current === frame.name}
				<TransformControls
					object={ref}
					mode={mode.current}
					onmouseDown={() => controls.setTransformControlsActive(true)}
					onmouseUp={(event) => {
						controls.setTransformControlsActive(false)

						const { object } = event.target
						if (mode.current === 'translate') {
							vector3ToPose(object.getWorldPosition(vector3), frame.pose)
						} else if (mode.current === 'rotate') {
							quaternionToPose(ref.getWorldQuaternion(quaternion), frame.pose)
							ref.quaternion.copy(quaternion)
							// object.quaternion.copy(nullRotation)
						} else if (mode.current === 'scale') {
							scaleToDimensions(ref.scale, frame.geometry)
							ref.scale.setScalar(1)
						}
					}}
				/>
			{/if}
		{/snippet}
	</Frame>
{/each}
