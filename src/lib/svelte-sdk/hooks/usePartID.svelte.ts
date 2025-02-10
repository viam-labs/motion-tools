import { getContext, setContext } from 'svelte'

const key = Symbol('part-id-context')

class PartID {
	private value: string = $state('')

	get current(): string {
		return this.value
	}

	set(value: string): void {
		this.value = value
	}
}

export const createPartIDContext = (): PartID => {
	const context = new PartID()
	setContext<PartID>(key, context)
	return context
}

export const usePartID = (): PartID => {
	return getContext<PartID>(key)
}
