---
'@viamrobotics/motion-tools': patch
---

Render Motion Plan Replayer plans in 3D and add the timeline scrubber. Selecting a plan spawns its snapshot entities under a plan entity, and a bottom scrubber (play/pause, step, seek) resolves each slider position to the corresponding snapshot via `reconcileSnapshotEntities`. Plan entities are tinted and torn down as a group through the `PartOfPlan` relation.
