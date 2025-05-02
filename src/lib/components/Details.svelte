<script lang="ts">
	import {
		useSelectedFrame,
		useFocusedFrame,
		useFocus,
		useSelectionObject,
		useFocusedObject,
	} from '$lib/hooks/useSelection.svelte'
	import { Check, Copy } from 'lucide-svelte'
	import { Button, Icon } from '@viamrobotics/prime-core'
	import { createPose, object3dToPose } from '$lib/transform'
	import { Geometry } from '@viamrobotics/sdk'

	const nullPose = createPose()

	const selectionObject = useSelectionObject()
	const focusedObject = useFocusedObject()
	const object = $derived(selectionObject.current ?? focusedObject.current)

	const pose = $derived(object ? object3dToPose(object, nullPose) : undefined)
	const geometry = $derived<Geometry | undefined>(object?.userData.geometry)

	const selectedFrame = useSelectedFrame()
	const focusedFrame = useFocusedFrame()
	const focus = useFocus()
	const frame = $derived(focusedFrame.current ?? selectedFrame.current)

	let copied = $state(false)
</script>

{#if object}
	{@const { center, geometryType } = geometry ?? {}}
	<div class="border-medium bg-extralight fixed top-0 right-0 z-10 m-2 w-54 border p-2 text-xs">
		<div class="flex items-center justify-between gap-2 pb-2">
			<div class="flex items-center gap-1">
				<button>
					<Icon name="drag" />
				</button>
				<strong class="font-semibold">{object.name}</strong>
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
			{#if pose}
				<div>
					<strong class="font-semibold">position</strong>
					<div class="flex gap-3">
						<div>
							<span class="text-subtle-2">x</span>
							{pose.x !== undefined ? pose.x.toFixed(2) : '-'}
						</div>
						<div>
							<span class="text-subtle-2">y</span>
							{pose.y !== undefined ? pose.y.toFixed(2) : '-'}
						</div>
						<div>
							<span class="text-subtle-2">z</span>
							{pose.z !== undefined ? pose.z.toFixed(2) : '-'}
						</div>
					</div>
				</div>

				<div>
					<strong class="font-semibold">orientation</strong>
					<div class="flex gap-3">
						<div>
							<span class="text-subtle-2">x</span>
							{pose.oX !== undefined ? pose.oX.toFixed(2) : '-'}
						</div>
						<div>
							<span class="text-subtle-2">y</span>
							{pose.oY !== undefined ? pose.oY.toFixed(2) : '-'}
						</div>
						<div>
							<span class="text-subtle-2">z</span>
							{pose.oZ !== undefined ? pose.oZ.toFixed(2) : '-'}
						</div>
						<div>
							<span class="text-subtle-2">th</span>
							{pose.theta !== undefined ? pose.theta.toFixed(2) : '-'}
						</div>
					</div>
				</div>
			{/if}

			{#if center}
				<div>
					<strong class="font-semibold">center</strong>
					<div class="flex gap-3">
						<div>
							<span class="text-subtle-2">x</span>
							{center.x !== undefined ? center.x.toFixed(2) : '-'}
						</div>
						<div>
							<span class="text-subtle-2">y</span>
							{center.y !== undefined ? center.y.toFixed(2) : '-'}
						</div>
						<div>
							<span class="text-subtle-2">z</span>
							{center.z !== undefined ? center.z.toFixed(2) : '-'}
						</div>
					</div>
				</div>
			{/if}

			{#if geometryType}
				{#if geometryType.case === 'box'}
					{@const { dimsMm } = geometryType.value}
					<div>
						<strong class="font-semibold">dimensions</strong>
						<div class="flex gap-3">
							<div>
								<span class="text-subtle-2">x</span>
								{dimsMm?.x ? dimsMm.x.toFixed(2) : '-'}
							</div>
							<div>
								<span class="text-subtle-2">y</span>
								{dimsMm?.y ? dimsMm.y.toFixed(2) : '-'}
							</div>
							<div>
								<span class="text-subtle-2">z</span>
								{dimsMm?.z ? dimsMm.z.toFixed(2) : '-'}
							</div>
						</div>
					</div>
				{:else if geometryType.case === 'capsule'}
					{@const { value } = geometryType}
					<div>
						<strong class="font-semibold">dimensions</strong>
						<div class="flex gap-3">
							<div>
								<span class="text-subtle-2">r</span>
								{value.radiusMm ? value.radiusMm.toFixed(2) : '-'}
							</div>
							<div>
								<span class="text-subtle-2">l</span>
								{value.lengthMm ? value.lengthMm.toFixed(2) : '-'}
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
				onclick={() => focus.set(name)}
			>
				Enter object view
			</Button>
		{/if}
	</div>
{/if}
