/** @deprecated MotionTools has been renamed to Visualizer. This export will be removed in v2. */
export { default as MotionTools } from './components/App.svelte'
export { default as Visualizer } from './components/App.svelte'

// Plugins
export { default as PCD } from './components/PCD.svelte'

// ECS
export * as relations from './ecs/relations'
export * as traits from './ecs/traits'
export { default as FloatingPanel } from './components/overlay/FloatingPanel.svelte'

export { provideWorld, useWorld } from './ecs/useWorld'
export { useQuery } from './ecs/useQuery.svelte'
export { useTrait } from './ecs/useTrait.svelte'
