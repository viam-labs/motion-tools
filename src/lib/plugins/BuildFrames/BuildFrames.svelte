<script lang="ts">
	import ModeTogglePortal from '$lib/components/overlay/Portals/ModeTogglePortal.svelte'
	import ModeButton from '$lib/components/overlay/workspace/ModeButton.svelte'
	import { useEnvironmentMode } from '$lib/hooks/useEnvironment.svelte'

	import AddFrames from './AddFrames.svelte'
	import LiveUpdatesBanner from './LiveUpdatesBanner.svelte'
	import StaticGeometries from './StaticGeometries.svelte'
	import TransformDashboard from './TransformDashboard.svelte'

	// Registering also resolves a persisted `build` back to `monitor` for hosts
	// that don't mount this plugin, instead of pausing live queries with no UI out.
	useEnvironmentMode('build')
</script>

<ModeTogglePortal>
	<ModeButton
		class="-ml-px rounded-none"
		mode="build"
		description="Build the scene"
	/>
</ModeTogglePortal>

<!-- Each of these gates itself on build mode being active. -->
<TransformDashboard />
<LiveUpdatesBanner />
<AddFrames />
<StaticGeometries />
