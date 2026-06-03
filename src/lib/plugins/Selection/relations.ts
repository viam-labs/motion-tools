import { relation } from 'koota'

export const SelectedFrom = relation()

/**
 * Captured points are removable, so we want to also destroy
 * the source selection every time a user deletes one.
 */
export const PointsCapturedBy = relation({ autoDestroy: 'target' })
