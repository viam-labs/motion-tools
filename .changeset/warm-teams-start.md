---
'@viamrobotics/visualization': patch
---

Keep the scene drawn when a machine disconnects instead of wiping it. World state entities, arm 3D models, pointclouds, and pointcloud objects now survive a drop and a redial, and a point cloud interrupted mid-stream resumes its remaining chunks on reconnect rather than staying half-written. Requires @viamrobotics/svelte-sdk 1.3.0, which keys queries on the addressed part and resource so a torn-down client no longer empties their data.
