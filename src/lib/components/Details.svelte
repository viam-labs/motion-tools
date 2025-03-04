<script lang="ts">
	import { useSelectedFrame, useFocusedFrame } from '$lib/hooks/useSelection.svelte'
	import { Cuboid, ClipboardList, Check, Circle } from 'lucide-svelte'

	const selectedFrame = useSelectedFrame()
	const focusedFrame = useFocusedFrame()
	const frame = $derived(focusedFrame.current ?? selectedFrame.current)

	let copied = $state(false)
</script>

{#if frame}
	{@const { pose } = frame}
	{@const { center, geometryType } = frame.physicalObject}
	<div class="fixed top-0 right-0 z-10 m-2 w-54 rounded-md bg-gray-100 p-2 text-xs">
		<div class="flex items-center justify-between gap-2 py-1">
			<div class="flex items-center gap-1">
				<strong class="font-semibold">{frame.name}</strong>
				{#if geometryType.case === 'box'}
					<Cuboid size={14} />
				{:else}
					<Circle size={14} />
				{/if}
			</div>

			<button
				onclick={async () => {
					navigator.clipboard.writeText(JSON.stringify($state.snapshot(frame)))
					copied = true
					setTimeout(() => (copied = false), 1000)
				}}
			>
				{#if copied}
					<Check size={14} />
				{:else}
					<ClipboardList size={14} />
				{/if}
			</button>
		</div>

		<div class="w-full border-b border-gray-400"></div>

		<div class="flex justify-between">
			<strong class="font-semibold">position</strong>
			<div>
				{pose.x.toFixed(2)}
				{pose.y.toFixed(2)}
				{pose.z.toFixed(2)}
			</div>
		</div>

		<div class="flex justify-between">
			<strong class="font-semibold">orientation</strong>
			<div>
				{pose.oX.toFixed(2)}
				{pose.oY.toFixed(2)}
				{pose.oZ.toFixed(2)}
				{pose.theta.toFixed(2)}
			</div>
		</div>

		<div class="flex justify-between">
			<strong class="font-semibold">center</strong>
			<div>
				{center?.x.toFixed(2)}
				{center?.y.toFixed(2)}
				{center?.z.toFixed(2)}
			</div>
		</div>

		{#if geometryType.case === 'box'}
			<div class="flex justify-between">
				<strong class="font-semibold">dimensions</strong>
				<div>
					{geometryType.value.dimsMm?.x.toFixed(2)}
					{geometryType.value.dimsMm?.y.toFixed(2)}
					{geometryType.value.dimsMm?.z.toFixed(2)}
				</div>
			</div>
		{:else if geometryType.case === 'capsule'}
			<div class="flex justify-between">
				<strong class="font-semibold">radius / length</strong>
				<div>
					{geometryType.value.radiusMm.toFixed(2)}
					{geometryType.value.lengthMm?.toFixed(2)}
				</div>
			</div>
		{:else if geometryType.case === 'sphere'}
			<div class="flex justify-between">
				radius
				{geometryType.value.radiusMm.toFixed(2)}
			</div>
		{/if}
	</div>
{/if}
