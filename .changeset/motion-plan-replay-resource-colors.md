---
'@viamrobotics/motion-tools': patch
---

Motion plan replay now colors geometry by resource type, matching the live robot scene, instead of a single hardcoded blue overlay. The subtype is inferred from each frame's name (with no dependency on a connected robot), and replayed geometry uses the same semi-transparent look as live robot geometry.
