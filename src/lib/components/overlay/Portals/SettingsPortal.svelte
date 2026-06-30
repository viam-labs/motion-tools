<script lang="ts">
	import { type Snippet, untrack } from 'svelte'

	import { useSettingsTabs } from './useSettingsTabs.svelte'

	interface Props {
		label: string
		children: Snippet
	}

	let { label, children }: Props = $props()

	const tabs = useSettingsTabs()

	$effect(() => {
		label
		children

		return untrack(() => {
			const currentTabs = tabs.current
			const tab = { label, children }
			currentTabs.push(tab)
			return () => {
				const index = currentTabs.indexOf(tab)

				if (index !== -1) {
					currentTabs.splice(index, 1)
				}
			}
		})
	})
</script>
