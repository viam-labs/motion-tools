<script lang="ts">
	import { Portal } from '@threlte/extras'
	import { Shapes } from 'lucide-svelte'

	import AxesHelperDetails from '$lib/components/overlay/details/AxesHelperDetails.svelte'
	import ColorDetails from '$lib/components/overlay/details/ColorDetails.svelte'
	import GeometryDetails from '$lib/components/overlay/details/GeometryDetails.svelte'
	import LineDetails from '$lib/components/overlay/details/LineDetails/LineDetails.svelte'
	import MatrixDetails from '$lib/components/overlay/details/MatrixDetails.svelte'
	import OpacityDetails from '$lib/components/overlay/details/OpacityDetails.svelte'
	import { hierarchy, traits, useQuery, useTrait } from '$lib/ecs'
	import { useFocusedEntity, useSelectedEntity } from '$lib/hooks/useSelection.svelte'

	import { Gizmo, GizmoArrow } from './traits'

	const selectedEntity = useSelectedEntity()
	const focusedEntity = useFocusedEntity()

	const entity = $derived(focusedEntity.current ?? selectedEntity.current)
	const gizmo = useTrait(() => entity, Gizmo)
	const isGizmo = $derived(Boolean(gizmo.current))

	const referenceFrame = useTrait(() => entity, traits.ReferenceFrame)
	const box = useTrait(() => entity, traits.Box)
	const sphere = useTrait(() => entity, traits.Sphere)
	const capsule = useTrait(() => entity, traits.Capsule)
	const gizmoArrow = useTrait(() => entity, GizmoArrow)

	const isCoordinateSystem = $derived(Boolean(referenceFrame.current))
	const isReferenceGeometry = $derived(Boolean(box.current || sphere.current || capsule.current))
	const isArrow = $derived(Boolean(gizmoArrow.current))

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
				onPoseChange={(patch) => traits.writeMatrix(entity, patch)}
				onParentChange={(next) => hierarchy.setParent(entity, next)}
			/>
			<GeometryDetails {entity} />
			<LineDetails {entity} />
			<ColorDetails {entity} />
			{#if !isCoordinateSystem}
				<OpacityDetails {entity} />
			{/if}
			{#if isReferenceGeometry || isArrow}
				<AxesHelperDetails {entity} />
			{/if}
		</div>
	</Portal>
{/if}
