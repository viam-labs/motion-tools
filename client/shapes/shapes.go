package shapes

import (
	"math/rand"

	"github.com/golang/geo/r3"
	"go.viam.com/rdk/spatialmath"
)

type Nurbs struct {
	ControlPts []spatialmath.Pose
	Degree     int
	Weights    []float64
	Knots      []float64
}

// Generate a NURBS structure similar to the Three.js version
func GenerateNURBS(numControlPoints int, degree int) Nurbs {
	controlPts := make([]spatialmath.Pose, numControlPoints)
	weights := make([]float64, numControlPoints)
	knots := make([]float64, numControlPoints+degree+1)

	// Initialize knots (first "degree" values as 0)
	for i := 0; i <= degree; i++ {
		knots[i] = 0
	}

	// Generate control points and remaining knots
	for i := 0; i < numControlPoints; i++ {

		controlPts[i] = spatialmath.NewPose(
			r3.Vector{
				X: rand.Float64()*400 - 200, // Random X in range [-200, 200]
				Y: rand.Float64() * 400,     // Random Y in range [0, 400]
				Z: rand.Float64()*400 - 200, // Random Z in range [-200, 200]
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

// Clamp function (similar to THREE.MathUtils.clamp)
func clamp(value, min, max float64) float64 {
	if value < min {
		return min
	}
	if value > max {
		return max
	}
	return value
}
