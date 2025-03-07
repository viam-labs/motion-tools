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
		box, err := spatialmath.NewBox(spatialmath.NewPose(r3.Vector{500, 0, 0}, &spatialmath.OrientationVectorDegrees{45, 0, 0, 1}), r3.Vector{100, 100, 200}, "myBox")
		test.That(t, err, test.ShouldBeNil)
		test.That(t, DrawGeometry(box), test.ShouldBeNil)
	})
	t.Run("draw sphere", func(t *testing.T) {
		box, err := spatialmath.NewSphere(spatialmath.NewPose(r3.Vector{0, 500, 0}, &spatialmath.OrientationVectorDegrees{0, 0, 0, 1}), 100, "mySphere")
		test.That(t, err, test.ShouldBeNil)
		test.That(t, DrawGeometry(box), test.ShouldBeNil)
	})
	t.Run("draw capsule", func(t *testing.T) {
		capsule, err := spatialmath.NewCapsule(spatialmath.NewPose(r3.Vector{-500, 0, 0}, &spatialmath.OrientationVectorDegrees{90, 0, 0, 1}), 100, 300, "myCapsule")
		test.That(t, err, test.ShouldBeNil)
		test.That(t, DrawGeometry(capsule), test.ShouldBeNil)
	})
}

func TestDrawPointCloud(t *testing.T) {
	pc, err := pointcloud.NewFromFile("data/octagon.pcd", logging.Global())
	test.That(t, err, test.ShouldBeNil)
	test.That(t, DrawPointCloud(pc), test.ShouldBeNil)
}
