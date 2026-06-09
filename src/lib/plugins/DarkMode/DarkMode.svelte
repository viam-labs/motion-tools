<script lang="ts">
	import { Portal } from '@threlte/extras'

	import Button from '$lib/components/overlay/dashboard/Button.svelte'

	import { ThemeModes, useDarkMode } from './useDarkMode.svelte'

	const darkMode = useDarkMode()
	let icon = $state<'sun-moon' | 'sun' | 'moon'>('sun-moon')
	let description = $state('')

	$effect(() => {
		switch (darkMode.current) {
			case ThemeModes.System: {
				icon = 'sun-moon'
				description = 'Enable dark mode'
				break
			}
			case ThemeModes.Dark: {
				icon = 'moon'
				description = 'Enable light mode'
				break
			}
			case ThemeModes.Light: {
				icon = 'sun'
				description = 'Use preferred mode'
				break
			}
		}
	})
</script>

<Portal id="dashboard">
	<Button
		{icon}
		{description}
		active={darkMode.current !== ThemeModes.System}
		class="rounded-r-none"
		onclick={() => {
			darkMode.toggle()
		}}
	/>
</Portal>
