---
'@viamrobotics/motion-tools': patch
---

Add the Motion Plan Replayer plugin shell: a dashboard-mounted floating panel that uploads plan JSON files, parses them into snapshots, and lists them with ready/error/no-trajectory status. Exposes an `extraSource` snippet receiving `addPlan` so an embedding app can inject its own plan source (e.g. a DB picker) without escaping the plugin's context.
