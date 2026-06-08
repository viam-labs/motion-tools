<script
	lang="ts"
	module
>
	import { Matrix4, Object3D, Vector3 } from 'three'

	const objectUtil = new Object3D()
	const transformUtil = { local: new Vector3(), inverse: new Matrix4() }
	const positionUtil = new Vector3()
</script>

<script lang="ts">
	import type { Entity } from 'koota'

	import { T, useThrelte } from '@threlte/core'
	import { TransformControls } from '@threlte/extras'
	import { untrack } from 'svelte'

	import { traits, useTrait } from '$lib/ecs'
	import { useTransformControls } from '$lib/hooks/useControls.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'
	import { GRID_SNAP_STEP } from '$lib/quantize'

	import { readVertexWorld, writeVertexLocal } from './polylineVertex'
	import { useSelectedPolylineVertex } from './useSelectedPolylineVertex.svelte'

	interface Props {
		entity: Entity
	}

	const { entity }: Props = $props()

	const { invalidate } = useThrelte()
	const settings = useSettings()
	const transformControls = useTransformControls()
	const vertex = useSelectedPolylineVertex()
	const linePositions = useTrait(() => entity, traits.LinePositions)
	const worldMatrix = useTrait(() => entity, traits.WorldMatrix)

	const active = $derived(vertex.current?.entity === entity ? vertex.current : undefined)

	const onMouseDown = () => transformControls.setActive(true)
	const onMouseUp = () => transformControls.setActive(false)

	const onChange = () => {
		const sel = active
		if (!sel) return

		const buf = entity.get(traits.LinePositions)
		if (!buf) return

		if (writeVertexLocal(buf, sel.index, worldMatrix.current, objectUtil.position, transformUtil)) {
			entity.changed(traits.LinePositions)
		}
	}

	$effect(() => {
		const sel = active
		if (!sel) return

		untrack(() => {
			const buf = linePositions.current
			if (!buf) return

			const world = readVertexWorld(buf, sel.index, worldMatrix.current, positionUtil)
			if (!world) return

			objectUtil.position.copy(world)
			objectUtil.updateMatrixWorld()
			invalidate()
		})
	})
</script>

<T is={objectUtil} />

{#if active}
	{#key active.index}
		<TransformControls
			object={objectUtil}
			mode="translate"
			translationSnap={settings.current.snapping ? GRID_SNAP_STEP : undefined}
			onmouseDown={onMouseDown}
			onobjectChange={onChange}
			onmouseUp={onMouseUp}
		/>
	{/key}
{/if}
