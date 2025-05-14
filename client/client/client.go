package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"os"

	"github.com/viam-labs/motion-tools/client/shapes"
	"google.golang.org/protobuf/encoding/protojson"

	"go.viam.com/rdk/pointcloud"
	"go.viam.com/rdk/referenceframe"
	"go.viam.com/rdk/robot"
	"go.viam.com/rdk/spatialmath"

	"github.com/viam-labs/motion-tools/mutils"
)

const DEFAULT_URL = "http://localhost:3000/"

// DefaultColorMap is a list of sensible colors to cycle between
// this is also the "Set1" colormap in Matplotlib
var DefaultColorMap = []string{"#E41A1C", "#377EB8", "#4DAF4A", "#984EA3", "#FF7F00", "#FFFF33", "#A65628", "#F781BF", "#999999"}

type colorChooser struct {
	count int
}

func (cc *colorChooser) next() string {
	c := DefaultColorMap[cc.count%len(DefaultColorMap)]
	cc.count++
	return c
}

var (
	url = DEFAULT_URL
)

func SetURL(preferredURL string) {
	url = preferredURL
}

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

func DrawGeometries(geometries *referenceframe.GeometriesInFrame, colors []string) error {
	geoData := make([]json.RawMessage, len(geometries.Geometries()))

	for i, geo := range geometries.Geometries() {
		data, err := protojson.Marshal(geo.ToProtobuf())
		if err != nil {
			return err
		}
		geoData[i] = json.RawMessage(data)
	}

	wrappedData := map[string]interface{}{
		"geometries": geoData,
		"colors":     colors,
		"parent":     geometries.Parent(),
	}

	finalJSON, err := json.Marshal(wrappedData)
	if err != nil {
		return err
	}

	return postHTTP(finalJSON, "json", "geometries")
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
		data, err := protojson.Marshal(spatialmath.PoseToProtobuf(pose))
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
		data, err := protojson.Marshal(spatialmath.PoseToProtobuf(pose))
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

func RemoveSpatialObjects(names []string) error {
	json, err := json.Marshal(names)

	if err != nil {
		return err
	}

	return postHTTP(json, "json", "remove")
}

func RemoveAllSpatialObjects() error {
	data := map[string]interface{}{}

	json, err := json.Marshal(data)
	if err != nil {
		return err
	}

	return postHTTP(json, "json", "remove-all")
}

func DrawGLTF(filePath string) error {
	file, err := os.Open(filePath)
	if err != nil {
		return err
	}
	defer file.Close()

	fileInfo, err := file.Stat()
	if err != nil {
		return err
	}

	req, err := http.NewRequest("POST", url+"gltf", file)
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "model/gltf-binary")
	req.ContentLength = fileInfo.Size()

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		return fmt.Errorf("HTTP post unsuccessful: %s", resp.Status)
	}

	return nil
}

func DrawFrameSystem(fs referenceframe.FrameSystem, inputs referenceframe.FrameSystemInputs) error {
	frameGeomMap, err := referenceframe.FrameSystemGeometries(fs, inputs)
	if err != nil {
		return err
	}
	i := 0
	for _, geoms := range frameGeomMap {
		geometries := geoms.Geometries()
		colors := make([]string, len(geometries))
		for j := range geometries {
			colors[j] = DefaultColorMap[i%len(DefaultColorMap)]
		}
		if err = DrawGeometries(geoms, colors); err != nil {
			return err
		}
		i++
	}
	return nil
}

func DrawWorldState(ws *referenceframe.WorldState, fs referenceframe.FrameSystem, inputs referenceframe.FrameSystemInputs) error {
	geoms, err := ws.ObstaclesInWorldFrame(fs, inputs)
	if err != nil {
		return err
	}

	geometries := geoms.Geometries()
	cc := &colorChooser{}
	colors := make([]string, len(geometries))
	for i := range geometries {
		colors[i] = cc.next()
	}

	if err = DrawGeometries(geoms, colors); err != nil {
		return err
	}

	return nil
}

// ws can be empty
func DrawRobot(ctx context.Context, myRobot robot.Robot, ws *referenceframe.WorldState) error {
	fsCfg, err := myRobot.FrameSystemConfig(ctx)
	if err != nil {
		return err
	}

	rf, err := referenceframe.NewFrameSystem("foo", fsCfg.Parts, fsCfg.AdditionalTransforms)
	if err != nil {
		return err
	}

	inputs, err := mutils.GetInputs(ctx, rf, myRobot)
	if err != nil {
		return err
	}

	if ws != nil {
		err = DrawWorldState(ws, rf, inputs)
		if err != nil {
			return err
		}

		for _, lif := range ws.Transforms() {
			err = DrawGeometries(referenceframe.NewGeometriesInFrame(
				lif.Parent(),
				[]spatialmath.Geometry{lif.Geometry()},
			), DefaultColorMap)
			if err != nil {
				return err
			}
		}

	}

	gifs, err := referenceframe.FrameSystemGeometries(rf, inputs)
	if err != nil {
		return nil
	}
	for _, gif := range gifs {
		err = DrawGeometries(gif, DefaultColorMap)
		if err != nil {
			return nil
		}
	}

	return nil
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
