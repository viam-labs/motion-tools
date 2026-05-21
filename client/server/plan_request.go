package server

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"connectrpc.com/connect"
	"github.com/golang/geo/r3"
	"github.com/viam-labs/motion-tools/draw"
	drawv1 "github.com/viam-labs/motion-tools/draw/v1"
	"github.com/viam-labs/motion-tools/draw/v1/drawv1connect"
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

// rawFrameSystem mirrors the on-wire JSON of a referenceframe.FrameSystem so
// we can manipulate individual frame entries before full deserialisation.
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

// planStateBody mirrors the JSON shape of armplanning.PlanState.
// FrameSystemInputs is map[string][]float64 (Input = float64), so plain float
// arrays in JSON decode directly.
type planStateBody struct {
	Configuration referenceframe.FrameSystemInputs `json:"configuration"`
}

// planGoalBody mirrors the JSON shape of armplanning.PlanState when used as a goal.
type planGoalBody struct {
	Poses map[string]planPoseInFrameBody `json:"poses"`
}

// planPoseInFrameBody holds the referenceFrame + pose for a single goal entry.
type planPoseInFrameBody struct {
	Pose planPoseBody `json:"pose"`
}

// planPoseBody holds the Viam pose fields (mm + orientation-vector-degrees).
type planPoseBody struct {
	X     float64 `json:"x"`
	Y     float64 `json:"y"`
	Z     float64 `json:"z"`
	OX    float64 `json:"oX"`
	OY    float64 `json:"oY"`
	OZ    float64 `json:"oZ"`
	Theta float64 `json:"theta"`
}

// planRequestResponse is returned to the HTTP caller with a summary.
type planRequestResponse struct {
	ComponentNames []string `json:"component_names"`
	GoalCount      int      `json:"goal_count"`
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

		// Cap body at 32 MiB to guard against excessively large uploads.
		body, err := io.ReadAll(io.LimitReader(r.Body, 32<<20))
		if err != nil {
			http.Error(w, "failed to read body", http.StatusBadRequest)
			return
		}

		var req planRequestBody
		if err := json.Unmarshal(body, &req); err != nil {
			http.Error(w, fmt.Sprintf("invalid plan request JSON: %v", err), http.StatusUnprocessableEntity)
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

		// Clear the current scene before rendering.
		if _, err := svc.RemoveAll(ctx, connect.NewRequest(&drawv1.RemoveAllRequest{})); err != nil {
			http.Error(w, fmt.Sprintf("failed to clear scene: %v", err), http.StatusInternalServerError)
			return
		}

		// Build FrameSystemInputs from the start state's joint positions.
		var inputs referenceframe.FrameSystemInputs
		if req.StartState != nil && req.StartState.Configuration != nil {
			inputs = req.StartState.Configuration
		}

		// Render the frame system at the start configuration.
		if err := renderFrameSystem(ctx, svc, &fs, inputs); err != nil {
			http.Error(w, fmt.Sprintf("failed to render frame system: %v", err), http.StatusInternalServerError)
			return
		}

		// Render world-state obstacles (best-effort; errors are silently ignored
		// so that a missing or empty world state does not fail the whole request).
		if req.WorldState != nil {
			renderWorldState(ctx, svc, req.WorldState, &fs, inputs)
		}

		// Collect and render goal poses as arrows.
		goalPoses := collectGoalPoses(req.Goals)
		if len(goalPoses) > 0 {
			renderGoalPoses(ctx, svc, goalPoses)
		}

		// Return a summary to the frontend.
		names := fs.FrameNames()
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(planRequestResponse{
			ComponentNames: names,
			GoalCount:      len(goalPoses),
		})
	}
}

func renderFrameSystem(ctx context.Context, svc drawv1connect.DrawServiceHandler, fs *referenceframe.FrameSystem, inputs referenceframe.FrameSystemInputs) error {
	drawnFS := draw.NewDrawnFrameSystem(fs, inputs)
	transforms, err := drawnFS.ToTransforms()
	if err != nil {
		return err
	}
	for _, t := range transforms {
		if _, err := svc.AddEntity(ctx, connect.NewRequest(&drawv1.AddEntityRequest{
			Entity: &drawv1.AddEntityRequest_Transform{Transform: t},
		})); err != nil {
			return err
		}
	}
	return nil
}

func renderWorldState(ctx context.Context, svc drawv1connect.DrawServiceHandler, ws *referenceframe.WorldState, fs *referenceframe.FrameSystem, inputs referenceframe.FrameSystemInputs) {
	geoms, err := ws.ObstaclesInWorldFrame(fs, inputs)
	if err != nil || len(geoms.Geometries()) == 0 {
		return
	}
	colors := draw.ChromaticColorChooser.Get(len(geoms.Geometries()))
	drawnGeoms, err := draw.NewDrawnGeometriesInFrame(geoms, draw.WithPerGeometriesColors(colors...))
	if err != nil {
		return
	}
	obstacleTransforms, err := drawnGeoms.ToTransforms()
	if err != nil {
		return
	}
	for _, t := range obstacleTransforms {
		_, _ = svc.AddEntity(ctx, connect.NewRequest(&drawv1.AddEntityRequest{
			Entity: &drawv1.AddEntityRequest_Transform{Transform: t},
		}))
	}
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

func renderGoalPoses(ctx context.Context, svc drawv1connect.DrawServiceHandler, poses []spatialmath.Pose) {
	// Bright magenta for high contrast against the grid and frame system.
	goalColor := draw.NewColor(draw.WithRGB(255, 0, 200))
	// Create one drawing per goal so each drawing's bounding box is tight
	// around the arrow itself, rather than spanning from world origin to a
	// distant arrow location.
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
		_, _ = svc.AddEntity(ctx, connect.NewRequest(&drawv1.AddEntityRequest{
			Entity: &drawv1.AddEntityRequest_Drawing{Drawing: drawing.ToProto()},
		}))
	}
}
