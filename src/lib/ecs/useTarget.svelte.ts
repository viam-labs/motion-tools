import { type Entity, $internal as internal, type Relation, type Trait, type World } from 'koota'

import { isWorld } from './useTrait.svelte'
import { useWorld } from './useWorld'

/**
 * Reactive view of an entity's target for an exclusive relation. Mirrors the
 * forthcoming `useTarget` from the upstream `@koota/svelte` package — kept
 * here until that package is published. See:
 * https://github.com/michealparks/koota/tree/svelte/packages/svelte
 */
export const useTarget = <T extends Trait>(
	target: () => Entity | World | undefined | null,
	relation: Relation<T>
): { readonly current: Entity | undefined } => {
	const contextWorld = useWorld()
	const targetEntity = $derived(target())
	const world = $derived(isWorld(targetEntity) ? targetEntity : contextWorld)
	const entity = $derived(isWorld(targetEntity) ? targetEntity[internal].worldEntity : targetEntity)

	let value = $derived(entity?.targetFor(relation))

	$effect(() => {
		if (!entity) return

		const onAddUnsub = world.onAdd(relation, (e) => {
			if (e === entity) value = entity.targetFor(relation)
		})

		const onRemoveUnsub = world.onRemove(relation, (e) => {
			if (e === entity) value = undefined
		})

		const onChangeUnsub = world.onChange(relation, (e) => {
			if (e === entity) value = entity.targetFor(relation)
		})

		return () => {
			onAddUnsub()
			onRemoveUnsub()
			onChangeUnsub()
		}
	})

	return {
		get current() {
			return value
		},
	}
}
