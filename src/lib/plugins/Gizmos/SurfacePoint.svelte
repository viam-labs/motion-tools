<script lang="ts">
	import type { Entity } from 'koota'

	import { T } from '@threlte/core'
	import { HTML } from '@threlte/extras'
	import { type Vector3Tuple } from 'three'

	import { traits, useTrait } from '$lib/ecs'

	interface Props {
		entity: Entity
		position: Vector3Tuple
	}

	const { entity, position }: Props = $props()

	const name = useTrait(() => entity, traits.Name)
</script>

<T.Group {position}>
	<HTML
		center
		zIndexRange={[3, 0]}
		class="h-2.5 w-2.5 rounded-full bg-black/70"
	/>

	<HTML
		class="pointer-events-none mb-2 -translate-x-1/2 -translate-y-[calc(100%+10px)] border border-black bg-white px-1 py-0.5 text-xs whitespace-nowrap"
		zIndexRange={[3, 0]}
	>
		{name.current ?? 'surface'}
	</HTML>
</T.Group>
