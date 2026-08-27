---
'@viamrobotics/visualization': minor
---

Share trajectory playback between the plan replayer and the move panel

`MotionPlanReplayerContext.setStep` now pauses playback when called, rather than only applying the step, since a caller scrubbing by hand almost always means "take over from here."
