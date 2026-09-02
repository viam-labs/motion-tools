---
'@viamrobotics/visualization': patch
---

Source the pointcloud, pointcloud object, and arm model resource lists from machine status, so a resource going unhealthy no longer drops out of the list and remounts everything derived from it.
