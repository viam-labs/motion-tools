# Feature gap analysis: URDF Viewer vs. Viam Visualization

_Last updated: 2026-07-29_

A comparison of [Black Coffee Robotics' URDF Viewer](https://www.blackcoffeerobotics.com/blog/urdf-viewer-a-robotic-workcell-analysis-and-visualization-tool) against the visualizer in this repo, to identify which of its capabilities are worth adopting.

**Method and caveat.** The URDF Viewer feature list is taken from its announcement blog post, which is marketing-level — capability claims are its own and their depth is unverified. This repo's side was verified against the source; file references are inline.

## Core positioning

These are different tool categories, and that drives every gap below. URDF Viewer is a **design-time** workcell layout and feasibility tool that runs with no robot attached. This repo is a **runtime** observability tool for a live Viam machine.

|                     | URDF Viewer                                       | This repo                                                           |
| ------------------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| **Data source**     | A URDF file you upload                            | A live Viam machine over Connect-RPC (`partID` + resource clients)  |
| **When you use it** | Before the cell exists — "will this robot reach?" | After it exists — "why did it do that?"                             |
| **Robot model**     | URDF, any manufacturer                            | Viam arm config; GLTF + Draco meshes via `ArmClient.get3DModels()`  |
| **Auth**            | None; runs in-browser with no account             | Viam machine credentials (the snapshot playground is the exception) |
| **Analysis**        | Reachability, feasibility, approach angles        | None — it is a renderer, not a solver                               |

## Gaps: capabilities URDF Viewer has that this repo lacks

### 1. No URDF ingestion

The headline gap, and notable because the plumbing is half-built. `protos/vendor/common/v1/common.proto:226` defines `KINEMATICS_FILE_FORMAT_URDF` and a `meshes_by_urdf_filepath` map, but the frontend discards nearly all of it — `src/lib/hooks/useArmKinematics.svelte.ts:44` reads only `joints[].{id,min,max}`. Links, joint axes, origins, and the mesh map are never parsed.

Nor can a URDF be dropped in: `src/lib/components/FileDrop/file-names.ts:3` permits exactly `json | pcd | ply | pb | pb.gz`.

### 2. No offline mode for robots

Everything hangs off `partID` and live resource clients. The snapshot playground replays a _captured_ scene rather than acting as an authoring surface. URDF Viewer's "zero install, no account" is a materially different entry point.

### 3. No client-side forward kinematics

Joint _limits_ are available, but nothing re-poses an arm from slider values. Arm pose is streamed from the machine, full stop.

### 4. No interactive IK drag

The nearest equivalent is `src/lib/plugins/XR/ArmTeleop.svelte:402`, and it is not comparable: it calls `armClient.moveToPosition()`, so IK runs server-side **on the real robot**. The "Position not reachable (IK error)" message at line 129 is a surfaced server error, not a local solve. There is no client-side solver anywhere in the codebase, and no desktop equivalent of the VR teleop flow.

### 5. No reachability or workspace analysis

Nothing computes reachable volume, task coverage, or feasibility. No color-coded failure visualization.

### 6. No task-region concept

There is no object type for "region the robot must service, subject to these approach-angle constraints." This is URDF Viewer's differentiated primitive.

### 7. No multi-robot comparison

Rendering is per-part. Two candidate arms cannot be placed in one cell and compared.

### 8. No collision checking

`@dimforge/rapier3d-compat` and `@threlte/rapier` are declared in `package.json`, and `CLAUDE.md:9` lists "Rapier physics" in the tech stack — but there are **zero references anywhere in the repo**. Colliders are rendered, never simulated. The stack table is aspirational on this point.

### 9. Thin obstacle authoring

`src/lib/components/overlay/AddFrames.svelte` adds frames; obstacle geometry otherwise arrives from machine config or the world state store. There is no click-to-place primitive workflow.

## Reverse gaps: capabilities this repo has that URDF Viewer lacks

Substantially more, and mostly things a static URDF tool structurally cannot do:

- **Live telemetry** — real-time pose and geometry streaming from running hardware
- **Point clouds at scale** — worker-decoded PCD/PLY, chunking, `three-mesh-bvh` raycast acceleration
- **Motion plan replay** — `src/lib/plugins/MotionPlanReplayer/` parses real planner output (frame system, goals, trajectory) and scrubs through it
- **Motion execution** — `src/lib/plugins/MoveFrame/` drives the Viam motion service against real hardware
- **Hardware control widgets** — `@viamrobotics/test-widgets` embedded per resource
- **Programmatic drawing API** — a Go package plus Connect-RPC service for scripting scene construction
- **Snapshot serialization** — protobuf save / load / share
- **WebXR VR teleop** — controller-driven arm control with joint-limit feedback and camera feed
- **Measurement tool** — axis-constrained point-to-point distance
- **LLM scene builder** — natural language to frame config deltas with a diff/confirm step. Note the inversion: URDF Viewer's AI _analyzes_; this one _writes back to machine config_.
- **Embeddable `<Visualizer />`** with a documented integration path

## Recommendation

Three of the nine gaps are strategic. The rest are category differences that should not be chased.

1. **URDF ingest** — cheapest and highest-leverage. The proto already carries URDF bytes and a mesh map that are currently discarded. Parsing the link/joint tree would let the viewer render arms that do not implement `get3DModels()`, which today log a warning and render nothing.
2. **Client-side FK** — falls out of (1) nearly free once the joint tree exists, and unlocks what-if posing with no machine attached.
3. **Reachability analysis** — the real product idea, and the expensive one. It requires an IK solver this repo does not have.

Everything else in URDF Viewer (task regions, approach constraints, multi-robot comparison) is downstream of (3), and only worth building if Viam intends to enter workcell design — a different product than the one this repo is.
