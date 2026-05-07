<script lang="ts">
	import type { HoverInfo } from '$lib/HoverUpdater.svelte'

	import { MathUtils, Matrix4, Quaternion, Vector3 } from 'three'

	import { traits, useTrait } from '$lib/ecs'
	import { useFocusedEntity, useSelectedEntity } from '$lib/hooks/useSelection.svelte'
	import { OrientationVector } from '$lib/three/OrientationVector'
	import { readTraitToMatrix } from '$lib/transform'

	import HoveredEntityTooltip from './HoveredEntityTooltip.svelte'

	const selectedEntity = useSelectedEntity()
	const focusedEntity = useFocusedEntity()

	const displayEntity = $derived(selectedEntity.current ?? focusedEntity.current)
	const instancedMatrix = useTrait(() => displayEntity, traits.InstancedMatrix)

	// Pool: InstancedMatrix is in metres (matches Three.js); decompose for the
	// tooltip's display, which expects metres for position and OV+theta for
	// orientation.
	const tempMatrix = new Matrix4()
	const translation = new Vector3()
	const quaternion = new Quaternion()
	const scaleVec = new Vector3()
	const ov = new OrientationVector()

	const hoverInfo = $derived.by((): HoverInfo | undefined => {
		if (!instancedMatrix.current) return undefined
		readTraitToMatrix(instancedMatrix.current, tempMatrix)
		tempMatrix.decompose(translation, quaternion, scaleVec)
		ov.setFromQuaternion(quaternion)
		return {
			index: instancedMatrix.current.index,
			x: translation.x,
			y: translation.y,
			z: translation.z,
			oX: ov.x,
			oY: ov.y,
			oZ: ov.z,
			theta: MathUtils.radToDeg(ov.th),
		}
	})
</script>

{#if hoverInfo}
	<HoveredEntityTooltip {hoverInfo} />
{/if}
