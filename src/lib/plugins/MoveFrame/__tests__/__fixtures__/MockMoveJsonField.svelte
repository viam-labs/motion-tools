<script lang="ts">
	/**
	 * The real field is a CodeMirror editor behind a collapsed `Expandable`, which is a lot of
	 * machinery to drive for the one thing the panel cares about: that editing the text reaches
	 * `onChange`. A textarea says the same thing and can be typed into.
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
