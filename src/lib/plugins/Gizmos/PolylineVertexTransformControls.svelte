<script lang="ts">
	import type { Entity } from 'koota'

	import { T, useThrelte } from '@threlte/core'
	import { TransformControls } from '@threlte/extras'
	import { untrack } from 'svelte'
	import { Matrix4, Object3D, Vector3 } from 'three'

	import { traits, useTrait } from '$lib/ecs'
	import { useTransformControls } from '$lib/hooks/useControls.svelte'
	import { useSettings } from '$lib/hooks/useSettings.svelte'

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

	const proxy = new Object3D()
	const inverseWorld = new Matrix4()
	const tempLocal = new Vector3()

	const active = $derived(vertex.current?.entity === entity ? vertex.current : undefined)

	// Reset the proxy to the vertex's world position when a different vertex is
	// picked. We deliberately do not re-track `linePositions` here — during a drag
	// we write into the buffer on every frame, and re-running this effect would
	// fight TransformControls for the proxy's position.
	$effect(() => {
		const sel = active
		if (!sel) return

		untrack(() => {
			const buf = linePositions.current
			if (!buf || sel.index * 3 + 2 >= buf.length) return

			tempLocal.set(buf[sel.index * 3]!, buf[sel.index * 3 + 1]!, buf[sel.index * 3 + 2]!)
			if (worldMatrix.current) tempLocal.applyMatrix4(worldMatrix.current)
			proxy.position.copy(tempLocal)
			proxy.updateMatrixWorld()
			invalidate()
		})
	})

	const onMouseDown = () => transformControls.setActive(true)
	const onMouseUp = () => transformControls.setActive(false)

	const onChange = () => {
		const sel = active
		if (!sel) return
		const buf = entity.get(traits.LinePositions)
		if (!buf || sel.index * 3 + 2 >= buf.length) return

		// proxy lives in a parent context whose world is effectively identity
		// (the gizmo subtree), so proxy.position == world position.
		tempLocal.copy(proxy.position)
		if (worldMatrix.current) {
			inverseWorld.copy(worldMatrix.current).invert()
			tempLocal.applyMatrix4(inverseWorld)
		}

		buf[sel.index * 3] = tempLocal.x
		buf[sel.index * 3 + 1] = tempLocal.y
		buf[sel.index * 3 + 2] = tempLocal.z
		entity.changed(traits.LinePositions)
	}
</script>

<T is={proxy} />

{#if active}
	{#key active.index}
		<TransformControls
			object={proxy}
			mode="translate"
			translationSnap={settings.current.snapping ? 0.1 : undefined}
			onmouseDown={onMouseDown}
			onobjectChange={onChange}
			onmouseUp={onMouseUp}
		/>
	{/key}
{/if}
