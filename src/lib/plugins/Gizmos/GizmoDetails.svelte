<script lang="ts">
	import { Portal } from '@threlte/extras'
	import { Shapes } from 'lucide-svelte'

	import AxesHelperDetails from '$lib/components/overlay/details/AxesHelperDetails.svelte'
	import ColorDetails from '$lib/components/overlay/details/ColorDetails.svelte'
	import GeometryDetails from '$lib/components/overlay/details/GeometryDetails.svelte'
	import LineDetails from '$lib/components/overlay/details/LineDetails/LineDetails.svelte'
	import OpacityDetails from '$lib/components/overlay/details/OpacityDetails.svelte'
	import PoseDetails from '$lib/components/overlay/details/PoseDetails.svelte'
	import { hierarchy, traits, useQuery, useTag, useTrait } from '$lib/ecs'

	import PlaneDetails from './PlaneDetails.svelte'
	import { Gizmo, GizmoArrow, Plane } from './traits'

	const selected = useQuery(traits.Selected)
	const entity = $derived(selected.current[0])
	const gizmo = useTrait(() => entity, Gizmo)
	const isGizmo = $derived(Boolean(gizmo.current))

	const plane = useTrait(() => entity, Plane)
	const box = useTrait(() => entity, traits.Box)
	const sphere = useTrait(() => entity, traits.Sphere)
	const capsule = useTrait(() => entity, traits.Capsule)
	const linePositions = useTrait(() => entity, traits.LinePositions)
	const gizmoArrow = useTag(() => entity, GizmoArrow)

	const isReferencePlane = $derived(Boolean(plane.current))
	const isReferenceGeometry = $derived(Boolean(box.current || sphere.current || capsule.current))
	const isLine = $derived(Boolean(linePositions.current))
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
			<PoseDetails
				{entity}
				{parentOptions}
				onPoseChange={(patch) => traits.writeMatrix(entity, patch)}
				onParentChange={(next) => hierarchy.setParent(entity, next)}
			/>
			{#if isReferencePlane}
				<PlaneDetails {entity} />
				<ColorDetails {entity} />
				<OpacityDetails {entity} />
			{/if}
			{#if isReferenceGeometry}
				<GeometryDetails {entity} />
				<ColorDetails {entity} />
				<OpacityDetails {entity} />
				<AxesHelperDetails {entity} />
			{/if}
			{#if isLine}
				<LineDetails {entity} />
				<OpacityDetails {entity} />
			{/if}
			{#if isArrow}
				<ColorDetails {entity} />
				<OpacityDetails {entity} />
				<AxesHelperDetails {entity} />
			{/if}
		</div>
	</Portal>
{/if}
