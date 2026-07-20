---
'@viamrobotics/motion-tools': patch
---

Add persistent per-frame display config to the Motion Plan Replayer. Per-frame color, opacity, visibility, and axes edits made via the scene Details panel and tree now persist across scrubbing instead of being reset each step. Also fixes the Details panel "show axes helper" toggle, which previously had no effect because the batched axes renderer never reacted to the trait being added or removed at runtime.
