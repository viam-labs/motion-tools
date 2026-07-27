<!--
@component

Renders a Viam Geometry object
-->
<script lang="ts">
	import type { Entity } from 'koota'

	import { T, useThrelte } from '@threlte/core'
	import { Group } from 'three'

	import { traits, useTrait } from '$lib/ecs'
	import { matchModel, use3DModels } from '$lib/hooks/use3DModels.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'
	import { Pose } from '$lib/math'

	import { useEntityEvents } from './hooks/useEntityEvents.svelte'

	interface Props {
		entity: Entity
	}

	const { entity }: Props = $props()

	const settings = useSettings()

	const { invalidate } = useThrelte()
	const models = use3DModels()

	const name = useTrait(() => entity, traits.Name)
	const worldMatrix = useTrait(() => entity, traits.WorldMatrix)
	const center = useTrait(() => entity, traits.Center)
	const invisible = useTrait(() => entity, traits.InheritedInvisible)

	const model = $derived.by(() => {
		if (!settings.current.renderArmModels.includes('model')) {
			return
		}

		return matchModel(name.current, models.current)?.clone() ?? undefined
	})

	const group = new Group()
	group.matrixAutoUpdate = false

	$effect(() => {
		if (!worldMatrix.current) return
		group.matrix.copy(worldMatrix.current)
		group.updateMatrixWorld()
		invalidate()
	})

	const pose = new Pose()

	$effect(() => {
		if (model && center.current) {
			pose.copy(center.current).toObject3D(model)
			invalidate()
		}
	})

	const events = useEntityEvents(() => entity)
</script>

{#if model}
	<T
		is={group}
		visible={invisible.current !== true}
	>
		<T
			is={model}
			name={entity}
			{...events}
		/>
	</T>
{/if}
