<script lang="ts">
	import { T } from '@threlte/core'
	import { Edges, TransformControls } from '@threlte/extras'
	import { useSelection } from '$lib/hooks/useSelection.svelte'
	import { useStaticGeometries } from '$lib/hooks/useStaticGeometries.svelte'
	import { useTransformControls } from '$lib/hooks/useControls.svelte'
	import { Keybindings } from '$lib/keybindings'
	import { PersistedState } from 'runed'
	import { quaternionToPose, scaleToDimensions, vector3ToPose } from '$lib/transform'
	import { Quaternion, Vector3 } from 'three'
	import Clickable from './Clickable.svelte'
	import { darkenColor } from '$lib/color'

	type Modes = 'translate' | 'rotate' | 'scale'

	const transformControls = useTransformControls()
	const geometries = useStaticGeometries()
	const selection = useSelection()

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

{#each geometries.current as mesh (mesh.uuid)}
	<Clickable
		name={mesh.name}
		object={mesh}
	>
		{#snippet children({ ref })}
			{#if selection.current === mesh.name}
				<TransformControls
					object={ref}
					mode={mode.current}
					onmouseDown={() => transformControls.setActive(true)}
					onmouseUp={(event) => {
						transformControls.setActive(false)

						const { object } = event.target
						if (mode.current === 'translate') {
							vector3ToPose(object.getWorldPosition(vector3), mesh.userData.pose)
						} else if (mode.current === 'rotate') {
							quaternionToPose(ref.getWorldQuaternion(quaternion), mesh.userData.pose)
							ref.quaternion.copy(quaternion)
						} else if (mode.current === 'scale') {
							scaleToDimensions(ref.scale, mesh.userData.geometry)
						}
					}}
				/>
			{/if}

			<Edges
				raycast={() => null}
				color={darkenColor('hotpink', 10)}
				renderOrder={-1}
			/>

			<T.MeshToonMaterial
				color="hotpink"
				transparent
				opacity={0.7}
			/>
		{/snippet}
	</Clickable>
{/each}
