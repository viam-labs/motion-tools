package client

import (
	"encoding/json"
	"log"

	"github.com/golang/geo/r3"
	"google.golang.org/protobuf/encoding/protojson"

	"go.viam.com/rdk/pointcloud"
	"go.viam.com/rdk/referenceframe"
	"go.viam.com/rdk/spatialmath"
)

// DrawGeometries draws a list of geometries in the visualizer.
//
// Labels must be unique within a world. Calling DrawGeometries with labels that
// already exist will instead update the pose of that geometry. Only poses can be updated,
// geometries must be cleared if their shape is to change.
//
// Deprecated: use [github.com/viam-labs/motion-tools/client/api.DrawGeometriesInFrame]
// instead. See the v1 → v2 migration guide:
// https://viamrobotics.github.io/visualization/migration/v1-to-v2/
func DrawGeometries(geometriesInFrame *referenceframe.GeometriesInFrame, colors []string) error {
	var geometries []json.RawMessage

	numPointclouds := 0

	for _, geo := range geometriesInFrame.Geometries() {
		pc, isPc := geo.(pointcloud.PointCloud)
		if isPc {
			// Point clouds arrive here in bulk from DrawWorldState and DrawFrameSystem, which
			// pass every geometry through in one call, so the downscale happens here rather
			// than in each caller. The factor is fixed at 25 for real-world experiment
			// performance and is not tunable per call site.
			downscaled, err := drawPointCloudDownscaled(geo.Label(), pc, 25)
			if err != nil {
				return err
			}

			if err := DrawPointCloud(geo.Label(), downscaled, &[3]uint8{200, 0, 0}); err != nil {
				return err
			}

			numPointclouds += 1
			continue
		}

		// A Cylinder has no wire representation (its ToProtobuf panics by design);
		// tessellate it to a mesh, which the renderer draws as a model.
		if cyl, ok := geo.(*spatialmath.Cylinder); ok {
			geo = cyl.ToMesh()
		}

		pb := geo.ToProtobuf()
		if pb == nil {
			log.Printf("DrawGeometries: geometry %q has nil protobuf, skipping", geo.Label())
			continue
		}

		data, err := protojson.Marshal(pb)
		if err != nil {
			return err
		}

		geometries = append(geometries, json.RawMessage(data))
	}

	if len(geometries) == 0 {
		if numPointclouds == 0 {
			log.Printf("DrawGeometries: no valid geometries to draw.")
		}

		return nil
	}

	result, err := json.Marshal(map[string]interface{}{
		"geometries": geometries,
		"colors":     colors,
		"parent":     geometriesInFrame.Parent(),
	})

	if err != nil {
		return err
	}

	return postHTTP(result, "json", "geometries")
}

func drawPointCloudDownscaled(label string, pc pointcloud.PointCloud, minDistance float64) (pointcloud.PointCloud, error) {
	labelError := isASCIIPrintable(label)
	if labelError != nil {
		return nil, labelError
	}

	addedPoints := make([]struct {
		point r3.Vector
		data  pointcloud.Data
	}, 0)
	pc.Iterate(0, 0, func(p r3.Vector, d pointcloud.Data) bool {
		for idx := range addedPoints {
			// There is no spatial index for these distance lookups, so the scan is O(n^2). At
			// a minDistance of 25 distance units this takes about 20 seconds and keeps about
			// 8000 points. At 50 it takes about 7 seconds and keeps about 2000. Distances
			// between 2 and 10 would be prohibitively slow.
			if addedPoints[idx].point.Distance(p) < minDistance {
				// Too close to a point already added, so move on to the next candidate.
				// Measured input for tuning an index: a 3.5 million point cloud over about
				// 1 square meter, 56MB of HTTP payload, with neighbors as close as 1
				// distance unit.
				return true
			}
		}
		addedPoints = append(addedPoints, struct {
			point r3.Vector
			data  pointcloud.Data
		}{p, d})
		return true
	})

	downscaled := pointcloud.NewBasicPointCloud(len(addedPoints))
	for _, point := range addedPoints {
		downscaled.Set(point.point, point.data)
	}

	return downscaled, nil
}
