<script lang="ts">
	import { useSelectedFrame, useFocusedFrame, useFocus } from '$lib/hooks/useSelection.svelte'
	import { Check, Copy } from 'lucide-svelte'
	import { Button } from '@viamrobotics/prime-core'

	const selectedFrame = useSelectedFrame()
	const focusedFrame = useFocusedFrame()
	const focus = useFocus()
	const frame = $derived(focusedFrame.current ?? selectedFrame.current)

	let copied = $state(false)
</script>

{#if frame}
	{@const { pose } = frame}
	{@const { center, geometryType } = frame.geometry}
	<div class="border-medium bg-extralight fixed top-0 right-0 z-10 m-2 w-54 border p-2 text-xs">
		<div class="flex items-center justify-between gap-2 pb-2">
			<div class="flex items-center gap-1">
				<strong class="font-semibold">{frame.name}</strong>
			</div>
		</div>

		<div class="border-medium -mx-2 w-[100%+0.5rem] border-b"></div>

		<h3 class="text-subtle-2 flex justify-between py-2">
			Details

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
		</h3>

		<div class="flex flex-col gap-2.5">
			<div>
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
					<div>
						<strong class="font-semibold">dimensions</strong>
						<div class="flex gap-3">
							<div>
								<span class="text-subtle-2">r</span>
								{geometryType.value.radiusMm.toFixed(2)}
							</div>
						</div>
					</div>
				</div>
			{/if}
		</div>

		<h3 class="text-subtle-2 pt-3 pb-2">Actions</h3>

		{#if focus.current}
			<Button
				class="w-full"
				icon="arrow-left"
				variant="dark"
				onclick={() => focus.set(undefined)}
			>
				Exit object view
			</Button>
		{:else}
			<Button
				class="w-full"
				icon="image-filter-center-focus"
				onclick={() => focus.set(frame.name)}
			>
				Enter object view
			</Button>
		{/if}
	</div>
{/if}
