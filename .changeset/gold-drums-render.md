---
"@viamrobotics/motion-tools": patch
---

Render cylinder link geometries from a component's kinematics. The SDK geometry union has no cylinder case, so a cylinder previously drew as nothing. It now becomes a tessellated STL mesh at parse time, the same conversion rdk applies for its collision checks.
