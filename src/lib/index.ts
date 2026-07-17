/** @deprecated MotionTools has been renamed to Visualizer. This export will be removed in v2. */
export { default as MotionTools } from './components/App.svelte'
export { default as Visualizer } from './components/App.svelte'

export { useSettings } from './hooks/useSettings.svelte'
export { default as SettingsPortal } from './components/overlay/Portals/SettingsPortal.svelte'
export { default as DashboardPortal } from './components/overlay/Portals/DashboardPortal.svelte'
export { default as WorkspacePortal } from './components/overlay/Portals/WorkspacePortal.svelte'
export { default as DetailsPortal } from './components/overlay/Portals/DetailsPortal.svelte'

// Plugins
export { default as PCD } from './components/PCD.svelte'

// ECS
export * as relations from './ecs/relations'
export * as traits from './ecs/traits'

export { default as FloatingPanel } from './components/overlay/FloatingPanel.svelte'

export { provideWorld, useWorld } from './ecs/useWorld'
export { useQuery } from './ecs/useQuery.svelte'
export { useTrait } from './ecs/useTrait.svelte'
