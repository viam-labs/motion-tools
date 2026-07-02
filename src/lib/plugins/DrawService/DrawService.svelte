<script lang="ts">
	import { provideDrawAPI } from './useDrawAPI.svelte'
	import {
		type DrawConnectionConfig,
		provideDrawConnectionConfig,
	} from './useDrawConnectionConfig.svelte'
	import { provideDrawService } from './useDrawService.svelte'

	interface Props {
		config: DrawConnectionConfig
	}

	let { config }: Props = $props()

	provideDrawConnectionConfig(() => config)
	provideDrawAPI()
	provideDrawService()
</script>
