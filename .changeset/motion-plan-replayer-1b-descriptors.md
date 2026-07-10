---
'@viamrobotics/motion-tools': patch
---

Add frame-descriptor derivation for the Motion Plan Replayer: converts a `ParsedPlan` into static and jointed `FrameDescriptor`s (geometry, orientation conversion, joint-index mapping, end-effector reparenting).
