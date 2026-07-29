# Design: client-side IK preview for arm frames

_Last updated: 2026-07-29_

Closes gap #4 in [`gaps.md`](./gaps.md) — "No interactive IK drag."

When you drag the move gizmo on an arm frame, the arm's own link geometries stay
put. This proposes solving IK in the browser so the links follow the drag, using
[`closed-chain-ik-js`](https://github.com/gkjohnson/closed-chain-ik-js).

**Status:** design only. The numbers below come from a spike against real rdk
kinematics files; nothing is implemented.

---

## 1. The problem

`MoveControls` drags a handle in world space and stages a goal pose. Everything
hanging off the dragged frame is ghosted by applying one rigid world delta to
each descendant — `moveGhosts.ts:55` — which is correct for a gripper bolted to
a wrist and wrong for the arm's own links.

`collectMoved` (`moveGhosts.ts:58`) already says so:

> The dragged frame's own `GetGeometries` links are the exception, skipped at the
> top level. Those are the arm's links, and they are not rigid with the end
> effector: moving it re-solves the chain, so they land wherever IK puts them
> rather than offset by the drag.

So today the preview is a floating gripper with no arm attached to it. To draw
the arm we need to know where IK would put the links, which means solving IK.

## 2. Why this is cheaper than it looks

The expected blocker was needing to parse URDF to recover a joint tree. That
turns out to be unnecessary: `ArmClient.getKinematics()` already returns a full
kinematic model, and the frontend throws nearly all of it away.

```ts
// @viamrobotics/sdk — dist/utils.d.ts
interface KinematicsData {
	name: string
	kinematic_param_type: 'SVA' | 'URDF' | 'UNSPECIFIED'
	joints: { id; type; parent; axis; min; max }[]
	links: { id; parent; translation; orientation; geometry }[]
}
```

`useArmKinematics.svelte.ts:44` keeps `joints[].{id, min, max}` and discards
`axis`, `type`, `parent`, and every link. The SDK decodes the payload with a
plain `JSON.parse` over the kinematics bytes (`main.es.js:7095`), so what arrives
is Viam's SVA format verbatim.

Every other input is already being fetched too:

| Input                          | Where it already comes from                        |
| ------------------------------ | -------------------------------------------------- |
| Joint tree, axes, limits       | `useArmKinematics` (cached, `staleTime: Infinity`) |
| Current joint values (IK seed) | `useArmClient.svelte.ts:29`, polled at 500 ms      |
| Link collider geometry         | `useGeometries.svelte.ts:173`, one entity per link |
| Link meshes                    | `use3DModels.svelte.ts`, GLTF per link             |
| Arm origin world transform     | the arm entity's `WorldMatrix`                     |
| Goal pose                      | the gizmo, already in world space                  |

No new RPCs. No new entities.

### The linchpin: link ids match geometry entity names

Geometry entities are named `<armName>:<linkId>`. In rdk,
`referenceframe/frame_json.go:127` defaults a link geometry's label to the link's
`id`, and `referenceframe/model.go:603` prefixes it with the arm's name. The same
key indexes the GLTF map (`use3DModels.svelte.ts:35`).

So SVA link ids map directly onto the entities the scene already renders.

> One caveat: a link's geometry may carry an explicit `label`, in which case it
> won't equal the link id. Build the mapping from
> `links[].geometry.label ?? links[].id` — data we'll have parsed anyway — rather
> than assuming.

## 3. Spike results

Method: build the SVA → solver conversion, run it against `ur5e.json` and
`ur20.json` fetched from `viamrobotics/rdk`, and check it three ways — against an
independently written forward-kinematics implementation, on IK round-trips
(generate a target from FK at random joint values, then solve back to it), and on
a simulated 200-frame drag.

| Check                                                     | Result                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| Solver tree vs. independent FK, 200 random configurations | worst element error **7.2e-7**                             |
| IK round-trip, seeded ±0.3 rad off                        | 45–47 / 50 converged; median residual **0.004 mm / 0.05°** |
| Live drag, warm-started, one `solve()` per frame          | median **0.020 ms**, p95 0.028 ms, max 0.21 ms             |
| Goal 5 m outside the workspace                            | `DIVERGED`, residual 7.8 m                                 |

The FK agreement is the important one — it says the conversion in §4 is exact to
float32 precision, not approximately right.

At 0.020 ms against a 16 ms frame budget, solving synchronously per drag frame is
free. No `WorkerSolver`, no throttling. That matters here because the app is
CPU-bound on Svelte UI rather than on the 3D scene.

### Use residual error, not `SOLVE_STATUS`

`DIVERGED` shows up both for genuinely unreachable goals and for reachable goals
approached from an awkward seed (3–5 of 50 above). The residual separates them
cleanly — 0.004 mm median vs. metres — and it degrades gracefully into a number
worth showing a user ("42 mm out of reach") instead of a boolean.

## 4. The conversion

SVA joints rotate about an arbitrary axis. closed-chain-ik joints rotate about
their own frame's axes. Bridging them:

- Joint frame gets local rotation `R`, where `R · ẑ = axis`, and a single `EZ`
  degree of freedom (revolute) or `Z` (prismatic).
- The child link's local transform is pre-multiplied by `R⁻¹`.

Because `R · Rz(θ) · R⁻¹ = Rot(axis, θ)`, the link frames land exactly on the SVA
link frames — which is what the geometry centres are relative to. The `R⁻¹` also
means a link's `matrixWorld` can be read straight back as its SVA transform, so
the solver tree doubles as the FK evaluator.

Units: SVA is millimetres and degrees; the scene is metres (`math/pose.ts:21`);
closed-chain-ik is unit-agnostic but its default thresholds
(`translationConvergeThreshold: 1e-3`, `translationErrorClamp: 0.1`) are sized for
metres. Convert once at parse time and solve in metres.

Structural note: closed-chain-ik enforces strict `Link` ↔ `Joint` alternation
(`Joint` holds exactly one child `Link`). SVA permits a link whose parent is
another link, so insert a zero-DoF `Joint` (`clearDoF()`) at those points.

## 5. Design

### Data flow

```
getKinematics ──► ArmModel ──┐
                             ├──► solve(seed, target) ──► joint values
getJointPositions ── seed ───┤                                 │
gizmo target ────────────────┘                                 ▼
                                                     FK ──► per-link transforms
                                                               │
                                    per-link delta ◄───────────┘
                                          │
                                          ▼
                                   syncMoveGhosts
```

### Per-link delta

A geometry entity's `WorldMatrix` is `armOrigin × center`, where `center` already
reflects the _current_ joint configuration — `getGeometries()` returns geometry
placed at the live pose. Re-posing it at the solved configuration needs

```
D_link     = FK(solved)[link] × FK(current)[link]⁻¹
ghostWorld = armOrigin × D_link × armOrigin⁻¹ × sourceWorldMatrix
```

which never requires knowing where the geometry sits inside its link.

### Change to `moveGhosts`

`syncMoveGhosts` (`moveGhosts.ts:177`) takes a single `delta: Matrix4`.
Generalise that parameter to a per-source lookup. Then:

- Arm link geometries — currently skipped by `collectMoved` — are collected, and
  resolve to their own `D_link`.
- Everything else resolves to today's rigid delta, unchanged.

This is the whole plumbing change. `spawnGhost` already handles boxes, spheres,
capsules and buffer geometry; the instanced renderers already draw ghosts.

### Descendants ride the _achieved_ end effector, not the target

When IK converges these are the same pose. When it doesn't, driving a gripper
from the gizmo target while the arm ghost lands short would render a
configuration the robot cannot hold.

Driving descendants from the achieved end-effector transform keeps the ghost
internally consistent, and turns the failure into the feature: `MoveTargetGhost`
already draws a triad and a travel line at the staged goal, so **the visible gap
between the ghost arm and the target triad is the reachability feedback**, using
UI that exists.

### Proposed files

Following the one-focused-unit-per-file rule:

| File                                   | Responsibility                                                                                 |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `$lib/kinematics/armModel.ts`          | `GetKinematicsResult` → normalised model (metres, radians, three.js types). Pure.              |
| `$lib/kinematics/forwardKinematics.ts` | `linkTransforms(model, values)`. Pure. **Closes gap #3 on its own.**                           |
| `$lib/kinematics/armIkSolver.ts`       | Builds and caches the solver tree; `solve(seed, target)`. The only file importing the library. |
| `MoveFrame/armLinkGhostDeltas.ts`      | Solved transforms → per-link world deltas. Pure.                                               |
| `MoveFrame/useArmIkPreview.svelte.ts`  | Reactive glue: seed, target, invalidation.                                                     |

The first four are pure functions testable with vitest using a real `ur5e.json`
as a fixture — the same round-trip the spike ran.

## 6. Ghosting the 3D models

Decision: the ghost follows the `renderArmModels` setting
(`colliders` / `colliders+model` / `model`), so the preview always matches how
the real arm is drawn. That is the right call for consistency and it is the most
expensive part of this design. Three distinct problems:

**a. Ghosts have no `Name`, so no model can be looked up.**
`GeometryModel.svelte:40` resolves its GLTF via `matchModel(name.current, …)`.
Ghosts deliberately carry no `Name` and no `ChildOf` (`moveGhosts.ts:24`) so the
hierarchy tree, frame system and world-matrix system never see them — adding one
back would undo that. Instead resolve the model at spawn time and store the
resolved `Group` on a new `traits.GhostModel`.

**b. `Group.clone()` shares materials.** Tinting a ghost's clone would tint the
real arm. The clone needs a `traverse` + per-material `clone()`, done once at
ghost spawn (roughly 7 links per arm) rather than per drag frame.

**c. `GeometryModel` ignores `Color` and `Opacity`.** Rather than teach the live
render path about ghost tinting, dispatch a small `GhostModel.svelte` off
`useQuery(traits.GhostModel)` in `Entities.svelte`, leaving `GeometryModel`
untouched.

**Also:** in `model`-only mode, colliders are hidden by `traits.ColliderHidden`,
which `use3DModels.svelte.ts:126` only ever applies to entities carrying
`GeometriesAPI`. Ghosts don't carry it, so without a fix the ghost would show
colliders while the real arm shows meshes. `spawnGhost` must mirror
`ColliderHidden` from its source.

## 7. Risks and limits

**The preview is not the plan.** Viam's motion service uses its own solver, with
collision avoidance and constraints this has none of, and may pick a different
elbow configuration. Seeding from live joint values biases toward the nearest
solution, which is usually what the planner picks — but not always. Label it a
preview, and **warn rather than block** on `Execute move`; a client-side solver
must not veto a move the real planner would accept.

**Mimic joints break the model.** `referenceframe/testfiles/test_mimic_serial.json`
has a joint declared `{"mimic": {"joint": "joint1", "multiplier": -1}}` and no
limits. It is not an independent degree of freedom, `getJointPositions()` won't
report a value for it, and closed-chain-ik has no concept of it — the solver
would move it freely. Detect `mimic` and fall back to today's rigid ghost.

**A third kinematics format exists.** `components/arm/fake/kinematics/dofbot.json`
is `kinematic_param_type: "DH"` with a `dhParams` array and no `links`/`joints` at
all. The SDK's type doesn't even list `DH`, so `useArmKinematics` already yields
`undefined` joints for those arms today. DH → transform chain is mechanical
(`Rz(θ)·Tz(d)·Tx(a)·Rx(α)`) but it is separate scope.

**URDF-format arms already fail.** The SDK's `JSON.parse` throws on XML, so
`getKinematics()` rejects before any of this is reached. Unchanged by this work.

**End-effector frame identification.** The spike picked "the last link no joint
claims as a parent", which gives `ee_link` for UR5e and `wrist_3_link` for UR20.
Rather than trust that, compute a fixed offset at solve setup:

```
T = FK(currentJoints)[lastLink]⁻¹ × (armOrigin⁻¹ × liveEndEffectorPose)
```

`liveEndEffectorPose` is what `useMovedFrameMatrix` already fetches. `T` is
identity when the last link is the end-effector frame and absorbs the difference
when it isn't — self-calibrating, and it validates the parsed model against live
hardware for free.

## 8. Dependency assessment

`closed-chain-ik`, Apache-2.0, 294 stars, by gkjohnson (author of
`three-mesh-bvh` and `urdf-loader`, both already trusted in this stack).

**Good:** `src/core/` depends only on `gl-matrix` — three.js, `three-mesh-bvh` and
`urdf-loader` appear solely under `src/three/` and in the top-level barrel.
Deep-import `closed-chain-ik/src/core/index.js` and none of them are pulled in.
40 KB packed.

**Two frictions, both verified:**

1. _The shipped types don't compile here._ `DOF` and `SOLVE_STATUS` are ambient
   `const enum`s and every scalar is typed as boxed `Number`/`Boolean`. Under this
   repo's `verbatimModuleSyntax` + `strict`, importing them produces `TS2748` and
   `TS2322`. Confirmed workable by confining all contact to `armIkSolver.ts`,
   which restates the two enums as local constants (`DOF.EZ === 5`,
   `SOLVE_STATUS.CONVERGED === 0`) and coerces what it reads back with `Number()`.
   Type-checked clean against this project's own tsc.
2. _npm is stale._ `closed-chain-ik@0.0.3` was published 2023-05-04; the repo is
   still active. Its own README says to install from GitHub. Either pin the old
   npm version or pin a git SHA.

**The alternative** is roughly 200 lines of hand-rolled damped least squares. The
domain logic — parsing, FK, the axis conversion — is needed either way and is the
bulk of the work; only the Jacobian and the DLS step would be new. That option
avoids the dependency and the type friction entirely. It is rejected because
singularity handling is precisely where a preview looks wrong, and that is what
the library has been field-tested on. Worth revisiting if the type friction
proves worse in practice than the spike suggests.

## 9. Increments

1. **Model + FK, no UI.** `armModel.ts`, `forwardKinematics.ts`, vitest specs
   against a real `ur5e.json` fixture. Independently useful: closes gap #3.
2. **Solver + collider ghosts.** `armIkSolver.ts`, the `syncMoveGhosts` delta
   lookup, `useArmIkPreview`. This is the feature.
3. **Model ghosts.** §6 — `traits.GhostModel`, `GhostModel.svelte`, material
   cloning, `ColliderHidden` mirroring.
4. **Reachability readout.** Residual in the `MoveControls` panel; warn, not block.

## 10. To verify against real hardware

Everything above is derived from rdk source and rdk kinematics fixtures. Before
building, confirm on a live machine:

- [ ] `getKinematics()` returns SVA with populated `links[]` (not `DH`, not URDF).
- [ ] Geometry entity names match `<armName>:<linkId>` for that arm's SVA links.
- [ ] `getJointPositions().values` is ordered to match `joints[]`, in degrees.
- [ ] FK at the live joint values reproduces `getPose(armName, 'world')` — the §7
      offset check, which doubles as the end-to-end validation of the parse.
