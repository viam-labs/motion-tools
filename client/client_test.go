package client

import (
	"testing"

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
		test.That(t, DrawGeometry(box), test.ShouldBeNil)
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
		test.That(t, DrawGeometry(box), test.ShouldBeNil)
	})
	t.Run("draw capsule", func(t *testing.T) {
		capsule, err := spatialmath.NewCapsule(
			spatialmath.NewPose(
				r3.Vector{X: -1002, Y: 3, Z: 0},
				&spatialmath.OrientationVectorDegrees{Theta: 90, OX: 1, OY: 0, OZ: 1},
			),
			102,
			301,
			"myCapsule",
		)
		test.That(t, err, test.ShouldBeNil)
		test.That(t, DrawGeometry(capsule), test.ShouldBeNil)
	})

	t.Run("draw mesh", func(t *testing.T) {
		mesh, err := spatialmath.NewMeshFromPLYFile("data/lod_100.ply")
		test.That(t, err, test.ShouldBeNil)
		test.That(t, DrawGeometry(mesh), test.ShouldBeNil)
	})
}

func TestDrawPointCloud(t *testing.T) {
	pc, err := pointcloud.NewFromFile("data/octagon.pcd", logging.Global())
	test.That(t, err, test.ShouldBeNil)
	test.That(t, DrawPointCloud(pc), test.ShouldBeNil)
}
