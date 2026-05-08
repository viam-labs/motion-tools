---
'@viamrobotics/motion-tools': minor
---

Add an `autoSelectNewEntities` prop to `SelectionTool`. When enabled, each new entity added to the selection set (via lasso or ellipse) is set as the active `selectedEntity`, causing the Details panel to focus the latest selection. Defaults to `false` so existing consumers see no behavior change.
