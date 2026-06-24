<script lang="ts">
	import type { Entity } from 'koota'
	import type { Line2 } from 'three/addons'

	import { useThrelte } from '@threlte/core'

	import { traits, useTrait } from '$lib/ecs'

	import AxesHelper from '../AxesHelper.svelte'

	interface Props {
		entity: Entity
	}

	let { entity }: Props = $props()

	const { invalidate } = useThrelte()

	let ref = $state.raw<Line2>()

	const worldMatrix = useTrait(() => entity, traits.WorldMatrix)

	$effect(() => {
		if (worldMatrix.current) {
			ref?.matrix.copy(worldMatrix.current)
			ref?.updateMatrixWorld()
			invalidate()
		}
	})
</script>

<AxesHelper
	bind:ref
	name={entity}
	width={3}
	length={0.1}
	matrixAutoUpdate={false}
/>
