<script lang="ts">
	/**
	 * The real field is a CodeMirror editor behind a collapsed `Expandable`. A textarea reaches
	 * `onChange` the same way and can be typed into.
	 */

	interface Props {
		label: string
		value: string
		onChange: (next: string) => void
	}

	const { label, value, onChange }: Props = $props()
</script>

<textarea
	aria-label={label}
	{value}
	oninput={(event) => onChange(event.currentTarget.value)}
></textarea>
