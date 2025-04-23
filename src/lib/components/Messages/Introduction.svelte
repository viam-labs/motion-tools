<script lang="ts">
	import Planets from './Planets.svelte'
	import { useObjects } from '$lib/hooks/useObjects.svelte'

	const object = useObjects()

	const showMessage = $derived(object.current.length === 0)
</script>

{#if showMessage}
	<div class="pointer-events-none fixed top-0 left-0 grid h-full w-full place-content-center">
		<div class="border-light pointer-events-auto z-20 w-[400px] border bg-white p-6">
			<Planets />

			<h3 class="py-4 text-lg font-semibold">No spatial data to visualize</h3>

			<div class="text-subtle-1 flex flex-col gap-6 text-xs">
				<p>
					This is where you can view, test, and debug all spatial data related to your machine in
					one unified view.
				</p>

				<p>
					Your machine doesn't have any components with spatial data or world objects available to
					display yet.
				</p>

				<p>To get started:</p>

				<ul>
					<li>
						<p>Add components with spatial data (arms, cameras, motion sensors)</p>
					</li>

					<li>
						<p>
							Configure visualization services found in the registry or a custom WorldObjectStore
							service to add custom visualizations
						</p>
					</li>
				</ul>

				Once added, you'll be able to see all your machine's frame data, sensor data, and custom
				visualizations together in the same world frame.
			</div>
		</div>
	</div>
{/if}
