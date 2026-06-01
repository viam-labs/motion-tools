<script
	lang="ts"
	module
>
	import type { Entity } from 'koota'

	import { HTML } from '@threlte/extras'
	import { Quaternion, Vector3, type Vector3Tuple } from 'three'

	import { traits, useTrait } from '$lib/ecs'

	const vec3 = new Vector3()
	const quat = new Quaternion()
	const scale = new Vector3()
</script>

<script lang="ts">
	interface Props {
		entity: Entity
	}

	let { entity }: Props = $props()

	const name = useTrait(() => entity, traits.Name)
	const matrix = useTrait(() => entity, traits.WorldMatrix)

	$effect(() => {
		matrix.current?.decompose(vec3, quat, scale)
		vec3.toArray(position)
	})

	let position = $state<Vector3Tuple>([0, 0, 0])
</script>

<HTML
	center
	zIndexRange={[3, 0]}
	class="border-gray-7 border bg-white px-2 py-1 text-xs"
	{position}
>
	{name.current}
</HTML>
