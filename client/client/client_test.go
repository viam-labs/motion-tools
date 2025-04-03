package client

import (
	"testing"

	"github.com/viam-labs/motion-tools/client/shapes"

	"github.com/golang/geo/r3"
	"go.viam.com/rdk/logging"
	"go.viam.com/rdk/pointcloud"
	"go.viam.com/rdk/spatialmath"
	"go.viam.com/test"
)

func TestDrawGeometry(t *testing.T) {
	t.Run("draw box", func(t *testing.T) {
		box, err := spatialmath.NewBox(
			spatialmath.NewPose(
				r3.Vector{X: 1001, Y: 1, Z: 1},
				&spatialmath.OrientationVectorDegrees{Theta: 45, OX: 0, OY: 0, OZ: 1},
			),
			r3.Vector{X: 101, Y: 100, Z: 200},
			"myBox",
		)
		test.That(t, err, test.ShouldBeNil)
		test.That(t, DrawGeometry(box, "purple"), test.ShouldBeNil)
	})
	t.Run("draw sphere", func(t *testing.T) {
		box, err := spatialmath.NewSphere(
			spatialmath.NewPose(
				r3.Vector{X: 1, Y: 1000, Z: 0},
				&spatialmath.OrientationVectorDegrees{Theta: 0, OX: 0, OY: 0, OZ: 1},
			),
			100,
			"mySphere",
		)
		test.That(t, err, test.ShouldBeNil)
		test.That(t, DrawGeometry(box, "red"), test.ShouldBeNil)
	})
	t.Run("draw capsule", func(t *testing.T) {
		capsule, err := spatialmath.NewCapsule(
			spatialmath.NewPose(
				r3.Vector{X: -1002, Y: 3, Z: 0},
				&spatialmath.OrientationVectorDegrees{Theta: 90, OX: 1, OY: 0, OZ: 1},
			),
			102,
			300,
			"myCapsule",
		)
		test.That(t, err, test.ShouldBeNil)
		test.That(t, DrawGeometry(capsule, "orange"), test.ShouldBeNil)
	})

	t.Run("draw mesh", func(t *testing.T) {
		mesh, err := spatialmath.NewMeshFromPLYFile("../data/lod_500.ply")
		pose := spatialmath.NewPose(
			r3.Vector{X: -343.34, Y: -139.51, Z: 537.44},
			&spatialmath.OrientationVectorDegrees{Theta: 90, OX: -0.9943171068536344, OY: -0.0046240014351797976, OZ: -0.10635840177882347},
		)
		mesh.Transform(pose)

		test.That(t, err, test.ShouldBeNil)
		test.That(t, DrawGeometry(mesh, "blue"), test.ShouldBeNil)
	})
}

func TestDrawPointCloud(t *testing.T) {
	pc, err := pointcloud.NewFromFile("../data/octagon.pcd", logging.Global())
	test.That(t, err, test.ShouldBeNil)
	test.That(t, DrawPointCloud(pc), test.ShouldBeNil)
}

func TestDrawPoses(t *testing.T) {

	p0 := spatialmath.NewPose(
		r3.Vector{X: 700, Y: 0, Z: 0},
		&spatialmath.OrientationVectorDegrees{
			OX: 0, OY: 0, OZ: 1, Theta: 0,
		},
	)

	p1 := spatialmath.NewPose(
		r3.Vector{X: 700, Y: 10, Z: 0},
		&spatialmath.OrientationVectorDegrees{
			OX: 0, OY: 0.1, OZ: 0.9, Theta: 0,
		},
	)

	p2 := spatialmath.NewPose(
		r3.Vector{X: 700, Y: 20, Z: 0},
		&spatialmath.OrientationVectorDegrees{
			OX: 0, OY: 0.2, OZ: 0.8, Theta: 0,
		},
	)

	p3 := spatialmath.NewPose(
		r3.Vector{X: 700, Y: 30, Z: 0},
		&spatialmath.OrientationVectorDegrees{
			OX: 0, OY: 0.3, OZ: 0.7, Theta: 0,
		},
	)

	p4 := spatialmath.NewPose(
		r3.Vector{X: 700, Y: 40, Z: 0},
		&spatialmath.OrientationVectorDegrees{
			OX: 0, OY: 0.4, OZ: 0.6, Theta: 0,
		},
	)

	p5 := spatialmath.NewPose(
		r3.Vector{X: 700, Y: 50, Z: 0},
		&spatialmath.OrientationVectorDegrees{
			OX: 0, OY: 0.5, OZ: 0.5, Theta: 0,
		},
	)

	poses := []spatialmath.Pose{p0, p1, p2, p3, p4, p5}
	colors := []string{"#EF9A9A", "#EF5350", "#F44336", "#E53935", "#D32F2F", "#C62828"}

	test.That(t, DrawPoses(poses, colors, true), test.ShouldBeNil)
}

func TestDrawNurbs(t *testing.T) {
	nurbs := shapes.GenerateNURBS(20, 3)

	test.That(t, DrawNurbs(nurbs, "#40E0D0", "nurbs-1"), test.ShouldBeNil)
}
