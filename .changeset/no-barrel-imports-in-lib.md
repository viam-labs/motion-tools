---
'@viamrobotics/motion-tools': patch
---

Fix `Visualizer` imports pulling `@viamrobotics/test-widgets` through the plugins barrel

Internal modules no longer import the `$lib`, `$lib/lib`, or `$lib/plugins` barrels. The plugins barrel re-exports `ControlWidgets`, which imports `@viamrobotics/test-widgets`, so every `Visualizer` import closed a cycle back into this package and pulled that dependency into the bundle. A new eslint rule prevents the barrel imports from regressing.
