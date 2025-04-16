<script lang="ts">
	import { useSelectedFrame, useFocusedFrame } from '$lib/hooks/useSelection.svelte'
	import { Check, Copy } from 'lucide-svelte'

	const selectedFrame = useSelectedFrame()
	const focusedFrame = useFocusedFrame()
	const frame = $derived(focusedFrame.current ?? selectedFrame.current)

	let copied = $state(false)
</script>

{#if frame}
	{@const { pose } = frame}
	{@const { center, geometryType } = frame.geometry}
	<div class="border-medium bg-extralight fixed top-0 right-0 z-10 m-2 w-54 border text-xs">
		<div class="flex items-center justify-between gap-2 p-2">
			<div class="flex items-center gap-1">
				<strong class="font-semibold">{frame.name}</strong>
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
					<Copy size={14} />
				{/if}
			</button>
		</div>

		<div class="border-medium w-full border-b"></div>

		<div class="flex flex-col gap-2.5 p-2">
			<div>
				<h3 class="text-subtle-2 pb-1.5">Details</h3>

				<strong class="font-semibold">position</strong>
				<div class="flex gap-3">
					<div>
						<span class="text-subtle-2">x</span>
						{pose.x.toFixed(2)}
					</div>
					<div>
						<span class="text-subtle-2">y</span>
						{pose.y.toFixed(2)}
					</div>
					<div>
						<span class="text-subtle-2">z</span>
						{pose.z.toFixed(2)}
					</div>
				</div>
			</div>

			<div>
				<strong class="font-semibold">orientation</strong>
				<div class="flex gap-3">
					<div>
						<span class="text-subtle-2">x</span>
						{pose.oX.toFixed(2)}
					</div>
					<div>
						<span class="text-subtle-2">y</span>
						{pose.oY.toFixed(2)}
					</div>
					<div>
						<span class="text-subtle-2">z</span>
						{pose.oZ.toFixed(2)}
					</div>
					<div>
						<span class="text-subtle-2">th</span>
						{pose.theta.toFixed(2)}
					</div>
				</div>
			</div>

			<div>
				<strong class="font-semibold">center</strong>
				<div class="flex gap-3">
					<div>
						<span class="text-subtle-2">x</span>
						{center?.x.toFixed(2)}
					</div>
					<div>
						<span class="text-subtle-2">y</span>
						{center?.y.toFixed(2)}
					</div>
					<div>
						<span class="text-subtle-2">z</span>
						{center?.z.toFixed(2)}
					</div>
				</div>
			</div>

			{#if geometryType.case === 'box'}
				<div>
					<strong class="font-semibold">dimensions</strong>
					<div class="flex gap-3">
						<div>
							<span class="text-subtle-2">x</span>
							{geometryType.value.dimsMm?.x.toFixed(2)}
						</div>
						<div>
							<span class="text-subtle-2">y</span>
							{geometryType.value.dimsMm?.y.toFixed(2)}
						</div>
						<div>
							<span class="text-subtle-2">z</span>
							{geometryType.value.dimsMm?.z.toFixed(2)}
						</div>
					</div>
				</div>
			{:else if geometryType.case === 'capsule'}
				<div>
					<strong class="font-semibold">dimensions</strong>
					<div class="flex gap-3">
						<div>
							<span class="text-subtle-2">r</span>
							{geometryType.value.radiusMm.toFixed(2)}
						</div>
						<div>
							<span class="text-subtle-2">l</span>
							{geometryType.value.lengthMm.toFixed(2)}
						</div>
					</div>
				</div>
			{:else if geometryType.case === 'sphere'}
				<div class="flex justify-between">
					radius
					{geometryType.value.radiusMm.toFixed(2)}
				</div>
			{/if}
		</div>
	</div>
{/if}
