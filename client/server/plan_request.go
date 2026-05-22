package server

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"

	"connectrpc.com/connect"
	"github.com/golang/geo/r3"
	"github.com/viam-labs/motion-tools/draw"
	drawv1 "github.com/viam-labs/motion-tools/draw/v1"
	"github.com/viam-labs/motion-tools/draw/v1/drawv1connect"
	commonv1 "go.viam.com/api/common/v1"
	"go.viam.com/rdk/referenceframe"
	"go.viam.com/rdk/spatialmath"
)

// planRequestBody is a minimal representation of an armplanning.PlanRequest
// sufficient for rendering the start state and goal poses. We avoid importing
// go.viam.com/rdk/motionplan/armplanning because PlanState has unexported fields
// that require a custom JSON codec, making the struct unusable outside the package.
//
// FrameSystem is kept as json.RawMessage so we can strip unrecognised frame
// types ("named", "tail_geometry_static", etc.) before passing to
// referenceframe.FrameSystem.UnmarshalJSON, which panics on unknown types.
type planRequestBody struct {
	FrameSystem json.RawMessage            `json:"frame_system"`
	StartState  *planStateBody             `json:"start_state"`
	WorldState  *referenceframe.WorldState `json:"world_state"`
	Goals       []planGoalBody             `json:"goals"`
}

type planResultBody struct {
	Trajectory []referenceframe.FrameSystemInputs `json:"trajectory"`
}

// knownFrameTypes lists the frame_type values that referenceframe.FrameSystem
// can deserialise in the rdk version this module pins. Unknown types (e.g.
// "named" internal link frames produced by newer rdk model expansion) are
// stripped before unmarshaling to avoid "not a registered Frame implementation"
// errors. The model frame these belong to is kept, and rdk regenerates the
// internals via auto-flatten when the SimpleModel is added to the destination FS.
var knownFrameTypes = map[string]bool{
	"static":               true,
	"model":                true,
	"translational":        true,
	"rotational":           true,
	"tail_geometry_static": true,
}

// Colors used only by the /plan-request debug renderer (not the live machine
// visualization): matrix green (#00FF41) at 85% opacity for non-obstacle
// frames, teal for obstacles.
var (
	debugColor    = draw.ColorFromRGBA(0, 255, 65, 217)
	obstacleColor = draw.ColorFromHex("#2EC4B6").SetAlpha(84)
)

type rawFrameSystem struct {
	Name    string                     `json:"name"`
	World   json.RawMessage            `json:"world"`
	Frames  map[string]json.RawMessage `json:"frames"`
	Parents map[string]string          `json:"parents"`
}

type frameTypeProbe struct {
	FrameType string `json:"frame_type"`
}

// filterFrameSystemJSON removes frames whose frame_type is not in
// knownFrameTypes and drops corresponding parents entries, returning a JSON
// blob safe to pass to referenceframe.FrameSystem.UnmarshalJSON.
func filterFrameSystemJSON(raw json.RawMessage) (json.RawMessage, error) {
	var rfs rawFrameSystem
	if err := json.Unmarshal(raw, &rfs); err != nil {
		return nil, err
	}
	filtered := make(map[string]json.RawMessage, len(rfs.Frames))
	for name, frameData := range rfs.Frames {
		var probe frameTypeProbe
		if err := json.Unmarshal(frameData, &probe); err == nil && knownFrameTypes[probe.FrameType] {
			filtered[name] = frameData
		}
	}
	rfs.Frames = filtered

	// Filter parents map to only reference frames we kept; also reparent any
	// surviving frame whose direct parent was dropped to the nearest surviving
	// ancestor (falls back to "world").
	filteredParents := make(map[string]string, len(filtered))
	for name := range filtered {
		parent := rfs.Parents[name]
		for parent != "" && parent != "world" {
			if _, ok := filtered[parent]; ok {
				break
			}
			parent = rfs.Parents[parent]
		}
		if parent == "" {
			parent = "world"
		}
		filteredParents[name] = parent
	}
	rfs.Parents = filteredParents
	return json.Marshal(rfs)
}

type planStateBody struct {
	Configuration referenceframe.FrameSystemInputs `json:"configuration"`
}

type planGoalBody struct {
	Poses map[string]planPoseInFrameBody `json:"poses"`
}

type planPoseInFrameBody struct {
	Pose planPoseBody `json:"pose"`
}

type planPoseBody struct {
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Z     float64 `json:"z"`
	OX    float64 `json:"oX"`
	OY    float64 `json:"oY"`
	OZ    float64 `json:"oZ"`
	Theta float64 `json:"theta"`
}

type planRequestResponse struct {
	ComponentNames []string `json:"component_names"`
	GoalCount      int      `json:"goal_count"`
	TotalSteps     int      `json:"total_steps"`
	CurrentStep    int      `json:"current_step"`
}

type planStepRequest struct {
	Direction string `json:"direction"`
	Step      *int   `json:"step"`
}

type planStepResponse struct {
	CurrentStep int `json:"current_step"`
	TotalSteps  int `json:"total_steps"`
}

type planPlaybackState struct {
	FrameSystem    *referenceframe.FrameSystem
	WorldState     *referenceframe.WorldState
	Goals          []planGoalBody
	StartInputs    referenceframe.FrameSystemInputs
	ResolvedSteps  []referenceframe.FrameSystemInputs
	Trajectory     []referenceframe.FrameSystemInputs
	CurrentStepIdx int
	// Prefix is prepended to every transform/drawing reference_frame (and
	// parent reference) before sending to the draw service, so that plans
	// from different debug configs (and the live machine) don't collide on
	// the deterministic name+parent UUIDs.
	Prefix string
}

var planPlayback struct {
	mu    sync.RWMutex
	state *planPlaybackState
	// entityUUIDs holds the UUIDs of every entity added by the most recent
	// /plan-request invocation. We remove only these on the next request,
	// rather than calling RemoveAll, so that entities pushed to the same
	// draw service by other clients (e.g. a live machine module) survive
	// across plan loads.
	entityUUIDs [][]byte
}

// handlePlanRequest handles POST /plan-request. It parses the request body as a
// Viam motion plan request JSON, clears the current scene, renders the robot
// frame system at its start configuration, and draws goal poses as arrows.
func handlePlanRequest(svc drawv1connect.DrawServiceHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Decode JSON in stream mode so uploads that contain concatenated JSON
		// objects (request + response in one file) still work.
		decoder := json.NewDecoder(io.LimitReader(r.Body, 32<<20))
		var req planRequestBody
		var result planResultBody
		foundReq := false
		for i := 0; i < 8; i++ {
			var raw json.RawMessage
			err := decoder.Decode(&raw)
			if errors.Is(err, io.EOF) {
				break
			}
			if err != nil {
				http.Error(w, fmt.Sprintf("invalid plan request JSON: %v", err), http.StatusUnprocessableEntity)
				return
			}

			var candidate planRequestBody
			_ = json.Unmarshal(raw, &candidate)
			if len(candidate.FrameSystem) > 0 && string(candidate.FrameSystem) != "null" {
				req = candidate
				foundReq = true
			}

			if len(result.Trajectory) == 0 {
				var candidateResult planResultBody
				if err := json.Unmarshal(raw, &candidateResult); err == nil && len(candidateResult.Trajectory) > 0 {
					result = candidateResult
				}
			}
		}
		if !foundReq {
			http.Error(w, "plan request missing frame_system", http.StatusUnprocessableEntity)
			return
		}

		if len(req.FrameSystem) == 0 || string(req.FrameSystem) == "null" {
			http.Error(w, "plan request missing frame_system", http.StatusUnprocessableEntity)
			return
		}

		// Strip frame types unknown to the referenceframe package (e.g. "named"
		// internal link frames, "tail_geometry_static") before deserialising.
		filteredFSJSON, err := filterFrameSystemJSON(req.FrameSystem)
		if err != nil {
			http.Error(w, fmt.Sprintf("invalid frame_system JSON: %v", err), http.StatusUnprocessableEntity)
			return
		}
		var fs referenceframe.FrameSystem
		if err := json.Unmarshal(filteredFSJSON, &fs); err != nil {
			http.Error(w, fmt.Sprintf("invalid frame_system: %v", err), http.StatusUnprocessableEntity)
			return
		}

		ctx := r.Context()
		prefix := r.URL.Query().Get("prefix")

		// Clear only the entities added by the previous /plan-request call.
		// Calling RemoveAll here would also wipe entities pushed to the same
		// draw service by other producers (e.g. a live machine module), which
		// would make their resources disappear from the world panel.
		planPlayback.mu.Lock()
		prevUUIDs := planPlayback.entityUUIDs
		planPlayback.entityUUIDs = nil
		planPlayback.mu.Unlock()
		for _, uuid := range prevUUIDs {
			_, _ = svc.RemoveEntity(ctx, connect.NewRequest(&drawv1.RemoveEntityRequest{Uuid: uuid}))
		}

		addedUUIDs := make([][]byte, 0, len(prevUUIDs))

		var startInputs referenceframe.FrameSystemInputs
		if req.StartState != nil && req.StartState.Configuration != nil {
			startInputs = req.StartState.Configuration
		}

		initialInputs := mergeFrameSystemInputs(referenceframe.NewZeroInputs(&fs), startInputs)
		resolvedSteps := resolveTrajectorySteps(initialInputs, result.Trajectory)

		currentStep := -1
		inputs := initialInputs
		if len(resolvedSteps) > 0 {
			currentStep = 0
			inputs = resolvedSteps[0]
		}

		fsUUIDs, err := renderFrameSystem(ctx, svc, &fs, inputs, prefix)
		if err != nil {
			http.Error(w, fmt.Sprintf("failed to render frame system: %v", err), http.StatusInternalServerError)
			return
		}
		addedUUIDs = append(addedUUIDs, fsUUIDs...)

		// Best-effort: an empty/missing world state must not fail the whole request.
		if req.WorldState != nil {
			addedUUIDs = append(addedUUIDs, renderWorldState(ctx, svc, req.WorldState, &fs, inputs, prefix)...)
		}

		goalPoses := collectGoalPoses(req.Goals)
		if len(goalPoses) > 0 {
			addedUUIDs = append(addedUUIDs, renderGoalPoses(ctx, svc, goalPoses, prefix)...)
		}

		// Re-render the frame system once more. Transform UUIDs are deterministic
		// over "name:parent", so this second pass emits UPDATED events for every
		// transform. UPDATED events re-run the client-side relationship resolver,
		// which fixes the case where a child transform arrives before its parent
		// during the initial burst and the parent-child attachment is lost. Without
		// this, the first frame is invisible until the user steps the plan (which
		// goes through the same upsert path).
		if _, err := renderFrameSystem(ctx, svc, &fs, inputs, prefix); err != nil {
			http.Error(w, fmt.Sprintf("failed to render frame system: %v", err), http.StatusInternalServerError)
			return
		}

		planPlayback.mu.Lock()
		planPlayback.state = &planPlaybackState{
			FrameSystem:    &fs,
			WorldState:     req.WorldState,
			Goals:          req.Goals,
			StartInputs:    initialInputs,
			ResolvedSteps:  resolvedSteps,
			Trajectory:     result.Trajectory,
			CurrentStepIdx: currentStep,
			Prefix:         prefix,
		}
		planPlayback.entityUUIDs = addedUUIDs
		planPlayback.mu.Unlock()

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(planRequestResponse{
			ComponentNames: fs.FrameNames(),
			GoalCount:      len(goalPoses),
			TotalSteps:     len(result.Trajectory),
			CurrentStep:    currentStep,
		})
	}
}

func handlePlanRequestStep(svc drawv1connect.DrawServiceHandler) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		planPlayback.mu.Lock()
		defer planPlayback.mu.Unlock()

		if planPlayback.state == nil || len(planPlayback.state.ResolvedSteps) == 0 {
			http.Error(w, "no plan trajectory loaded", http.StatusConflict)
			return
		}

		var req planStepRequest
		if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
			http.Error(w, "invalid step request", http.StatusBadRequest)
			return
		}

		nextStep := planPlayback.state.CurrentStepIdx
		if req.Step != nil {
			nextStep = *req.Step
		} else {
			switch req.Direction {
			case "next":
				nextStep++
			case "prev":
				nextStep--
			default:
				http.Error(w, "direction must be 'next' or 'prev'", http.StatusBadRequest)
				return
			}
		}

		if nextStep < 0 {
			nextStep = 0
		}
		if nextStep >= len(planPlayback.state.ResolvedSteps) {
			nextStep = len(planPlayback.state.ResolvedSteps) - 1
		}

		// Re-render via in-place upsert (no RemoveAll). Transform UUIDs are
		// deterministic SHA-1 over "name:parent", so re-issuing AddEntity for
		// the same frames updates the existing entities and emits UPDATED
		// events on the entity stream. This avoids the remove+re-add burst
		// that previously caused subscribers to drop events and made obstacles
		// flicker or disappear between steps.
		if _, err := renderFrameSystem(
			r.Context(),
			svc,
			planPlayback.state.FrameSystem,
			planPlayback.state.ResolvedSteps[nextStep],
			planPlayback.state.Prefix,
		); err != nil {
			http.Error(w, fmt.Sprintf("failed to render step: %v", err), http.StatusInternalServerError)
			return
		}

		planPlayback.state.CurrentStepIdx = nextStep

		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(planStepResponse{
			CurrentStep: nextStep,
			TotalSteps:  len(planPlayback.state.ResolvedSteps),
		})
	}
}

func resolveTrajectorySteps(start referenceframe.FrameSystemInputs, trajectory []referenceframe.FrameSystemInputs) []referenceframe.FrameSystemInputs {
	if len(trajectory) == 0 {
		return nil
	}

	carry := cloneFrameSystemInputs(start)
	steps := make([]referenceframe.FrameSystemInputs, 0, len(trajectory))
	for _, step := range trajectory {
		for component, values := range step {
			if len(values) > 0 {
				carry[component] = append([]referenceframe.Input(nil), values...)
				continue
			}
			if _, ok := carry[component]; !ok {
				carry[component] = []referenceframe.Input{}
			}
		}
		steps = append(steps, cloneFrameSystemInputs(carry))
	}

	return steps
}

func cloneFrameSystemInputs(inputs referenceframe.FrameSystemInputs) referenceframe.FrameSystemInputs {
	if inputs == nil {
		return referenceframe.FrameSystemInputs{}
	}
	cloned := make(referenceframe.FrameSystemInputs, len(inputs))
	for component, values := range inputs {
		cloned[component] = append([]referenceframe.Input(nil), values...)
	}
	return cloned
}

func mergeFrameSystemInputs(base, overlay referenceframe.FrameSystemInputs) referenceframe.FrameSystemInputs {
	merged := cloneFrameSystemInputs(base)
	for component, values := range overlay {
		merged[component] = append([]referenceframe.Input(nil), values...)
	}
	return merged
}

// prefixedRef returns prefix+ref, leaving empty strings and "world" untouched
// so plans still attach to the shared world root.
func prefixedRef(prefix, ref string) string {
	if prefix == "" || ref == "" || ref == "world" {
		return ref
	}
	return prefix + ref
}

func applyTransformPrefix(t *commonv1.Transform, prefix string) {
	if prefix == "" || t == nil {
		return
	}
	t.ReferenceFrame = prefixedRef(prefix, t.ReferenceFrame)
	if t.PoseInObserverFrame != nil {
		t.PoseInObserverFrame.ReferenceFrame = prefixedRef(prefix, t.PoseInObserverFrame.ReferenceFrame)
	}
}

func applyDrawingPrefix(d *drawv1.Drawing, prefix string) {
	if prefix == "" || d == nil {
		return
	}
	d.ReferenceFrame = prefixedRef(prefix, d.ReferenceFrame)
	if d.PoseInObserverFrame != nil {
		d.PoseInObserverFrame.ReferenceFrame = prefixedRef(prefix, d.PoseInObserverFrame.ReferenceFrame)
	}
}

// addTransforms applies prefix to each transform and pushes it to the draw
// service, collecting the resulting UUIDs. If stopOnError is true the first
// AddEntity error aborts the loop and is returned; otherwise errors are
// silently skipped (best-effort).
func addTransforms(ctx context.Context, svc drawv1connect.DrawServiceHandler, transforms []*commonv1.Transform, prefix string, stopOnError bool) ([][]byte, error) {
	uuids := make([][]byte, 0, len(transforms))
	for _, t := range transforms {
		applyTransformPrefix(t, prefix)
		resp, err := svc.AddEntity(ctx, connect.NewRequest(&drawv1.AddEntityRequest{
			Entity: &drawv1.AddEntityRequest_Transform{Transform: t},
		}))
		if err != nil {
			if stopOnError {
				return uuids, err
			}
			continue
		}
		if resp != nil && resp.Msg != nil && len(resp.Msg.Uuid) > 0 {
			uuids = append(uuids, resp.Msg.Uuid)
		}
	}
	return uuids, nil
}

func renderFrameSystem(ctx context.Context, svc drawv1connect.DrawServiceHandler, fs *referenceframe.FrameSystem, inputs referenceframe.FrameSystemInputs, prefix string) ([][]byte, error) {
	// Seed the world frame so every uncolored robot-link frame inherits the
	// debug color via getFrameColor's parent walk.
	frameColors := map[string]draw.Color{"world": debugColor}
	for _, frameName := range fs.FrameNames() {
		if strings.HasPrefix(frameName, "obstacle-") {
			frameColors[frameName] = obstacleColor
		}
	}

	transforms, err := draw.NewDrawnFrameSystem(fs, inputs, draw.WithFrameSystemColors(frameColors)).ToTransforms()
	if err != nil {
		return nil, err
	}
	return addTransforms(ctx, svc, transforms, prefix, true)
}

func renderWorldState(ctx context.Context, svc drawv1connect.DrawServiceHandler, ws *referenceframe.WorldState, fs *referenceframe.FrameSystem, inputs referenceframe.FrameSystemInputs, prefix string) [][]byte {
	geoms, err := ws.ObstaclesInWorldFrame(fs, inputs)
	if err != nil || len(geoms.Geometries()) == 0 {
		return nil
	}
	colors := make([]draw.Color, len(geoms.Geometries()))
	for i := range colors {
		colors[i] = obstacleColor
	}
	drawnGeoms, err := draw.NewDrawnGeometriesInFrame(geoms, draw.WithPerGeometriesColors(colors...))
	if err != nil {
		return nil
	}
	transforms, err := drawnGeoms.ToTransforms()
	if err != nil {
		return nil
	}
	uuids, _ := addTransforms(ctx, svc, transforms, prefix, false)
	return uuids
}

func collectGoalPoses(goals []planGoalBody) []spatialmath.Pose {
	var poses []spatialmath.Pose
	for _, goal := range goals {
		for _, pif := range goal.Poses {
			p := pif.Pose
			ov := &spatialmath.OrientationVectorDegrees{
				Theta: p.Theta,
				OX:    p.OX,
				OY:    p.OY,
				OZ:    p.OZ,
			}
			poses = append(poses, spatialmath.NewPose(r3.Vector{X: p.X, Y: p.Y, Z: p.Z}, ov))
		}
	}
	return poses
}

func renderGoalPoses(ctx context.Context, svc drawv1connect.DrawServiceHandler, poses []spatialmath.Pose, prefix string) [][]byte {
	goalColor := draw.ColorFromRGB(0, 255, 65)
	uuids := make([][]byte, 0, len(poses))
	// One drawing per goal keeps each drawing's bounding box tight around its
	// arrow rather than spanning from world origin to a distant arrow location.
	for i, pose := range poses {
		arrows, err := draw.NewArrows(
			[]spatialmath.Pose{spatialmath.NewZeroPose()},
			draw.WithSingleArrowColor(goalColor),
		)
		if err != nil {
			continue
		}
		name := "goal"
		if len(poses) > 1 {
			name = fmt.Sprintf("goal_%d", i)
		}
		drawing := arrows.Draw(name, draw.WithPose(pose))
		drawingProto := drawing.ToProto()
		applyDrawingPrefix(drawingProto, prefix)
		resp, err := svc.AddEntity(ctx, connect.NewRequest(&drawv1.AddEntityRequest{
			Entity: &drawv1.AddEntityRequest_Drawing{Drawing: drawingProto},
		}))
		if err == nil && resp != nil && resp.Msg != nil && len(resp.Msg.Uuid) > 0 {
			uuids = append(uuids, resp.Msg.Uuid)
		}
	}
	return uuids
}
