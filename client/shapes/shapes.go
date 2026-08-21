// Package shapes provides NURBS sample data for the legacy v1 drawing client.
//
// Deprecated: shapes is part of the deprecated client/client v1 API and will be
// removed in a future release. Its types have no v2 equivalent; use the drawing
// functions in [github.com/viam-labs/motion-tools/client/api] instead. When v2 ships,
// the client/api and draw packages move to a new module path,
// github.com/viamrobotics/visualization. See the v1 → v2 migration guide:
// https://viamrobotics.github.io/visualization/migration/v1-to-v2/
package shapes

import (
	"math/rand"

	"github.com/golang/geo/r3"
	"go.viam.com/rdk/spatialmath"
)

// Nurbs describes a NURBS curve for the legacy v1 drawing client.
//
// Deprecated: the Nurbs wrapper is no longer needed in v2. Pass ControlPoints, Knots,
// Weights, and Degree directly to
// [github.com/viam-labs/motion-tools/client/api.DrawNurbs]. See the v1 → v2 migration
// guide: https://viamrobotics.github.io/visualization/migration/v1-to-v2/
type Nurbs struct {
	ControlPts []spatialmath.Pose
	Degree     int
	Weights    []float64
	Knots      []float64
}

// GenerateNURBS builds a NURBS curve matching the Three.js sample data.
//
// Deprecated: shapes is part of the deprecated v1 API and has no v2 equivalent. Build
// NURBS inputs directly and pass them to
// [github.com/viam-labs/motion-tools/client/api.DrawNurbs]. See the v1 → v2 migration
// guide: https://viamrobotics.github.io/visualization/migration/v1-to-v2/
func GenerateNURBS(numControlPoints int, degree int, offset r3.Vector) Nurbs {
	controlPts := make([]spatialmath.Pose, numControlPoints)
	weights := make([]float64, numControlPoints)
	knots := make([]float64, numControlPoints+degree+1)

	// Initialize knots (first "degree" values as 0)
	for i := 0; i <= degree; i++ {
		knots[i] = 0
	}

	for i := 0; i < numControlPoints; i++ {

		controlPts[i] = spatialmath.NewPose(
			r3.Vector{
				X: rand.Float64()*400 - 200 + offset.X,
				Y: rand.Float64()*400 + offset.Y,
				Z: rand.Float64()*400 - 200 + offset.Z,
			},
			&spatialmath.OrientationVectorDegrees{Theta: 0, OX: 0, OY: 0, OZ: 1},
		)
		weights[i] = 1 // Default weight as in Three.js

		knot := float64(i+1) / float64(numControlPoints-degree)
		knots[i+degree+1] = clamp(knot, 0, 1)
	}

	return Nurbs{
		ControlPts: controlPts,
		Degree:     degree,
		Weights:    weights,
		Knots:      knots,
	}
}

// clamp constrains value to the range [min, max], matching THREE.MathUtils.clamp.
func clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}
