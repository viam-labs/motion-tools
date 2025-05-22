<script lang="ts">
	import { TransformControls } from '@threlte/extras'
	import { useSelected } from '$lib/hooks/useSelection.svelte'
	import { useStaticGeometries } from '$lib/hooks/useStaticGeometries.svelte'
	import { useTransformControls } from '$lib/hooks/useControls.svelte'
	import { Keybindings } from '$lib/keybindings'
	import { PersistedState } from 'runed'
	import { quaternionToPose, scaleToDimensions, vector3ToPose } from '$lib/transform'
	import { Quaternion, Vector3 } from 'three'
	import Frame from './Frame.svelte'

	type Modes = 'translate' | 'rotate' | 'scale'

	const transformControls = useTransformControls()
	const geometries = useStaticGeometries()
	const selected = useSelected()

	let mode = new PersistedState<Modes>('transform-mode', 'translate')

	const quaternion = new Quaternion()
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
			geometries.remove(selected.current ?? '')
		} else if (key === Keybindings.TRANSLATE) {
			mode.current = 'translate'
		} else if (key === Keybindings.ROTATE) {
			mode.current = 'rotate'
		} else if (key === Keybindings.SCALE) {
			mode.current = 'scale'
		}
	}}
/>

{#each geometries.current as object (object.uuid)}
	<Frame
		uuid={object.uuid}
		name={object.name}
		pose={object.pose}
		geometry={object.geometry}
		metadata={object.metadata}
	>
		{#snippet children({ ref })}
			{#if selected.current === ref.uuid}
				{#key mode.current}
					<TransformControls
						object={ref}
						mode={mode.current}
						onmouseDown={() => transformControls.setActive(true)}
						onmouseUp={() => {
							transformControls.setActive(false)

							if (mode.current === 'translate') {
								vector3ToPose(ref.getWorldPosition(vector3), object.pose)
							} else if (mode.current === 'rotate') {
								quaternionToPose(ref.getWorldQuaternion(quaternion), object.pose)
								ref.quaternion.copy(quaternion)
							} else if (mode.current === 'scale' && object.geometry?.case === 'box') {
								scaleToDimensions(ref.scale, object.geometry)
								ref.scale.setScalar(1)
							}
						}}
					/>
				{/key}
			{/if}
		{/snippet}
	</Frame>
{/each}
