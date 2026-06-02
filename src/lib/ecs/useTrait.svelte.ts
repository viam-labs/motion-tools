import { type Entity, $internal as internal, type Trait, type World } from 'koota'
import { untrack } from 'svelte'

import { useWorld } from './useWorld'

type AoSFactory = () => unknown

type Schema =
	| {
			[key: string]: number | bigint | string | boolean | null | undefined | (() => unknown)
	  }
	| AoSFactory
	| Record<string, never>

type TraitRecordFromSchema<T extends Schema> = T extends AoSFactory
	? ReturnType<T>
	: {
			[P in keyof T]: T[P] extends (...args: never[]) => unknown ? ReturnType<T[P]> : T[P]
		}

type TraitRecord<T extends Trait | Schema> = T extends Trait
	? TraitRecordFromSchema<T['schema']>
	: TraitRecordFromSchema<T>

export function isWorld(target: Entity | World | null | undefined): target is World {
	return typeof (target as World)?.spawn === 'function'
}

export function useTrait<T extends Trait>(
	target: () => Entity | World | undefined | null,
	trait: T
): { readonly current: TraitRecord<T> | undefined } {
	const contextWorld = useWorld()
	let value = $state.raw<TraitRecord<T>>()
	// Version counter to force reactivity when the value reference is the same (AoS traits).
	// Only read in the getter, never in the effect.
	let version = $state(0)

	$effect(() => {
		const t = target()

		if (!t) {
			value = undefined
			return
		}

		const world = isWorld(t) ? t : contextWorld
		const entity = isWorld(t) ? t[internal].worldEntity : t

		value = entity.has(trait) ? entity.get(trait) : undefined

		const onChangeUnsub = world.onChange(trait, (e) => {
			if (e === entity) {
				value = e.get(trait)
				untrack(() => version++)
			}
		})

		const onAddUnsub = world.onAdd(trait, (e) => {
			if (e === entity) value = e.get(trait)
		})

		const onRemoveUnsub = world.onRemove(trait, (e) => {
			if (e === entity) value = undefined
		})

		return () => {
			onChangeUnsub()
			onAddUnsub()
			onRemoveUnsub()
		}
	})

	return {
		get current() {
			void version
			return value
		},
	}
}
