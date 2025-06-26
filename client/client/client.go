package client

import (
	"bytes"
	"context"
	"encoding/binary"
	"encoding/hex"
	"encoding/json"
	"errors"
	"strings"

	"fmt"
	"net/http"

	"os"

	"github.com/golang/geo/r3"
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

func HexToRGB(hexStr string) ([3]uint8, error) {
	var rgb [3]uint8

	hexStr = strings.TrimPrefix(hexStr, "#")
	if len(hexStr) != 6 {
		return rgb, errors.New("invalid hex color string")
	}

	bytes, err := hex.DecodeString(hexStr)
	if err != nil || len(bytes) != 3 {
		return rgb, err
	}

	copy(rgb[:], bytes)
	return rgb, nil
}

func DrawGeometry(geometry spatialmath.Geometry, color string) error {
	data, err := protojson.Marshal(geometry.ToProtobuf())
	if err != nil {
		return err
	}

	finalJSON, err := json.Marshal(map[string]interface{}{
		"geometry": json.RawMessage(data),
		"color":    color,
	})
	if err != nil {
		return err
	}

	return postHTTP(finalJSON, "json", "geometry")
}

func DrawGeometries(geometriesInFrame *referenceframe.GeometriesInFrame, colors []string) error {
	geometries := make([]json.RawMessage, len(geometriesInFrame.Geometries()))

	for i, geo := range geometriesInFrame.Geometries() {
		data, err := protojson.Marshal(geo.ToProtobuf())
		if err != nil {
			return err
		}
		geometries[i] = json.RawMessage(data)
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

func DrawPoints(
	label string,
	points []r3.Vector,
	colors [][3]uint8,
	defaultColor [3]uint8,
) error {
	labelBytes := []byte(label)
	labelLen := len(labelBytes)

	nPoints := len(points)
	nColors := len(colors)

	// total floats:
	// 1 (label length) + labelLen + 2 (nPoints, nColors) + 3 (default color)
	// + 3*nPoints (positions) + 3*nColors (colors)
	total := 1 + labelLen + 2 + 3 + nPoints*3 + nColors*3
	data := make([]float32, 0, total)

	data = append(data, float32(labelLen))
	for _, b := range labelBytes {
		data = append(data, float32(b))
	}

	data = append(data,
		float32(nPoints),
		float32(nColors),
		float32(defaultColor[0])/255.0,
		float32(defaultColor[1])/255.0,
		float32(defaultColor[2])/255.0,
	)

	for _, pt := range points {
		data = append(data,
			float32(pt.X)/1000,
			float32(pt.Y)/1000,
			float32(pt.Z)/1000,
		)
	}

	for _, c := range colors {
		data = append(data,
			float32(c[0])/255.0,
			float32(c[1])/255.0,
			float32(c[2])/255.0,
		)
	}

	buf := new(bytes.Buffer)
	if err := binary.Write(buf, binary.LittleEndian, data); err != nil {
		return err
	}

	return postHTTP(buf.Bytes(), "octet-stream", "points")
}

func DrawPointCloud(pc pointcloud.PointCloud) error {
	var buf bytes.Buffer

	if err := pointcloud.ToPCD(pc, &buf, pointcloud.PCDBinary); err != nil {
		return err
	}

	return postHTTP(buf.Bytes(), "octet-stream", "pcd")
}

func DrawPoses(poses []spatialmath.Pose, colors []string, arrowHeadAtPose bool) error {
	nPoses := len(poses)
	nColors := len(colors)
	total := 3 + nPoses*6 + nColors*3

	data := make([]float32, 0, total)

	a := 0.
	if arrowHeadAtPose {
		a = 1.
	}

	// Header
	data = append(data, float32(nPoses), float32(nColors), float32(a))

	for _, pose := range poses {
		point := pose.Point()
		orientation := pose.Orientation().OrientationVectorDegrees()
		data = append(data,
			float32(point.X),
			float32(point.Y),
			float32(point.Z),
			float32(orientation.OX),
			float32(orientation.OY),
			float32(orientation.OZ))
	}

	for _, c := range colors {
		rgb, err := HexToRGB(c)
		if err != nil {
			return err
		}
		data = append(data,
			float32(rgb[0])/255.0,
			float32(rgb[1])/255.0,
			float32(rgb[2])/255.0,
		)
	}

	buf := new(bytes.Buffer)
	err := binary.Write(buf, binary.LittleEndian, data)
	if err != nil {
		return err
	}

	return postHTTP(buf.Bytes(), "octet-stream", "poses")
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
