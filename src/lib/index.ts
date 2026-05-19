/** @deprecated MotionTools has been renamed to Visualizer. This export will be removed in v2. */
export { default as MotionTools } from './components/App.svelte'
export { default as Visualizer } from './components/App.svelte'

// Plugins
export { default as SelectionTool } from './plugins/Selection/Tool.svelte'
export { default as PCD } from './components/PCD.svelte'

// ECS
export * as relations from './ecs/relations'
export * as traits from './ecs/traits'
export * as selectionTraits from './plugins/Selection/traits'
export { useSelectionPlugin as useSelection } from './plugins/Selection/useSelectionPlugin.svelte'
export { default as FloatingPanel } from './components/overlay/FloatingPanel.svelte'

export { provideWorld, useWorld } from './ecs/useWorld'
export { useQuery } from './ecs/useQuery.svelte'
export { useTrait } from './ecs/useTrait.svelte'
