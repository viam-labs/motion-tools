import { relation } from 'koota'

/**
 * Parent → child hierarchy relation. `exclusive: true` because each entity has
 * at most one parent. Cascade-on-orphan is intentionally OFF: when a parent is
 * destroyed, children survive and gain an `Orphan(parentName)` trait so they
 * reattach if a frame with that name reappears. Sub-trees that should be torn
 * down together (e.g. model roots + assets) call `destroyEntityTree` instead.
 */
export const ChildOf = relation({ exclusive: true })

export const SubEntityLinkType = {
	HoverLink: 'HoverLink',
} as const

export const SubEntityLink = relation({
	store: { indexMapping: () => 'index', type: '' },
})
