<script lang="ts">
	import { Portal } from '@threlte/extras'

	import { asset } from '$app/paths'
	import { Snapshot as SnapshotProto } from '$lib/buf/draw/v1/snapshot_pb'
	import Snapshot from '$lib/components/Snapshot.svelte'

	const versions = ['v1', 'v2', 'v3', 'new'] as const
	type Version = (typeof versions)[number]

	const labelFor = (version: Version) => (version === 'new' ? 'Load new' : `Load ${version}`)

	let snapshot = $state.raw<SnapshotProto | undefined>(undefined)
	let active = $state<Version | undefined>(undefined)

	const load = async (version: Version) => {
		const response = await fetch(
			asset(`/test-fixtures/visualization_snapshot_reconcile_${version}.json`)
		)
		if (!response.ok) return
		snapshot = SnapshotProto.fromJsonString(await response.text())
		active = version
	}
</script>

<Portal id="dashboard">
	<fieldset class="flex gap-2">
		{#each versions as version (version)}
			<button
				type="button"
				class={[
					'rounded px-3 py-1 text-xs font-medium',
					active === version ? 'bg-info-dark text-white' : 'bg-gray-3 text-gray-8 hover:bg-gray-4',
				]}
				onclick={() => load(version)}
			>
				{labelFor(version)}
			</button>
		{/each}
	</fieldset>
</Portal>

{#if snapshot}
	<Snapshot {snapshot} />
{/if}
