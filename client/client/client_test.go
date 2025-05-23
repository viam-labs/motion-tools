package client

import (
	"testing"

	"github.com/viam-labs/motion-tools/client/shapes"

	"math"
	"time"

	"github.com/golang/geo/r3"
	"go.viam.com/rdk/logging"
	"go.viam.com/rdk/pointcloud"
	"go.viam.com/rdk/referenceframe"
	"go.viam.com/rdk/spatialmath"
	"go.viam.com/test"
)

func TestDrawGeometries(t *testing.T) {
	t.Run("draw box", func(t *testing.T) {
		box, err := spatialmath.NewBox(
			spatialmath.NewPose(
				r3.Vector{X: 1001, Y: 1, Z: 1},
				&spatialmath.OrientationVectorDegrees{Theta: 45, OX: 0, OY: 0, OZ: 1},
			),
			r3.Vector{X: 101, Y: 100, Z: 200},
			"myBox2",
		)
		test.That(t, err, test.ShouldBeNil)

		sphere, err := spatialmath.NewSphere(
			spatialmath.NewPose(
				r3.Vector{X: 1, Y: 1000, Z: 0},
				&spatialmath.OrientationVectorDegrees{Theta: 0, OX: 0, OY: 0, OZ: 1},
			),
			100,
			"mySphere2",
		)
		test.That(t, err, test.ShouldBeNil)

		capsule, err := spatialmath.NewCapsule(
			spatialmath.NewPose(
				r3.Vector{X: -1002, Y: 3, Z: 0},
				&spatialmath.OrientationVectorDegrees{Theta: 90, OX: 1, OY: 0, OZ: 1},
			),
			102,
			300,
			"myCapsule2",
		)
		test.That(t, err, test.ShouldBeNil)

		mesh, err := spatialmath.NewMeshFromPLYFile("../data/lod_500.ply")
		pose := spatialmath.NewPose(
			r3.Vector{X: -343.34, Y: -139.51, Z: 537.44},
			&spatialmath.OrientationVectorDegrees{Theta: 90, OX: -0.9943171068536344, OY: -0.0046240014351797976, OZ: -0.10635840177882347},
		)
		mesh.Transform(pose)

		test.That(t, err, test.ShouldBeNil)

		geometries := []spatialmath.Geometry{box, sphere, capsule, mesh}
		geometriesInFrame := referenceframe.NewGeometriesInFrame("myBox", geometries)

		colors := []string{"#EF9A9A", "#EF5350", "#F44336", "#E53935", "#D32F2F", "#C62828"}

		test.That(t, DrawGeometries(geometriesInFrame, colors), test.ShouldBeNil)
	})
}

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

func TestDrawGLTF(t *testing.T) {
	test.That(t, DrawGLTF("../data/flamingo.glb"), test.ShouldBeNil)
	// test.That(t, DrawGLTF("../data/coffeemat.glb"), test.ShouldBeNil)
}

func TestDrawPointCloud(t *testing.T) {
	pc, err := pointcloud.NewFromFile("../data/octagon.pcd", logging.Global())
	test.That(t, err, test.ShouldBeNil)
	test.That(t, DrawPointCloud(pc), test.ShouldBeNil)
}

func TestDrawPoses(t *testing.T) {
	const (
		numPoints = 5000
		radius    = 1000.0
	)

	// Define the center of the sphere
	centerX := 1500.0
	centerY := 1500.0
	centerZ := -300.0

	var poses []spatialmath.Pose
	var colors []string
	pallet := []string{"#EF9A9A", "#EF5350", "#F44336", "#E53935", "#D32F2F", "#C62828"}

	for i := 0; i < numPoints; i++ {
		phi := math.Acos(1 - 2*float64(i)/float64(numPoints))
		theta := math.Pi * (1 + math.Sqrt(5)) * float64(i)

		x := radius * math.Sin(phi) * math.Cos(theta)
		y := radius * math.Sin(phi) * math.Sin(theta)
		z := radius * math.Cos(phi)

		// Apply offset to shift the sphere center
		x += centerX
		y += centerY
		z += centerZ

		// Orientation: point back toward the center
		dx := centerX - x
		dy := centerY - y
		dz := centerZ - z

		length := math.Sqrt(dx*dx + dy*dy + dz*dz)

		pose := spatialmath.NewPose(
			r3.Vector{X: x, Y: y, Z: z},
			&spatialmath.OrientationVectorDegrees{
				OX:    dx / length,
				OY:    dy / length,
				OZ:    dz / length,
				Theta: 0,
			},
		)

		poses = append(poses, pose)
		colors = append(colors, pallet[i%len(pallet)])
	}

	test.That(t, DrawPoses(poses, colors, true), test.ShouldBeNil)

	box, err := spatialmath.NewSphere(
		spatialmath.NewPose(
			r3.Vector{X: centerX, Y: centerY, Z: centerZ},
			&spatialmath.OrientationVectorDegrees{Theta: 0, OX: 0, OY: 0, OZ: 1},
		),
		radius,
		"mySpherePose",
	)
	test.That(t, err, test.ShouldBeNil)
	test.That(t, DrawGeometry(box, "turquoise"), test.ShouldBeNil)
}

func TestDrawNurbs(t *testing.T) {
	nurbs := shapes.GenerateNURBS(20, 3)

	test.That(t, DrawNurbs(nurbs, "#40E0D0", "nurbs-1"), test.ShouldBeNil)
}

func TestDrawFrameSystem(t *testing.T) {
	fs := referenceframe.NewEmptyFrameSystem("test")
	dims := r3.Vector{X: 100, Y: 100, Z: 100}

	// add a static frame with a box
	name0 := "frame0"
	box0, err := spatialmath.NewBox(spatialmath.NewZeroPose(), dims, name0)
	test.That(t, err, test.ShouldBeNil)
	frame0, err := referenceframe.NewStaticFrameWithGeometry(name0, spatialmath.NewZeroPose(), box0)
	test.That(t, err, test.ShouldBeNil)
	fs.AddFrame(frame0, fs.World())

	// add an arm model to the fs
	armName := "arm1"
	model, err := referenceframe.ParseModelJSONFile("../data/ur5e.json", armName)
	test.That(t, err, test.ShouldBeNil)
	fs.AddFrame(model, fs.World())

	// add a static frame as a child of the model
	name2 := "frame1"
	box2, err := spatialmath.NewBox(spatialmath.NewZeroPose(), dims, name2)
	test.That(t, err, test.ShouldBeNil)
	blockFrame, err := referenceframe.NewStaticFrameWithGeometry(name2, spatialmath.NewZeroPose(), box2)
	test.That(t, err, test.ShouldBeNil)
	fs.AddFrame(blockFrame, model)

	// draw the frame system
	inputs := referenceframe.NewZeroInputs(fs)
	test.That(t, DrawFrameSystem(fs, inputs), test.ShouldBeNil)
	inputs[armName] = referenceframe.FloatsToInputs([]float64{1, 1, 1, 1, 1, 1})
	test.That(t, DrawFrameSystem(fs, inputs), test.ShouldBeNil)
}

func TestDrawWorldState(t *testing.T) {
	dims := r3.Vector{X: 100, Y: 100, Z: 100}

	// make a super simple frame system
	fs := referenceframe.NewEmptyFrameSystem("test")
	frameName := "frame0"
	frame0, err := referenceframe.NewStaticFrame(frameName, spatialmath.NewPoseFromPoint(r3.Vector{Z: 300}))
	test.That(t, err, test.ShouldBeNil)
	fs.AddFrame(frame0, fs.World())

	// make some boxes
	box0, err := spatialmath.NewBox(spatialmath.NewZeroPose(), dims, "box0")
	test.That(t, err, test.ShouldBeNil)
	box1, err := spatialmath.NewBox(spatialmath.NewPoseFromPoint(r3.Vector{X: 300}), dims, "box1")
	test.That(t, err, test.ShouldBeNil)
	box2, err := spatialmath.NewBox(spatialmath.NewPoseFromPoint(r3.Vector{Z: 300}), dims, "box2")
	test.That(t, err, test.ShouldBeNil)

	// make the worldstate and draw it
	ws, err := referenceframe.NewWorldState([]*referenceframe.GeometriesInFrame{
		referenceframe.NewGeometriesInFrame(frameName, []spatialmath.Geometry{box0, box1}),
		referenceframe.NewGeometriesInFrame(referenceframe.World, []spatialmath.Geometry{box2}),
	}, nil)
	test.That(t, err, test.ShouldBeNil)
	test.That(t, DrawWorldState(ws, fs, referenceframe.NewZeroInputs(fs)), test.ShouldBeNil)
}

func TestRemoveSpatialObjects(t *testing.T) {
	t.Run("draw box", func(t *testing.T) {
		box, err := spatialmath.NewBox(
			spatialmath.NewPose(
				r3.Vector{X: 2000, Y: 2000, Z: 100},
				&spatialmath.OrientationVectorDegrees{Theta: 45, OX: 0, OY: 0, OZ: 1},
			),
			r3.Vector{X: 101, Y: 100, Z: 200},
			"box2delete",
		)
		test.That(t, err, test.ShouldBeNil)
		test.That(t, DrawGeometry(box, "black"), test.ShouldBeNil)

		time.Sleep(1 * time.Second)

		toDelete := []string{"box2delete"}
		test.That(t, RemoveSpatialObjects(toDelete), test.ShouldBeNil)
	})
}
