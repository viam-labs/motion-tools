package client

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/viam-labs/motion-tools/client/shapes"

	"go.viam.com/rdk/pointcloud"
	"go.viam.com/rdk/spatialmath"
	"google.golang.org/protobuf/encoding/protojson"
)

const url = "http://localhost:3000/"

func DrawGeometry(geometry spatialmath.Geometry, color string) error {
	data, err := protojson.Marshal(geometry.ToProtobuf())
	if err != nil {
		return err
	}

	wrappedData := map[string]interface{}{
		"geometry": json.RawMessage(data),
		"color":    color,
	}

	finalJSON, err := json.Marshal(wrappedData)
	if err != nil {
		return err
	}

	return postHTTP(finalJSON, "json", "geometry")
}

func DrawPointCloud(pc pointcloud.PointCloud) error {
	var buf bytes.Buffer
	if err := pointcloud.ToPCD(pc, &buf, pointcloud.PCDBinary); err != nil {
		return err
	}

	return postHTTP(buf.Bytes(), "octet-stream", "pcd")
}

func DrawPoses(poses []spatialmath.Pose, colors []string, arrowHeadAtPose bool) error {
	poseData := make([]json.RawMessage, len(poses))
	for i, pose := range poses {
		data, err := json.Marshal(spatialmath.PoseToProtobuf(pose))
		if err != nil {
			return err
		}
		poseData[i] = json.RawMessage(data)
	}

	wrappedData := map[string]interface{}{
		"poses":           poseData,
		"colors":          colors,
		"arrowHeadAtPose": arrowHeadAtPose,
	}

	finalJSON, err := json.Marshal(wrappedData)
	if err != nil {
		return err
	}

	return postHTTP(finalJSON, "json", "poses")
}

func DrawNurbs(nurbs shapes.Nurbs, color string, name string) error {
	poseData := make([]json.RawMessage, len(nurbs.ControlPts))
	for i, pose := range nurbs.ControlPts {
		data, err := json.Marshal(spatialmath.PoseToProtobuf(pose))
		if err != nil {
			return err
		}
		poseData[i] = json.RawMessage(data)
	}

	wrappedData := map[string]interface{}{
		"ControlPts": poseData,
		"Degree":     nurbs.Degree,
		"Weights":    nurbs.Weights,
		"Knots":      nurbs.Knots,
		"Color":      color,
		"name":       name,
	}

	finalJSON, err := json.Marshal(wrappedData)
	if err != nil {
		return err
	}

	return postHTTP(finalJSON, "json", "nurbs")
}

func RemoveAllSpatialObjects() error {
	data := map[string]interface{}{}

	json, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return postHTTP(json, "json", "remove-all")
}

func postHTTP(data []byte, content string, endpoint string) error {
	resp, err := http.Post(url+endpoint, "application/"+content, bytes.NewReader(data))

	if err != nil {
		return err
	}

	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("HTTP post unsuccessful: %s", resp.Status)
	}
	return nil
}
