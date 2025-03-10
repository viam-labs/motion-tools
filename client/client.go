package client

import (
	"bytes"
	"fmt"
	"net/http"

	"go.viam.com/rdk/pointcloud"
	"go.viam.com/rdk/spatialmath"
	"google.golang.org/protobuf/encoding/protojson"
)

const url = "http://localhost:3000/"

func DrawGeometry(geometry spatialmath.Geometry) error {
	data, err := protojson.Marshal(geometry.ToProtobuf())
	if err != nil {
		return err
	}
	return postHTTP(data, "json", "shape")
}

func DrawPointCloud(pc pointcloud.PointCloud) error {
	var buf bytes.Buffer
	if err := pointcloud.ToPCD(pc, &buf, pointcloud.PCDBinary); err != nil {
		return err
	}
	return postHTTP(buf.Bytes(), "octet-stream", "pcd")
}

func postHTTP(data []byte, content string, endpoint string) error {
	fmt.Println(len(data))
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
