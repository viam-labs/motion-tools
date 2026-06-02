<script lang="ts">
	import { Portal } from '@threlte/extras'
	import { Shapes } from 'lucide-svelte'

	import ColorDetails from '$lib/components/overlay/details/ColorDetails.svelte'
	import GeometryDetails from '$lib/components/overlay/details/GeometryDetails.svelte'
	import LineDetails from '$lib/components/overlay/details/LineDetails/LineDetails.svelte'
	import MatrixDetails from '$lib/components/overlay/details/MatrixDetails.svelte'
	import { traits, useQuery, useTrait } from '$lib/ecs'
	import { useFocusedEntity, useSelectedEntity } from '$lib/hooks/useSelection.svelte'

	import { Gizmo } from './traits'

	const selectedEntity = useSelectedEntity()
	const focusedEntity = useFocusedEntity()

	const entity = $derived(focusedEntity.current ?? selectedEntity.current)
	const gizmo = useTrait(() => entity, Gizmo)
	const isGizmo = $derived(Boolean(gizmo.current))

	const entities = useQuery(traits.Name)

	const gizmoName = $derived.by(() => {
		if (!entity) return
		return entity.get(traits.Name)
	})

	const parentOptions = $derived.by(() => {
		const opts = [{ value: 'world', text: 'world' }]
		for (const candidate of entities.current) {
			const name = candidate.get(traits.Name)
			if (!name || name === 'world' || name === gizmoName) continue
			opts.push({ value: name, text: name })
		}

		return opts
	})
</script>

{#if isGizmo}
	<Portal id="details-header-icon">
		<span
			class="text-info-dark px-1"
			aria-label="gizmo"
		>
			<Shapes size="16" />
		</span>
	</Portal>
{/if}

{#if isGizmo && entity}
	<Portal id="details-extensions">
		<div class="flex flex-col gap-2.5 text-xs">
			<MatrixDetails
				{entity}
				{parentOptions}
			/>
			<GeometryDetails {entity} />
			<LineDetails {entity} />
			<ColorDetails {entity} />
		</div>
	</Portal>
{/if}
