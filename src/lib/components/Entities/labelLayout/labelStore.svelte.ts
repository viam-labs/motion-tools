/**
 * Registry of live label root elements (`.label`) shared between the per-entity
 * `Label.svelte` components (which add/remove themselves) and the layout engine
 * (which reads them each solve).
 *
 * `version` is bumped on every structural or text change so the engine can cheaply
 * detect that a re-solve is needed without diffing the DOM.
 */
export class LabelStore {
	current = $state<HTMLElement[]>([])
	version = $state(0)

	add(element: HTMLElement) {
		this.current.push(element)
		this.version += 1
	}

	remove(element: HTMLElement) {
		const index = this.current.indexOf(element)
		if (index !== -1) {
			this.current.splice(index, 1)
			this.version += 1
		}
	}

	/** Signal that a label's text (and therefore its measured size) may have changed. */
	touch() {
		this.version += 1
	}
}

export const labels = new LabelStore()
